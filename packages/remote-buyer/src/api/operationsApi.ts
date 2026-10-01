/**
 * API layer of the receiving / operations service (invoice capture, purchase orders, goods receipts,
 * supplier master, integrations and their configuration). Every route sits under /api/v1/operations
 * and takes the organization from the login session, so no call sends an organization id.
 */
export { saveBlob } from "./operations/http";
export * from "./operations/receivingApi";
export * from "./operations/masterDataApi";
export * from "./operations/integrationsApi";
export * from "./operations/configurationApi";
