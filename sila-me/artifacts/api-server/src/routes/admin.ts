import { Router, type IRouter, type Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  AssignUserAccessBody,
  AssignUserAccessParams,
  AssignUserAccessResponse,
  AssignUserRolesBody,
  AssignUserRolesParams,
  AssignUserRolesResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  CreatePropertyBody,
  CreatePropertyResponse,
  CreateStoreBody,
  CreateStoreResponse,
  ListCustomersResponse,
  ListPermissionsResponse,
  ListPropertiesResponse,
  ListRolesResponse,
  ListStoresResponse,
  UpdateCustomerBody,
  UpdateCustomerParams,
  UpdateCustomerResponse,
  UpdateMobileConfigurationBody,
  UpdateMobileConfigurationResponse,
  UpdatePropertyBody,
  UpdatePropertyParams,
  UpdatePropertyResponse,
  UpdateStoreBody,
  UpdateStoreParams,
  UpdateStoreResponse,
} from "@workspace/api-zod";
import {
  customersTable,
  db,
  integrationConnectionsTable,
  mobileConfigurationsTable,
  permissionsTable,
  propertiesTable,
  rolesTable,
  storesTable,
  userAccountsTable,
  userCustomerAccessTable,
  userPropertyAccessTable,
  userRolesTable,
  userStoreAccessTable,
} from "@workspace/db";
import { resolveAuthContext } from "../lib/auth-context";
import { recordAuditEvent } from "../lib/audit";
import {
  configurationResponse,
  findMobileConfiguration,
} from "../lib/mobile-config";
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from "../middlewares/auth";
import { OCR_AGENT_PROVIDER } from "../lib/ocr-agent";

const router: IRouter = Router();

function customerResponse(customer: {
  id: number;
  code: string;
  name: string;
  status: string;
}) {
  return {
    id: customer.id,
    code: customer.code,
    name: customer.name,
    status: customer.status,
  };
}

function propertyResponse(property: {
  id: number;
  customerId: number;
  code: string;
  name: string;
  status: string;
}) {
  return {
    id: property.id,
    customerId: property.customerId,
    code: property.code,
    name: property.name,
    status: property.status,
  };
}

function storeResponse(store: {
  id: number;
  propertyId: number;
  code: string;
  name: string;
  status: string;
}) {
  return {
    id: store.id,
    propertyId: store.propertyId,
    code: store.code,
    name: store.name,
    status: store.status,
  };
}

function ocrAgentResponse(
  connection: typeof integrationConnectionsTable.$inferSelect,
  customer: { code: string; name: string },
) {
  const metadata = connection.metadata ?? {};
  return {
    id: connection.id,
    customerId: connection.customerId,
    customerCode: customer.code,
    customerName: customer.name,
    name: connection.name,
    model: typeof metadata.model === "string" ? metadata.model : "gemini-3-flash-preview",
    status: connection.status,
    provider: connection.provider,
    updatedAt: connection.updatedAt,
  };
}

function accessDenied(response: Response): void {
  response.status(403).json({
    error: "ACCESS_DENIED",
    message: "You do not have access to this organization resource.",
  });
}

async function userAccessResult(userId: number) {
  const [user] = await db
    .select()
    .from(userAccountsTable)
    .where(eq(userAccountsTable.id, userId))
    .limit(1);
  if (!user) return null;
  const context = await resolveAuthContext(user);
  return {
    userId,
    roles: context.roles,
    customerIds: context.customers.map((customer) => customer.id),
    propertyIds: context.propertyIds,
    storeIds: context.storeIds,
  };
}

router.get(
  "/admin/customers",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const context = request.authContext!;
    response.json(
      ListCustomersResponse.parse(
        context.customers.map(customerResponse).sort((a, b) => a.code.localeCompare(b.code)),
      ),
    );
  },
);

router.post(
  "/admin/customers",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = CreateCustomerBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    try {
      const [created] = await db
        .insert(customersTable)
        .values({
          code: parsed.data.code.trim().toUpperCase(),
          name: parsed.data.name.trim(),
          status: parsed.data.status ?? "Active",
        })
        .returning();
      response.status(201).json(CreateCustomerResponse.parse(customerResponse(created)));
    } catch (error) {
      request.log.warn({ error }, "Could not create customer");
      response.status(409).json({
        error: "CONFLICT",
        message: "A customer with that code already exists.",
      });
    }
  },
);

