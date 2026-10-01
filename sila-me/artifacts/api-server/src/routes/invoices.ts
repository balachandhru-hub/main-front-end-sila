import { createHash } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  documentFilesTable,
  documentProcessingStatusTable,
  documentsTable,
  invoiceHeadersTable,
  invoiceLineItemsTable,
  invoiceOcrExtractionsTable,
  userSharePointLinksTable,
} from "@workspace/db";
import { effectiveMobileConfiguration } from "../lib/mobile-config";
import { resolveAuthContext, type AuthContext } from "../lib/auth-context";
import { recordAuditEvent } from "../lib/audit";
import { SharePointError, uploadToSharePoint } from "../lib/sharepoint";
import { requireAuth, requirePermission, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();
const MAX_UPLOAD_BYTES = Number(process.env.INVOICE_MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

type ScopeSelection = {
  customerId: number;
  propertyId: number;
  storeId: number;
};

type InvoiceBody = {
  propertyId?: string;
  storeId?: string;
};

function errorResponse(response: Response, status: number, error: string, message: string): void {
  response.status(status).json({ error, message });
}

function parsePositiveId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveScope(context: AuthContext, body: InvoiceBody): ScopeSelection | null {
  const requestedPropertyId = parsePositiveId(body.propertyId);
  const requestedStoreId = parsePositiveId(body.storeId);
  if (body.propertyId !== undefined && requestedPropertyId === undefined) return null;
  if (body.storeId !== undefined && requestedStoreId === undefined) return null;

  const propertyId =
    requestedPropertyId ??
    (context.propertyIds.length === 1 ? context.propertyIds[0] : undefined);
  const storeId =
    requestedStoreId ?? (context.storeIds.length === 1 ? context.storeIds[0] : undefined);
  if (!propertyId || !storeId) return null;

  const property = context.properties.find((candidate) => candidate.id === propertyId);
  const store = context.stores.find((candidate) => candidate.id === storeId);
  if (!property || !store || store.propertyId !== property.id) return null;
  return { customerId: context.customers[0].id, propertyId, storeId };
}

async function authorizeInvoiceRequest(
  request: AuthenticatedRequest,
  response: Response,
  body: InvoiceBody,
): Promise<{ context: AuthContext; scope: ScopeSelection } | null> {
  if (!request.currentUser) {
    errorResponse(response, 401, "AUTHENTICATION_REQUIRED", "Authentication is required or has expired.");
    return null;
  }
  const context = await resolveAuthContext(request.currentUser);
  if (context.customers.length !== 1) {
    errorResponse(response, 403, "CUSTOMER_SCOPE_REQUIRED", "A single active customer scope is required.");
    return null;
  }
  if (!context.permissions.includes("SCAN_DOCUMENT")) {
    await recordAuditEvent("ACCESS_DENIED", {
      actorUserId: request.currentUser.id,
      metadata: { path: request.path, requiredPermissions: ["SCAN_DOCUMENT"] },
    });
    errorResponse(response, 403, "ACCESS_DENIED", "You do not have permission to scan documents.");
    return null;
  }
  const scope = resolveScope(context, body);
  if (!scope) {
    errorResponse(
      response,
      403,
      "ACCESS_DENIED",
      "A valid property and store within your authorized scope are required.",
    );
    return null;
  }
  const configuration = await effectiveMobileConfiguration({
    ...context,
    propertyIds: [scope.propertyId],
    storeIds: [scope.storeId],
  });
  if (!configuration?.scanDocument) {
    await recordAuditEvent("ACCESS_DENIED", {
      actorUserId: request.currentUser.id,
      metadata: {
        path: request.path,
        reason: "SCAN_DOCUMENT_DISABLED",
        customerId: scope.customerId,
        propertyId: scope.propertyId,
        storeId: scope.storeId,
      },
    });
    errorResponse(
      response,
      403,
      "FEATURE_DISABLED",
      "Invoice scanning is not enabled for this customer, property, or store.",
    );
    return null;
  }
  request.authContext = context;
  return { context, scope };
}

function uploadMiddleware(request: Request, response: Response, next: NextFunction): void {
  upload.single("file")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      errorResponse(response, 413, "FILE_TOO_LARGE", `Invoice files must be ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller.`);
      return;
    }
    errorResponse(response, 400, "INVALID_UPLOAD", "The invoice upload could not be read.");
  });
}

