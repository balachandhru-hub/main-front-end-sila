import { auditEventsTable, db } from "@workspace/db";
import { logger } from "./logger";

export type AuditEventType =
  | "WEB_LOGIN_SUCCESS"
  | "WEB_LOGIN_FAILED"
  | "MOBILE_LOGIN_SUCCESS"
  | "MOBILE_LOGIN_FAILED"
  | "LOGOUT"
  | "ACCESS_DENIED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_PASSWORD_CHANGED"
  | "USER_PASSWORD_RESET"
  | "USER_ACCESS_CHANGED"
  | "USER_STATUS_CHANGED"
  | "USER_NOTIFICATION_SENT"
  | "USER_NOTIFICATION_FAILED"
  | "USER_SUSPENDED"
  | "USER_REACTIVATED"
  | "USER_ROLE_ASSIGNED"
  | "USER_SHAREPOINT_LINK_UPDATED"
  | "USER_SHAREPOINT_LINK_REMOVED"
  | "USER_STORE_ACCESS_ASSIGNED"
  | "MOBILE_CONFIG_UPDATED"
  | "MATERIAL_CREATED"
  | "MATERIAL_UPDATED"
  | "MATERIAL_CONFIRMED"
  | "SUPPLIER_CREATED"
  | "SUPPLIER_UPDATED"
  | "SUPPLIER_MATERIAL_MAPPING_UPDATED"
  | "INTEGRATION_CONNECTION_UPDATED"
  | "OPERATIONAL_SCOPE_GRANTED"
  | "DOCUMENT_CAPTURED"
  | "DOCUMENT_UPLOAD_STARTED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_UPLOAD_FAILED"
  | "INVOICE_EXTRACTION_STARTED"
  | "INVOICE_EXTRACTION_COMPLETED"
  | "INVOICE_EXTRACTION_FAILED"
  | "INVOICE_CORRECTED"
  | "INVOICE_CONFIRMED";

export async function recordAuditEvent(
  eventType: AuditEventType,
  options: {
    actorUserId?: number | null;
    targetUserId?: number | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await db.insert(auditEventsTable).values({
      eventType,
      actorUserId: options.actorUserId ?? null,
      targetUserId: options.targetUserId ?? null,
      metadata: options.metadata,
    });
  } catch (error) {
    logger.warn({ error, eventType }, "Could not persist audit event");
  }
}