router.put(
  "/admin/customers/:id",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const params = UpdateCustomerParams.safeParse(request.params);
    const parsed = UpdateCustomerBody.safeParse(request.body);
    if (!params.success || !parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid customer update." });
      return;
    }
    if (!request.authContext!.customers.some((customer) => customer.id === params.data.id)) {
      accessDenied(response);
      return;
    }
    const [updated] = await db
      .update(customersTable)
      .set({
        ...(parsed.data.code === undefined
          ? {}
          : { code: parsed.data.code.trim().toUpperCase() }),
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name.trim() }),
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        updatedAt: new Date(),
      })
      .where(eq(customersTable.id, params.data.id))
      .returning();
    if (!updated) {
      response.status(404).json({ error: "NOT_FOUND", message: "Customer not found." });
      return;
    }
    response.json(UpdateCustomerResponse.parse(customerResponse(updated)));
  },
);

router.get(
  "/admin/properties",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json(
      ListPropertiesResponse.parse(
        request.authContext!.properties
          .map(propertyResponse)
          .sort((a, b) => a.code.localeCompare(b.code)),
      ),
    );
  },
);

router.post(
  "/admin/properties",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = CreatePropertyBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    if (!request.authContext!.customers.some(({ id }) => id === parsed.data.customerId)) {
      accessDenied(response);
      return;
    }
    try {
      const [created] = await db
        .insert(propertiesTable)
        .values({
          customerId: parsed.data.customerId,
          code: parsed.data.code.trim().toUpperCase(),
          name: parsed.data.name.trim(),
          status: parsed.data.status ?? "Active",
        })
        .returning();
      response.status(201).json(CreatePropertyResponse.parse(propertyResponse(created)));
    } catch (error) {
      request.log.warn({ error }, "Could not create property");
      response.status(409).json({
        error: "CONFLICT",
        message: "A property with that code already exists for the customer.",
      });
    }
  },
);

router.put(
  "/admin/properties/:id",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const params = UpdatePropertyParams.safeParse(request.params);
    const parsed = UpdatePropertyBody.safeParse(request.body);
    if (!params.success || !parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid property update." });
      return;
    }
    if (!request.authContext!.propertyIds.includes(params.data.id)) {
      accessDenied(response);
      return;
    }
    if (
      parsed.data.customerId !== undefined &&
      !request.authContext!.customers.some(({ id }) => id === parsed.data.customerId)
    ) {
      accessDenied(response);
      return;
    }
    const [updated] = await db
      .update(propertiesTable)
      .set({
        ...(parsed.data.customerId === undefined ? {} : { customerId: parsed.data.customerId }),
        ...(parsed.data.code === undefined
          ? {}
          : { code: parsed.data.code.trim().toUpperCase() }),
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name.trim() }),
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        updatedAt: new Date(),
      })
      .where(eq(propertiesTable.id, params.data.id))
      .returning();
    if (!updated) {
      response.status(404).json({ error: "NOT_FOUND", message: "Property not found." });
      return;
    }
    response.json(UpdatePropertyResponse.parse(propertyResponse(updated)));
  },
);

router.get(
  "/admin/stores",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json(
      ListStoresResponse.parse(
        request.authContext!.stores
          .map(storeResponse)
          .sort((a, b) => a.code.localeCompare(b.code)),
      ),
    );
  },
);

router.post(
  "/admin/stores",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = CreateStoreBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    if (!request.authContext!.propertyIds.includes(parsed.data.propertyId)) {
      accessDenied(response);
      return;
    }
    try {
      const [created] = await db
        .insert(storesTable)
        .values({
          propertyId: parsed.data.propertyId,
          code: parsed.data.code.trim().toUpperCase(),
          name: parsed.data.name.trim(),
          status: parsed.data.status ?? "Active",
        })
        .returning();
      response.status(201).json(CreateStoreResponse.parse(storeResponse(created)));
    } catch (error) {
      request.log.warn({ error }, "Could not create store");
      response.status(409).json({
        error: "CONFLICT",
        message: "A store with that code already exists for the property.",
      });
    }
  },
);