function generatedFileName(documentId: number): string {
  return `SILA-INV-${Date.now()}-${documentId}.pdf`;
}

async function invoiceForUser(
  request: AuthenticatedRequest,
  invoiceId: number,
): Promise<{ context: AuthContext; header: typeof invoiceHeadersTable.$inferSelect } | null> {
  if (!request.currentUser) return null;
  const context = await resolveAuthContext(request.currentUser);
  const [header] = await db
    .select()
    .from(invoiceHeadersTable)
    .where(eq(invoiceHeadersTable.id, invoiceId))
    .limit(1);
  if (
    !header ||
    !context.customers.some((customer) => customer.id === header.customerId) ||
    (header.propertyId !== null && !context.propertyIds.includes(header.propertyId)) ||
    (header.storeId !== null && !context.storeIds.includes(header.storeId))
  ) {
    return null;
  }
  return { context, header };
}

router.post(
  "/documents/invoices",
  requireAuth,
  uploadMiddleware,
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const file = request.file;
    const body = request.body as InvoiceBody;
    const authorized = await authorizeInvoiceRequest(request, response, body);
    if (!authorized) return;
    if (!file) {
      errorResponse(response, 400, "FILE_REQUIRED", "Attach one invoice PDF or image in the file field.");
      return;
    }
    if (!allowedMimeTypes.has(file.mimetype)) {
      errorResponse(response, 415, "UNSUPPORTED_FILE_TYPE", "Only PDF, JPEG, and PNG invoice files are supported.");
      return;
    }
    if (file.size === 0) {
      errorResponse(response, 400, "EMPTY_FILE", "The invoice file is empty.");
      return;
    }

    const idempotencyKey =
      request.header("Idempotency-Key")?.trim() ||
      (typeof request.body?.idempotencyKey === "string" ? request.body.idempotencyKey.trim() : "");
    if (!idempotencyKey || idempotencyKey.length > 200) {
      errorResponse(response, 400, "IDEMPOTENCY_KEY_REQUIRED", "Provide a stable Idempotency-Key for the upload.");
      return;
    }

    const { context, scope } = authorized;
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const [existing] = await db
      .select({ document: documentsTable, header: invoiceHeadersTable })
      .from(documentsTable)
      .leftJoin(invoiceHeadersTable, eq(invoiceHeadersTable.documentId, documentsTable.id))
      .where(
        and(
          eq(documentsTable.customerId, scope.customerId),
          eq(documentsTable.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (existing?.document) {
      response.status(200).json({
        documentId: existing.document.id,
        invoiceId: existing.header?.id ?? null,
        uploadStatus: existing.document.uploadStatus,
        processingStatus: existing.document.processingStatus,
        sharePointStored: existing.document.uploadStatus === "UPLOADED",
        nextAction: existing.document.processingStatus === "REVIEW_REQUIRED" ? "REVIEW" : "RETRY_OR_REFRESH",
      });
      return;
    }

    const [link] = await db
      .select()
      .from(userSharePointLinksTable)
      .where(eq(userSharePointLinksTable.userId, request.currentUser!.id))
      .limit(1);
    if (!link) {
      errorResponse(response, 422, "SHAREPOINT_CONFIGURATION_MISSING", "No SharePoint folder is configured for this user.");
      return;
    }

    const created = await db.transaction(async (transaction) => {
      const [document] = await transaction
        .insert(documentsTable)
        .values({
          customerId: scope.customerId,
          propertyId: scope.propertyId,
          storeId: scope.storeId,
          documentType: "INVOICE",
          status: "Draft",
          uploadStatus: "PENDING_UPLOAD",
          processingStatus: "PENDING",
          idempotencyKey,
          checksum,
          sourceApplication: "SILA_STORE",
          createdBy: request.currentUser!.id,
        })
        .returning();
      const [header] = await transaction
        .insert(invoiceHeadersTable)
        .values({
          customerId: scope.customerId,
          propertyId: scope.propertyId,
          storeId: scope.storeId,
          documentId: document.id,
          invoiceNumber: `PENDING-${document.id}`,
          ocrStatus: "Pending",
          validationStatus: "Pending",
        })
        .returning();
      await transaction.insert(documentFilesTable).values({
        documentId: document.id,
        storageReference: `sharepoint://pending/${document.id}`,
        storageProvider: "SHAREPOINT",
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        checksum,
      });
      await transaction.insert(documentProcessingStatusTable).values({
        documentId: document.id,
        processor: "INVOICE_OCR",
        status: "PENDING",
      });
      return { document, header };
    });

    await recordAuditEvent("DOCUMENT_CAPTURED", {
      actorUserId: request.currentUser!.id,
      metadata: { documentId: created.document.id, customerId: scope.customerId, propertyId: scope.propertyId, storeId: scope.storeId },
    });
    await recordAuditEvent("DOCUMENT_UPLOAD_STARTED", {
      actorUserId: request.currentUser!.id,
      metadata: { documentId: created.document.id },
    });

    const stableFileName = generatedFileName(created.document.id);
    try {
      const uploaded = await uploadToSharePoint(
        link.siteUrl,
        link.folderPath,
        stableFileName,
        file.mimetype,
        file.buffer,
      );
       await db
         .update(documentsTable)
         .set({ uploadStatus: "UPLOADED", processingStatus: "REVIEW_REQUIRED", status: "Review Required" })
        .where(eq(documentsTable.id, created.document.id));
       await db
         .update(invoiceHeadersTable)
         .set({ ocrStatus: "MOBILE_EXTRACTION", validationStatus: "REVIEW_REQUIRED" })
         .where(eq(invoiceHeadersTable.id, created.header.id));
       await db
         .update(documentProcessingStatusTable)
         .set({ status: "MOBILE_EXTRACTION", processedAt: new Date() })
         .where(
           and(
             eq(documentProcessingStatusTable.documentId, created.document.id),
             eq(documentProcessingStatusTable.processor, "INVOICE_OCR"),
           ),
         );
      await db
        .update(documentFilesTable)
        .set({
          storageReference: `sharepoint://${uploaded.itemId}`,
          sharePointSiteId: uploaded.siteId,
          sharePointDriveId: uploaded.driveId,
          sharePointItemId: uploaded.itemId,
          sharePointPath: uploaded.path,
          sharePointWebUrl: uploaded.webUrl,
          uploadedAt: new Date(),
        })
        .where(eq(documentFilesTable.documentId, created.document.id));
      await recordAuditEvent("DOCUMENT_UPLOADED", {
        actorUserId: request.currentUser!.id,
        metadata: { documentId: created.document.id, sharePointItemId: uploaded.itemId, sharePointPath: uploaded.path },
      });
      response.status(201).json({
        documentId: created.document.id,
        invoiceId: created.header.id,
        uploadStatus: "UPLOADED",
         processingStatus: "REVIEW_REQUIRED",
        sharePointStored: true,
         nextAction: "REVIEW",
      });
    } catch (error) {
      const code = error instanceof SharePointError ? error.code : "SHAREPOINT_UPLOAD_FAILED";
      const message = error instanceof Error ? error.message : "The SharePoint upload failed.";
      await db
        .update(documentsTable)
        .set({ uploadStatus: "UPLOAD_FAILED", processingStatus: "PENDING", status: "Draft" })
        .where(eq(documentsTable.id, created.document.id));
      await db
        .update(documentProcessingStatusTable)
        .set({ status: "PENDING", errorMessage: message })
        .where(
          and(
            eq(documentProcessingStatusTable.documentId, created.document.id),
            eq(documentProcessingStatusTable.processor, "INVOICE_OCR"),
          ),
        );
      await recordAuditEvent("DOCUMENT_UPLOAD_FAILED", {
        actorUserId: request.currentUser!.id,
        metadata: { documentId: created.document.id, errorCode: code },
      });
      errorResponse(response, error instanceof SharePointError ? Math.min(error.status, 502) : 502, code, message);
    }
  },
);

router.get(
  "/invoices/history",
  requireAuth,
  requirePermission("SCAN_DOCUMENT"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const context = await resolveAuthContext(request.currentUser!);
    const customerIds = context.customers.map((customer) => customer.id);
    if (customerIds.length === 0) {
      response.json({ records: [] });
      return;
    }
    const rows = await db
      .select({ header: invoiceHeadersTable, document: documentsTable })
      .from(invoiceHeadersTable)
      .innerJoin(documentsTable, eq(documentsTable.id, invoiceHeadersTable.documentId))
      .where(inArray(invoiceHeadersTable.customerId, customerIds))
      .orderBy(desc(invoiceHeadersTable.createdAt))
      .limit(100);
    response.json({
      records: rows
        .filter(
          ({ header }) =>
            (header.propertyId === null || context.propertyIds.includes(header.propertyId)) &&
            (header.storeId === null || context.storeIds.includes(header.storeId)),
        )
        .map(({ header, document }) => ({
          invoiceId: header.id,
          documentId: document.id,
          supplier: header.supplierNameExtracted,
          invoiceNumber: header.invoiceNumber,
          invoiceDate: header.invoiceDate,
          grossAmount: header.grossAmount,
          status: document.processingStatus,
          uploadStatus: document.uploadStatus,
          uploadedAt: document.updatedAt,
        })),
    });
  },
);

router.get(
  "/invoices/:invoiceId",
  requireAuth,
  requirePermission("SCAN_DOCUMENT"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const invoiceId = parsePositiveId(request.params.invoiceId);
    if (!invoiceId) {
      errorResponse(response, 400, "INVALID_INVOICE_ID", "Invoice ID must be a positive integer.");
      return;
    }
    const owned = await invoiceForUser(request, invoiceId);
    if (!owned) {
      errorResponse(response, 404, "NOT_FOUND", "Invoice not found.");
      return;
    }
    const [lines, extraction] = await Promise.all([
      db.select().from(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.invoiceHeaderId, invoiceId)).orderBy(invoiceLineItemsTable.lineNumber),
      db.select().from(invoiceOcrExtractionsTable).where(eq(invoiceOcrExtractionsTable.invoiceHeaderId, invoiceId)).orderBy(desc(invoiceOcrExtractionsTable.createdAt)).limit(1),
    ]);
    response.json({ header: owned.header, lines, extraction: extraction[0] ?? null });
  },
);

router.put(
  "/invoices/:invoiceId/review",
  requireAuth,
  requirePermission("SCAN_DOCUMENT"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const invoiceId = parsePositiveId(request.params.invoiceId);
    if (!invoiceId) {
      errorResponse(response, 400, "INVALID_INVOICE_ID", "Invoice ID must be a positive integer.");
      return;
    }
    const owned = await invoiceForUser(request, invoiceId);
    if (!owned) {
      errorResponse(response, 404, "NOT_FOUND", "Invoice not found.");
      return;
    }
    const body = request.body as Record<string, unknown>;
    const headerValues = {
      supplierNameExtracted: typeof body.supplierName === "string" ? body.supplierName : undefined,
      invoiceNumber: typeof body.invoiceNumber === "string" ? body.invoiceNumber : undefined,
      invoiceDate: typeof body.invoiceDate === "string" ? body.invoiceDate : undefined,
      poReference: typeof body.poNumber === "string" ? body.poNumber : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      netAmount: typeof body.netAmount === "string" ? body.netAmount : undefined,
      taxAmount: typeof body.taxAmount === "string" ? body.taxAmount : undefined,
      grossAmount: typeof body.grossAmount === "string" ? body.grossAmount : undefined,
      validationStatus: "REVIEW_REQUIRED",
    };
    const lines = Array.isArray(body.lines) ? body.lines : [];
    await db.transaction(async (transaction) => {
      await transaction
        .update(invoiceHeadersTable)
        .set(headerValues)
        .where(eq(invoiceHeadersTable.id, invoiceId));
      await transaction.delete(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.invoiceHeaderId, invoiceId));
      if (lines.length > 0) {
        await transaction.insert(invoiceLineItemsTable).values(
          lines.map((line, index) => {
            const value = (line ?? {}) as Record<string, unknown>;
            return {
              invoiceHeaderId: invoiceId,
              lineNumber: Number(value.lineNumber) || index + 1,
              description: typeof value.description === "string" ? value.description : null,
              supplierMaterialCode: typeof value.supplierMaterialCode === "string" ? value.supplierMaterialCode : null,
              quantity: typeof value.quantity === "string" ? value.quantity : null,
              uom: typeof value.uom === "string" ? value.uom : null,
              unitPrice: typeof value.unitPrice === "string" ? value.unitPrice : null,
              taxCode: typeof value.taxCode === "string" ? value.taxCode : null,
              taxRate: typeof value.taxRate === "string" ? value.taxRate : null,
              netAmount: typeof value.netAmount === "string" ? value.netAmount : null,
              taxAmount: typeof value.taxAmount === "string" ? value.taxAmount : null,
              grossAmount: typeof value.grossAmount === "string" ? value.grossAmount : null,
            };
          }),
        );
      }
      await transaction
        .update(documentsTable)
        .set({ processingStatus: "REVIEW_REQUIRED", status: "Review Required" })
        .where(eq(documentsTable.id, owned.header.documentId!));
    });
    await recordAuditEvent("INVOICE_CORRECTED", {
      actorUserId: request.currentUser!.id,
      metadata: { invoiceId, documentId: owned.header.documentId },
    });
    response.json({ invoiceId, processingStatus: "REVIEW_REQUIRED", validationStatus: "REVIEW_REQUIRED" });
  },
);

