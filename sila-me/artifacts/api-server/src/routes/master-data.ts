import { Router, type IRouter } from "express";
import {
  ConfirmMaterialBody,
  CreateMaterialBody,
  CreateSupplierBody,
  UpdateMaterialBody,
  UpdateSupplierBody,
  UpsertSupplierMaterialMappingBody,
  UpdateSupplierMaterialMappingBody,
} from "@workspace/api-zod";
import { recordAuditEvent } from "../lib/audit";
import {
  materialProvider,
  MasterDataConflictError,
  MasterDataNotFoundError,
  supplierProvider,
  type NewMaterial,
  type NewMaterialAlias,
  type NewMaterialBarcode,
  type NewMaterialUomConversion,
  type NewSupplier,
  type NewSupplierAlias,
  type NewSupplierMaterialMapping,
} from "../lib/master-data";
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from "../middlewares/auth";

const router: IRouter = Router();

function scope(request: AuthenticatedRequest) {
  return { customerIds: request.authContext?.customers.map((customer) => customer.id) ?? [] };
}

function numberQuery(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

type RelationParseResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

function parseRelationBody<T>(
  body: unknown,
  requiredStrings: string[],
  optionalStrings: string[] = [],
  optionalBooleans: string[] = [],
  nullableStrings: string[] = [],
): RelationParseResult<T> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { success: false, message: "Request body must be an object." };
  }
  const record = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of requiredStrings) {
    if (typeof record[key] !== "string" || record[key].trim().length === 0) {
      return { success: false, message: `${key} must be a non-empty string.` };
    }
    data[key] = record[key];
  }
  for (const key of optionalStrings) {
    if (record[key] !== undefined && typeof record[key] !== "string") {
      return { success: false, message: `${key} must be a string.` };
    }
    if (record[key] !== undefined) data[key] = record[key];
  }
  for (const key of nullableStrings) {
    if (record[key] !== undefined && record[key] !== null && typeof record[key] !== "string") {
      return { success: false, message: `${key} must be a string or null.` };
    }
    if (record[key] !== undefined) data[key] = record[key];
  }
  for (const key of optionalBooleans) {
    if (record[key] !== undefined && typeof record[key] !== "boolean") {
      return { success: false, message: `${key} must be a boolean.` };
    }
    if (record[key] !== undefined) data[key] = record[key];
  }
  return { success: true, data: data as T };
}

function sendMasterDataError(error: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }): void {
  if (error instanceof MasterDataNotFoundError) {
    response.status(404).json({ error: "NOT_FOUND", message: error.message });
  } else if (error instanceof MasterDataConflictError) {
    response.status(409).json({ error: "CONFLICT", message: error.message });
  } else {
    response.status(500).json({ error: "INTERNAL_ERROR", message: "Could not complete the master-data request." });
  }
}

router.get(
  "/materials/search",
  requireAuth,
  requirePermission("VIEW_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const results = await materialProvider.search({
      ...scope(request),
      query: typeof request.query.q === "string" ? request.query.q : undefined,
      barcode: typeof request.query.barcode === "string" ? request.query.barcode : undefined,
      plantCode: typeof request.query.plantCode === "string" ? request.query.plantCode : undefined,
      limit: numberQuery(request.query.limit, 50),
      offset: numberQuery(request.query.offset, 0),
    });
    response.json({ items: results, count: results.length });
  },
);