router.put(
  "/admin/stores/:id",
  requireAuth,
  requirePermission("MANAGE_ORGANIZATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const params = UpdateStoreParams.safeParse(request.params);
    const parsed = UpdateStoreBody.safeParse(request.body);
    if (!params.success || !parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid store update." });
      return;
    }
    if (!request.authContext!.storeIds.includes(params.data.id)) {
      accessDenied(response);
      return;
    }
    if (
      parsed.data.propertyId !== undefined &&
      !request.authContext!.propertyIds.includes(parsed.data.propertyId)
    ) {
      accessDenied(response);
      return;
    }
    const [updated] = await db
      .update(storesTable)
      .set({
        ...(parsed.data.propertyId === undefined ? {} : { propertyId: parsed.data.propertyId }),
        ...(parsed.data.code === undefined
          ? {}
          : { code: parsed.data.code.trim().toUpperCase() }),
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name.trim() }),
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        updatedAt: new Date(),
      })
      .where(eq(storesTable.id, params.data.id))
      .returning();
    if (!updated) {
      response.status(404).json({ error: "NOT_FOUND", message: "Store not found." });
      return;
    }
    response.json(UpdateStoreResponse.parse(storeResponse(updated)));
  },
);

router.get(
  "/admin/roles",
  requireAuth,
  requirePermission("MANAGE_USERS", "MANAGE_ROLES"),
  async (_request, response): Promise<void> => {
    const roles = await db.select().from(rolesTable).orderBy(asc(rolesTable.code));
    response.json(ListRolesResponse.parse(roles));
  },
);

router.get(
  "/admin/permissions",
  requireAuth,
  requirePermission("MANAGE_ROLES"),
  async (_request, response): Promise<void> => {
    const permissions = await db
      .select()
      .from(permissionsTable)
      .orderBy(asc(permissionsTable.code));
    response.json(ListPermissionsResponse.parse(permissions));
  },
);

router.put(
  "/admin/users/:id/roles",
  requireAuth,
  requirePermission("MANAGE_ROLES"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const params = AssignUserRolesParams.safeParse(request.params);
    const parsed = AssignUserRolesBody.safeParse(request.body);
    if (!params.success || !parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid role assignment." });
      return;
    }
    const roles = await db
      .select()
      .from(rolesTable)
      .where(inArray(rolesTable.code, parsed.data.roleCodes));
    if (roles.length !== parsed.data.roleCodes.length) {
      response.status(404).json({ error: "NOT_FOUND", message: "One or more roles were not found." });
      return;
    }
    const [target] = await db
      .select()
      .from(userAccountsTable)
      .where(eq(userAccountsTable.id, params.data.id))
      .limit(1);
    if (!target) {
      response.status(404).json({ error: "NOT_FOUND", message: "User not found." });
      return;
    }
    await db.transaction(async (transaction) => {
      await transaction.delete(userRolesTable).where(eq(userRolesTable.userId, target.id));
      await transaction
        .insert(userRolesTable)
        .values(roles.map((role) => ({ userId: target.id, roleId: role.id })));
      await transaction
        .update(userAccountsTable)
        .set({ role: parsed.data.roleCodes[0], updatedAt: new Date() })
        .where(eq(userAccountsTable.id, target.id));
    });
    await recordAuditEvent("USER_ROLE_ASSIGNED", {
      actorUserId: request.currentUser!.id,
      targetUserId: target.id,
      metadata: { roles: parsed.data.roleCodes },
    });
    response.json(AssignUserRolesResponse.parse(await userAccessResult(target.id)));
  },
);