router.post(
  "/invoices/:invoiceId/confirm",
  requireAuth,
  requirePermission("SCAN_DOCUMENT"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const invoiceId = parsePositiveId(request.params.invoiceId);
    if (!invoiceId) {
      errorResponse(response, 400, "INVALID_INVOICE_ID", "Invoice ID must be a positive integer.");
      return;
    }
    const owned = await invoiceForUser(request, invoiceId);
    if (!owned) {
      errorResponse(response, 404, "NOT_FOUND", "Invoice not found.");
      return;
    }
    if (owned.header.validationStatus !== "REVIEW_REQUIRED") {
      errorResponse(
        response,
        409,
        "REVIEW_REQUIRED",
        "Invoice must be reviewed before it can be confirmed.",
      );
      return;
    }
    const confirmedAt = new Date();
    await db.transaction(async (transaction) => {
      await transaction
        .update(invoiceHeadersTable)
        .set({
          validationStatus: "CONFIRMED",
          confirmedBy: request.currentUser!.id,
          confirmedAt,
        })
        .where(eq(invoiceHeadersTable.id, invoiceId));
      await transaction
        .update(documentsTable)
        .set({ processingStatus: "COMPLETED", status: "Completed" })
        .where(eq(documentsTable.id, owned.header.documentId!));
    });
    await recordAuditEvent("INVOICE_CONFIRMED", {
      actorUserId: request.currentUser!.id,
      metadata: { invoiceId, documentId: owned.header.documentId },
    });
    response.json({ invoiceId, processingStatus: "COMPLETED", validationStatus: "CONFIRMED", confirmedAt });
  },
);

export default router;