router.get(
  "/materials/by-code/:code",
  requireAuth,
  requirePermission("VIEW_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      const result = await materialProvider.getByCode(
        String(request.params.code),
        scope(request),
        typeof request.query.plantCode === "string" ? request.query.plantCode : undefined,
      );
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.get(
  "/materials/recognize",
  requireAuth,
  requirePermission("VIEW_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const clues: Record<string, unknown> = {};
    for (const key of ["barcode", "materialCode", "supplierMaterialCode", "description", "alias", "brand", "category"]) {
      if (typeof request.query[key] === "string") clues[key] = request.query[key];
    }
    const result = await materialProvider.recognize(clues, scope(request));
    response.json({ ...result, recognized: result.candidates.length === 1 ? result.candidates[0] : null });
  },
);

router.post(
  "/materials/confirm",
  requireAuth,
  requirePermission("VIEW_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = ConfirmMaterialBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await materialProvider.confirm(
        parsed.data.materialId,
        scope(request),
        request.authContext!.userId,
        parsed.data.clues ?? {},
      );
      await recordAuditEvent("MATERIAL_CONFIRMED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, customerId: result.customerId },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.get(
  "/materials/:id",
  requireAuth,
  requirePermission("VIEW_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      const result = await materialProvider.getById(Number(request.params.id), scope(request));
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/materials",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = CreateMaterialBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await materialProvider.create(parsed.data as NewMaterial, scope(request));
      await recordAuditEvent("MATERIAL_CREATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, customerId: result.customerId },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.put(
  "/admin/materials/:id",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = UpdateMaterialBody.partial().safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await materialProvider.update(
        Number(request.params.id),
        parsed.data as Partial<NewMaterial>,
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, customerId: result.customerId },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/materials/:materialId/aliases",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = parseRelationBody<NewMaterialAlias>(
      request.body,
      ["alias", "aliasType"],
      [],
      ["active"],
    );
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.message });
      return;
    }
    try {
      const result = await materialProvider.createAlias(
        Number(request.params.materialId),
        parsed.data as NewMaterialAlias,
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, relation: "alias", action: "created" },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.delete(
  "/admin/materials/:materialId/aliases/:aliasId",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      const result = await materialProvider.deleteAlias(
        Number(request.params.materialId),
        Number(request.params.aliasId),
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, relation: "alias", action: "deleted" },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/materials/:materialId/barcodes",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = parseRelationBody<NewMaterialBarcode>(
      request.body,
      ["barcode"],
      [],
      ["isPrimary", "active"],
      ["barcodeType"],
    );
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.message });
      return;
    }
    try {
      const result = await materialProvider.createBarcode(
        Number(request.params.materialId),
        parsed.data as NewMaterialBarcode,
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, relation: "barcode", action: "created" },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.delete(
  "/admin/materials/:materialId/barcodes/:barcodeId",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      const result = await materialProvider.deleteBarcode(
        Number(request.params.materialId),
        Number(request.params.barcodeId),
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, relation: "barcode", action: "deleted" },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/materials/:materialId/uom-conversions",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = parseRelationBody<NewMaterialUomConversion>(
      request.body,
      ["fromUom", "toUom", "conversionFactor"],
      ["sourceSystem"],
      ["active"],
    );
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.message });
      return;
    }
    try {
      const result = await materialProvider.createUomConversion(
        Number(request.params.materialId),
        parsed.data as NewMaterialUomConversion,
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, relation: "uom_conversion", action: "upserted" },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.delete(
  "/admin/materials/:materialId/uom-conversions/:conversionId",
  requireAuth,
  requirePermission("MANAGE_MATERIALS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      const result = await materialProvider.deleteUomConversion(
        Number(request.params.materialId),
        Number(request.params.conversionId),
        scope(request),
      );
      await recordAuditEvent("MATERIAL_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { materialId: result.id, relation: "uom_conversion", action: "deleted" },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.get(
  "/suppliers/search",
  requireAuth,
  requirePermission("VIEW_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const results = await supplierProvider.search({
      ...scope(request),
      query: typeof request.query.q === "string" ? request.query.q : undefined,
      limit: numberQuery(request.query.limit, 50),
      offset: numberQuery(request.query.offset, 0),
    });
    response.json({ items: results, count: results.length });
  },
);

router.get(
  "/suppliers/by-code/:code",
  requireAuth,
  requirePermission("VIEW_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      response.json(await supplierProvider.getByCode(String(request.params.code), scope(request)));
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.get(
  "/suppliers/:id",
  requireAuth,
  requirePermission("VIEW_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      response.json(await supplierProvider.getById(Number(request.params.id), scope(request)));
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/suppliers",
  requireAuth,
  requirePermission("MANAGE_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = CreateSupplierBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await supplierProvider.create(parsed.data as NewSupplier, scope(request));
      await recordAuditEvent("SUPPLIER_CREATED", {
        actorUserId: request.authContext!.userId,
        metadata: { supplierId: result.id, customerId: result.customerId },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.put(
  "/admin/suppliers/:id",
  requireAuth,
  requirePermission("MANAGE_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = UpdateSupplierBody.partial().safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await supplierProvider.update(
        Number(request.params.id),
        parsed.data as Partial<NewSupplier>,
        scope(request),
      );
      await recordAuditEvent("SUPPLIER_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { supplierId: result.id, customerId: result.customerId },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/suppliers/:supplierId/aliases",
  requireAuth,
  requirePermission("MANAGE_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = parseRelationBody<NewSupplierAlias>(
      request.body,
      ["alias", "aliasType"],
      [],
      ["active"],
    );
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.message });
      return;
    }
    try {
      const result = await supplierProvider.createAlias(
        Number(request.params.supplierId),
        parsed.data as NewSupplierAlias,
        scope(request),
      );
      await recordAuditEvent("SUPPLIER_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { supplierId: result.id, relation: "alias", action: "created" },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.delete(
  "/admin/suppliers/:supplierId/aliases/:aliasId",
  requireAuth,
  requirePermission("MANAGE_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    try {
      const result = await supplierProvider.deleteAlias(
        Number(request.params.supplierId),
        Number(request.params.aliasId),
        scope(request),
      );
      await recordAuditEvent("SUPPLIER_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { supplierId: result.id, relation: "alias", action: "deleted" },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.post(
  "/admin/supplier-material-mappings",
  requireAuth,
  requirePermission("MANAGE_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = UpsertSupplierMaterialMappingBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await supplierProvider.createMapping(
        parsed.data as NewSupplierMaterialMapping,
        scope(request),
      );
      await recordAuditEvent("SUPPLIER_MATERIAL_MAPPING_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: {
          supplierId: parsed.data.supplierId,
          materialId: parsed.data.materialId,
          customerId: parsed.data.customerId,
        },
      });
      response.status(201).json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

router.put(
  "/admin/supplier-material-mappings/:id",
  requireAuth,
  requirePermission("MANAGE_SUPPLIERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = UpdateSupplierMaterialMappingBody.partial().safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const result = await supplierProvider.updateMapping(
        Number(request.params.id),
        parsed.data as Partial<NewSupplierMaterialMapping>,
        scope(request),
      );
      await recordAuditEvent("SUPPLIER_MATERIAL_MAPPING_UPDATED", {
        actorUserId: request.authContext!.userId,
        metadata: { mappingId: Number(request.params.id) },
      });
      response.json(result);
    } catch (error) {
      sendMasterDataError(error, response);
    }
  },
);

export default router;