router.put(
  "/admin/users/:id/access",
  requireAuth,
  requirePermission("MANAGE_USERS"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const params = AssignUserAccessParams.safeParse(request.params);
    const parsed = AssignUserAccessBody.safeParse(request.body);
    if (!params.success || !parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid access assignment." });
      return;
    }
    const [target] = await db
      .select()
      .from(userAccountsTable)
      .where(eq(userAccountsTable.id, params.data.id))
      .limit(1);
    if (!target) {
      response.status(404).json({ error: "NOT_FOUND", message: "User not found." });
      return;
    }
    const caller = request.authContext!;
    if (
      parsed.data.customerIds.some((id) => !caller.customers.some((customer) => customer.id === id)) ||
      parsed.data.propertyIds.some((id) => !caller.propertyIds.includes(id)) ||
      parsed.data.storeIds.some((id) => !caller.storeIds.includes(id))
    ) {
      accessDenied(response);
      return;
    }
    const customers =
      parsed.data.customerIds.length > 0
        ? await db
            .select()
            .from(customersTable)
            .where(inArray(customersTable.id, parsed.data.customerIds))
        : [];
    const properties =
      parsed.data.propertyIds.length > 0
        ? await db
            .select()
            .from(propertiesTable)
            .where(inArray(propertiesTable.id, parsed.data.propertyIds))
        : [];
    const stores =
      parsed.data.storeIds.length > 0
        ? await db
            .select()
            .from(storesTable)
            .where(inArray(storesTable.id, parsed.data.storeIds))
        : [];
    if (
      customers.length !== parsed.data.customerIds.length ||
      properties.length !== parsed.data.propertyIds.length ||
      stores.length !== parsed.data.storeIds.length
    ) {
      response.status(404).json({ error: "NOT_FOUND", message: "One or more scope resources were not found." });
      return;
    }
    const authorizedPropertyIds = new Set(parsed.data.propertyIds);
    const propertyCustomerValid = properties.every((property) =>
      parsed.data.customerIds.includes(property.customerId),
    );
    const storeHierarchyValid = stores.every((store) => authorizedPropertyIds.has(store.propertyId));
    if (!propertyCustomerValid || !storeHierarchyValid) {
      response.status(422).json({
        error: "INVALID_SCOPE_HIERARCHY",
        message: "Properties and stores must belong to the assigned parent scope.",
      });
      return;
    }

    await db.transaction(async (transaction) => {
      await transaction.delete(userCustomerAccessTable).where(eq(userCustomerAccessTable.userId, target.id));
      await transaction.delete(userPropertyAccessTable).where(eq(userPropertyAccessTable.userId, target.id));
      await transaction.delete(userStoreAccessTable).where(eq(userStoreAccessTable.userId, target.id));
      if (customers.length) {
        await transaction.insert(userCustomerAccessTable).values(
          customers.map((customer) => ({ userId: target.id, customerId: customer.id })),
        );
      }
      if (properties.length) {
        await transaction.insert(userPropertyAccessTable).values(
          properties.map((property) => ({ userId: target.id, propertyId: property.id })),
        );
      }
      if (stores.length) {
        await transaction.insert(userStoreAccessTable).values(
          stores.map((store) => ({ userId: target.id, storeId: store.id })),
        );
      }
      await transaction
        .update(userAccountsTable)
        .set({
          accessModel: "Explicit",
          customerScope: customers.length === 1 ? customers[0].code : "*",
          propertyScope: properties.length === 1 ? properties[0].code : "*",
          storeScope: stores.length === 1 ? stores[0].code : "*",
          updatedAt: new Date(),
        })
        .where(eq(userAccountsTable.id, target.id));
    });
    await recordAuditEvent("USER_STORE_ACCESS_ASSIGNED", {
      actorUserId: request.currentUser!.id,
      targetUserId: target.id,
      metadata: {
        customerIds: parsed.data.customerIds,
        propertyIds: parsed.data.propertyIds,
        storeIds: parsed.data.storeIds,
      },
    });
    response.json(AssignUserAccessResponse.parse(await userAccessResult(target.id)));
  },
);

router.put(
  "/admin/mobile-config",
  requireAuth,
  requirePermission("MANAGE_CONFIGURATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = UpdateMobileConfigurationBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
      return;
    }
    if (!request.authContext!.customers.some(({ id }) => id === parsed.data.customerId)) {
      accessDenied(response);
      return;
    }
    const propertyId = parsed.data.propertyId ?? null;
    const storeId = parsed.data.storeId ?? null;
    const [property, store] = await Promise.all([
      propertyId === null
        ? Promise.resolve(undefined)
        : db
            .select()
            .from(propertiesTable)
            .where(eq(propertiesTable.id, propertyId))
            .limit(1)
            .then(([record]) => record),
      storeId === null
        ? Promise.resolve(undefined)
        : db
            .select()
            .from(storesTable)
            .where(eq(storesTable.id, storeId))
            .limit(1)
            .then(([record]) => record),
    ]);
    if (
      (property && property.customerId !== parsed.data.customerId) ||
      (store && propertyId !== null && store.propertyId !== propertyId) ||
      (propertyId !== null && !property) ||
      (storeId !== null && !store)
    ) {
      response.status(422).json({
        error: "INVALID_SCOPE_HIERARCHY",
        message: "Configuration scope does not match the organization hierarchy.",
      });
      return;
    }
    const normalizedPropertyId = propertyId ?? store?.propertyId ?? null;
    if (
      (normalizedPropertyId !== null &&
        !request.authContext!.propertyIds.includes(normalizedPropertyId)) ||
      (storeId !== null && !request.authContext!.storeIds.includes(storeId))
    ) {
      accessDenied(response);
      return;
    }

    const existing = await findMobileConfiguration(
      parsed.data.customerId,
      normalizedPropertyId,
      storeId,
    );
    const values = {
      ...parsed.data.features,
      configurationVersion: (existing?.configurationVersion ?? 0) + 1,
      updatedAt: new Date(),
    };
    const [saved] = existing
      ? await db
          .update(mobileConfigurationsTable)
          .set(values)
          .where(eq(mobileConfigurationsTable.id, existing.id))
          .returning()
      : await db
          .insert(mobileConfigurationsTable)
          .values({
            customerId: parsed.data.customerId,
            propertyId: normalizedPropertyId,
            storeId,
            ...values,
          })
          .returning();
    await recordAuditEvent("MOBILE_CONFIG_UPDATED", {
      actorUserId: request.currentUser!.id,
      metadata: {
        customerId: parsed.data.customerId,
        propertyId: normalizedPropertyId,
        storeId,
        configurationVersion: saved.configurationVersion,
      },
    });
    response.json(
      UpdateMobileConfigurationResponse.parse(configurationResponse(saved)),
    );
  },
);

router.get(
  "/admin/ocr-agent",
  requireAuth,
  requirePermission("MANAGE_CONFIGURATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const customerIds = request.authContext!.customers.map(({ id }) => id);
    if (customerIds.length === 0) {
      response.json([]);
      return;
    }
    const records = await db
      .select({ connection: integrationConnectionsTable, customer: customersTable })
      .from(integrationConnectionsTable)
      .innerJoin(customersTable, eq(integrationConnectionsTable.customerId, customersTable.id))
      .where(
        and(
          eq(integrationConnectionsTable.provider, OCR_AGENT_PROVIDER),
          inArray(integrationConnectionsTable.customerId, customerIds),
        ),
      )
      .orderBy(asc(customersTable.code));
    response.json(records.map(({ connection, customer }) => ocrAgentResponse(connection, customer)));
  },
);

router.put(
  "/admin/ocr-agent",
  requireAuth,
  requirePermission("MANAGE_CONFIGURATION"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const body = request.body as Record<string, unknown>;
    const customerId = Number(body.customerId);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const enabled = body.enabled === true;
    if (!Number.isInteger(customerId) || customerId <= 0 || !name || name.length > 120 || !model || model.length > 120) {
      response.status(400).json({
        error: "VALIDATION_ERROR",
        message: "customerId, name, and model are required.",
      });
      return;
    }
    const customer = request.authContext!.customers.find(({ id }) => id === customerId);
    if (!customer) {
      accessDenied(response);
      return;
    }
    const [customerRecord] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .limit(1);
    if (!customerRecord) {
      response.status(404).json({ error: "NOT_FOUND", message: "Customer not found." });
      return;
    }
    const [existing] = await db
      .select()
      .from(integrationConnectionsTable)
      .where(
        and(
          eq(integrationConnectionsTable.customerId, customerId),
          eq(integrationConnectionsTable.provider, OCR_AGENT_PROVIDER),
        ),
      )
      .limit(1);
    const values = {
      provider: OCR_AGENT_PROVIDER,
      name,
      status: enabled ? "Active" : "Disabled",
      metadata: {
        model,
        purpose: "INVOICE_OCR_FALLBACK",
        configuredBy: "SILA_CLOUD",
      },
      updatedAt: new Date(),
    };
    const [saved] = existing
      ? await db
          .update(integrationConnectionsTable)
          .set(values)
          .where(eq(integrationConnectionsTable.id, existing.id))
          .returning()
      : await db
          .insert(integrationConnectionsTable)
          .values({ customerId, ...values })
          .returning();
    await recordAuditEvent("INTEGRATION_CONNECTION_UPDATED", {
      actorUserId: request.currentUser!.id,
      metadata: {
        connectionId: saved.id,
        customerId,
        provider: OCR_AGENT_PROVIDER,
        status: saved.status,
      },
    });
    response.json(ocrAgentResponse(saved, customerRecord));
  },
);

export default router;