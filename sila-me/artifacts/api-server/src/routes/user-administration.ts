import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { zod as z } from "@workspace/api-zod";
import {
  cloudUserRolesTable,
  cloudUsersTable,
  customersTable,
  db,
  mobileUserPropertyAccessTable,
  mobileUserRolesTable,
  mobileUserStoreAccessTable,
  mobileUsersTable,
  notificationDeliveriesTable,
  propertiesTable,
  rolesTable,
  storesTable,
  userAccountsTable,
} from "@workspace/db";
import {
  passwordDigest,
  verifyPassword,
  type AuthenticatedIdentity,
} from "../lib/access";
import { recordAuditEvent } from "../lib/audit";
import { notifyUser, type UserNotificationType } from "../lib/notifications";
import {
  requireAuth,
  requireCloudAuth,
  requirePermission,
  type AuthenticatedRequest,
} from "../middlewares/auth";

const router: IRouter = Router();

const Password = z.string().min(12).refine((value) =>
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value), {
  message: "Password must be at least 12 characters and include upper, lower, number, and symbol.",
});
const Status = z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]);
const RoleCodes = z.array(z.string().min(1)).min(1).max(8);

const MobileCreate = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(160),
  roleCodes: RoleCodes,
  customerId: z.number().int().positive(),
  propertyIds: z.array(z.number().int().positive()).min(1).max(50),
  storeIds: z.array(z.number().int().positive()).min(1).max(100),
  temporaryPassword: Password.optional(),
});
const MobileUpdate = MobileCreate.partial().extend({
  status: Status.optional(),
});
const CloudCreate = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(160),
  roleCodes: RoleCodes,
  temporaryPassword: Password.optional(),
});
const CloudUpdate = CloudCreate.partial().extend({
  status: Status.optional(),
});
const PasswordReset = z.object({ temporaryPassword: Password.optional() });

type Domain = "MOBILE" | "CLOUD";
const mobileRoleCodes = new Set([
  "MOBILE_SUPER_ADMIN",
  "STORE_MANAGER",
  "INVENTORY_CONTROLLER",
  "PROCUREMENT_MANAGER",
  "FINANCE_MANAGER",
]);
const cloudRoleCodes = new Set([
  "SUPER_ADMIN",
  "CLOUD_SUPER_ADMIN",
  "CUSTOMER_SUPPORT_COORDINATOR",
  "CUSTOMER_MANAGER",
]);

function generateTemporaryPassword(): string {
  return `Sila!${randomBytes(12).toString("base64url")}9Aa`;
}

function generatedLegacyCode(domain: Domain): string {
  return `${domain}_${randomBytes(8).toString("hex").toUpperCase()}`;
}

function normalizeStatus(status: string): "Active" | "Suspended" {
  return status === "ACTIVE" ? "Active" : "Suspended";
}

function primaryRole(roleCodes: string[]): string {
  return roleCodes[0]!;
}

async function visibleRoleRows(roleCodes: string[], domain: Domain) {
  const rows = await db
    .select()
    .from(rolesTable)
    .where(inArray(rolesTable.code, roleCodes));
  const valid = rows.filter(
    (role) => role.status === "Active" &&
      (domain === "MOBILE" ? mobileRoleCodes.has(role.code) : cloudRoleCodes.has(role.code)) &&
      (role.applicationScope === "BOTH" || role.applicationScope === domain),
  );
  return valid.length === roleCodes.length && valid.every((role) => roleCodes.includes(role.code))
    ? valid
    : null;
}

async function loadHierarchy(
  customerId: number,
  propertyIds: number[],
  storeIds: number[],
  actor: AuthenticatedRequest,
) {
  const context = actor.authContext!;
  if (!context.customers.some((customer) => customer.id === customerId)) return null;
  const properties = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, propertyIds));
  const stores = await db
    .select()
    .from(storesTable)
    .where(inArray(storesTable.id, storeIds));
  if (
    properties.length !== new Set(propertyIds).size ||
    stores.length !== new Set(storeIds).size ||
    properties.some((property) => property.customerId !== customerId) ||
    stores.some((store) => !properties.some((property) => property.id === store.propertyId))
  ) return null;
  return { properties, stores };
}

async function roleCodesFor(domain: Domain, principalId: number): Promise<string[]> {
  if (domain === "MOBILE") {
    const rows = await db
      .select({ code: rolesTable.code })
      .from(mobileUserRolesTable)
      .innerJoin(rolesTable, eq(mobileUserRolesTable.roleId, rolesTable.id))
      .where(eq(mobileUserRolesTable.mobileUserId, principalId))
      .orderBy(asc(rolesTable.code));
    return rows.map((row) => row.code);
  }
  const rows = await db
    .select({ code: rolesTable.code })
    .from(cloudUserRolesTable)
    .innerJoin(rolesTable, eq(cloudUserRolesTable.roleId, rolesTable.id))
    .where(eq(cloudUserRolesTable.cloudUserId, principalId))
    .orderBy(asc(rolesTable.code));
  return rows.map((row) => row.code);
}

async function mobileResponse(user: typeof mobileUsersTable.$inferSelect) {
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, user.customerId)).limit(1);
  const [properties, stores, roleCodes] = await Promise.all([
    db.select({ id: mobileUserPropertyAccessTable.propertyId }).from(mobileUserPropertyAccessTable).where(eq(mobileUserPropertyAccessTable.mobileUserId, user.id)),
    db.select({ id: mobileUserStoreAccessTable.storeId }).from(mobileUserStoreAccessTable).where(eq(mobileUserStoreAccessTable.mobileUserId, user.id)),
    roleCodesFor("MOBILE", user.id),
  ]);
  const [latestNotification] = await db.select().from(notificationDeliveriesTable)
    .where(eq(notificationDeliveriesTable.targetUserId, user.legacyUserId))
    .orderBy(desc(notificationDeliveriesTable.createdAt)).limit(1);
  return {
    id: user.id,
    legacyUserId: user.legacyUserId,
    code: user.code,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roleCodes,
    customer: customer ? { id: customer.id, code: customer.code, name: customer.name } : null,
    propertyIds: properties.map((row) => row.id),
    storeIds: stores.map((row) => row.id),
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    notificationStatus: latestNotification?.status ?? null,
    createdAt: user.createdAt,
  };
}

async function cloudResponse(user: typeof cloudUsersTable.$inferSelect) {
  const roleCodes = await roleCodesFor("CLOUD", user.id);
  const [latestNotification] = await db.select().from(notificationDeliveriesTable)
    .where(eq(notificationDeliveriesTable.targetUserId, user.legacyUserId))
    .orderBy(desc(notificationDeliveriesTable.createdAt)).limit(1);
  return {
    id: user.id,
    legacyUserId: user.legacyUserId,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roleCodes,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    notificationStatus: latestNotification?.status ?? null,
    createdAt: user.createdAt,
  };
}

async function sendCredentialNotification(
  type: UserNotificationType,
  user: { email: string; displayName: string; legacyUserId: number },
  temporaryPassword: string,
  actorUserId?: number,
) {
  return notifyUser({
    type,
    recipient: user.email,
    displayName: user.displayName,
    targetUserId: user.legacyUserId,
    actorUserId,
    temporaryPassword,
  });
}

async function createLegacyUser(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: { email: string; displayName: string; role: string; password: string; code: string },
) {
  const [legacy] = await transaction
    .insert(userAccountsTable)
    .values({
      code: input.code,
      email: input.email,
      name: input.displayName,
      role: input.role,
      passwordHash: passwordDigest(input.password),
      status: "Active",
      accessModel: "Explicit",
    })
    .returning();
  if (!legacy) throw new Error("Could not create compatibility identity.");
  return legacy;
}

async function assignRoles(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  roleRows: Array<typeof rolesTable.$inferSelect>,
  domain: Domain,
  principalId: number,
) {
  if (domain === "MOBILE") {
    await transaction.insert(mobileUserRolesTable).values(roleRows.map((role) => ({ mobileUserId: principalId, roleId: role.id })));
  } else {
    await transaction.insert(cloudUserRolesTable).values(roleRows.map((role) => ({ cloudUserId: principalId, roleId: role.id })));
  }
}

router.get("/admin/mobile-users", requireCloudAuth, requirePermission("MANAGE_USERS"), async (request: AuthenticatedRequest, response) => {
  const customerIds = request.authContext!.customers.map((customer) => customer.id);
  const users = customerIds.length === 0
    ? []
    : await db.select().from(mobileUsersTable).where(inArray(mobileUsersTable.customerId, customerIds)).orderBy(asc(mobileUsersTable.displayName));
  response.json(await Promise.all(users.map(mobileResponse)));
});

router.post("/admin/mobile-users", requireCloudAuth, requirePermission("MANAGE_USERS"), async (request: AuthenticatedRequest, response) => {
  const parsed = MobileCreate.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const roleRows = await visibleRoleRows(parsed.data.roleCodes, "MOBILE");
  const hierarchy = await loadHierarchy(parsed.data.customerId, parsed.data.propertyIds, parsed.data.storeIds, request);
  if (!roleRows || !hierarchy) {
    response.status(422).json({ error: "INVALID_SCOPE_OR_ROLE", message: "The selected role or customer/property/store hierarchy is not valid." });
    return;
  }
  const temporaryPassword = parsed.data.temporaryPassword ?? generateTemporaryPassword();
  try {
    const created = await db.transaction(async (transaction) => {
      const legacy = await createLegacyUser(transaction, {
        code: generatedLegacyCode("MOBILE"),
        email,
        displayName: parsed.data.displayName,
        role: primaryRole(parsed.data.roleCodes),
        password: temporaryPassword,
      });
      const [mobile] = await transaction.insert(mobileUsersTable).values({
        legacyUserId: legacy.id,
        code: legacy.code,
        email,
        displayName: parsed.data.displayName,
        passwordHash: passwordDigest(temporaryPassword),
        customerId: parsed.data.customerId,
        mustChangePassword: true,
      }).returning();
      if (!mobile) throw new Error("Could not create mobile identity.");
      await assignRoles(transaction, roleRows, "MOBILE", mobile.id);
      await transaction.insert(mobileUserPropertyAccessTable).values(parsed.data.propertyIds.map((propertyId: number) => ({ mobileUserId: mobile.id, propertyId })));
      await transaction.insert(mobileUserStoreAccessTable).values(parsed.data.storeIds.map((storeId: number) => ({ mobileUserId: mobile.id, storeId })));
      return mobile;
    });
    const notification = await sendCredentialNotification("WELCOME_CREDENTIALS", created, temporaryPassword, request.currentUser!.id);
    await recordAuditEvent("USER_CREATED", { actorUserId: request.currentUser!.id, targetUserId: created.legacyUserId, metadata: { domain: "MOBILE", roleCodes: parsed.data.roleCodes, customerId: parsed.data.customerId } });
    response.status(201).json({ ...(await mobileResponse(created)), notification });
  } catch (error) {
    request.log.warn({ error }, "Could not create mobile user");
    response.status(409).json({ error: "CONFLICT", message: "A user with that email or generated code already exists." });
  }
});

router.get("/admin/cloud-users", requireCloudAuth, requirePermission("MANAGE_USERS"), async (_request: AuthenticatedRequest, response) => {
  const users = await db.select().from(cloudUsersTable).orderBy(asc(cloudUsersTable.displayName));
  response.json(await Promise.all(users.map(cloudResponse)));
});

router.post("/admin/cloud-users", requireCloudAuth, requirePermission("MANAGE_USERS"), async (request: AuthenticatedRequest, response) => {
  const parsed = CloudCreate.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const roleRows = await visibleRoleRows(parsed.data.roleCodes, "CLOUD");
  if (!roleRows) {
    response.status(422).json({ error: "INVALID_ROLE", message: "Only Cloud roles can be assigned to a Cloud user." });
    return;
  }
  const temporaryPassword = parsed.data.temporaryPassword ?? generateTemporaryPassword();
  try {
    const created = await db.transaction(async (transaction) => {
      const legacy = await createLegacyUser(transaction, {
        code: generatedLegacyCode("CLOUD"),
        email,
        displayName: parsed.data.displayName,
        role: primaryRole(parsed.data.roleCodes),
        password: temporaryPassword,
      });
      const [cloud] = await transaction.insert(cloudUsersTable).values({
        legacyUserId: legacy.id,
        email,
        displayName: parsed.data.displayName,
        passwordHash: passwordDigest(temporaryPassword),
        mustChangePassword: true,
        isSuperAdmin: parsed.data.roleCodes.includes("CLOUD_SUPER_ADMIN"),
      }).returning();
      if (!cloud) throw new Error("Could not create Cloud identity.");
      await assignRoles(transaction, roleRows, "CLOUD", cloud.id);
      return cloud;
    });
    const notification = await sendCredentialNotification("WELCOME_CREDENTIALS", created, temporaryPassword, request.currentUser!.id);
    await recordAuditEvent("USER_CREATED", { actorUserId: request.currentUser!.id, targetUserId: created.legacyUserId, metadata: { domain: "CLOUD", roleCodes: parsed.data.roleCodes } });
    response.status(201).json({ ...(await cloudResponse(created)), notification });
  } catch (error) {
    request.log.warn({ error }, "Could not create Cloud user");
    response.status(409).json({ error: "CONFLICT", message: "A Cloud user with that email or generated code already exists." });
  }
});

async function updateDomainUser(
  request: AuthenticatedRequest,
  response: import("express").Response,
  domain: Domain,
  id: number,
  body: unknown,
) {
  const parsed = (domain === "MOBILE" ? MobileUpdate : CloudUpdate).safeParse(body);
  if (!parsed.success) {
    response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }
  const status = parsed.data.status;
  if (status === "SUSPENDED" || status === "DEACTIVATED") {
    const targetLegacyId = domain === "MOBILE"
      ? (await db.select({ legacyUserId: mobileUsersTable.legacyUserId }).from(mobileUsersTable).where(eq(mobileUsersTable.id, id)).limit(1))[0]?.legacyUserId
      : (await db.select({ legacyUserId: cloudUsersTable.legacyUserId }).from(cloudUsersTable).where(eq(cloudUsersTable.id, id)).limit(1))[0]?.legacyUserId;
    if (targetLegacyId === request.currentUser?.id) {
      response.status(400).json({ error: "SELF_STATUS_CHANGE", message: "You cannot suspend or deactivate your own account." });
      return;
    }
  }
  const roleRows = parsed.data.roleCodes ? await visibleRoleRows(parsed.data.roleCodes, domain) : null;
  if (parsed.data.roleCodes && !roleRows) {
    response.status(422).json({ error: "INVALID_ROLE", message: "The selected role is not valid for this user domain." });
    return;
  }
  let target: typeof mobileUsersTable.$inferSelect | typeof cloudUsersTable.$inferSelect | undefined;
  try {
    target = await db.transaction(async (transaction) => {
      const [current] = domain === "MOBILE"
        ? await transaction.select().from(mobileUsersTable).where(eq(mobileUsersTable.id, id)).limit(1)
        : await transaction.select().from(cloudUsersTable).where(eq(cloudUsersTable.id, id)).limit(1);
      if (!current) throw new Error("NOT_FOUND");
      if (domain === "MOBILE" && ("customerId" in parsed.data || "propertyIds" in parsed.data || "storeIds" in parsed.data)) {
        const mobileInput = parsed.data as z.infer<typeof MobileUpdate>;
        const currentProperties = await transaction.select({ propertyId: mobileUserPropertyAccessTable.propertyId }).from(mobileUserPropertyAccessTable).where(eq(mobileUserPropertyAccessTable.mobileUserId, id));
        const currentStores = await transaction.select({ storeId: mobileUserStoreAccessTable.storeId }).from(mobileUserStoreAccessTable).where(eq(mobileUserStoreAccessTable.mobileUserId, id));
        const currentMobile = current as typeof mobileUsersTable.$inferSelect;
        const customerId = mobileInput.customerId ?? currentMobile.customerId;
        const propertyIds = mobileInput.propertyIds ?? currentProperties.map((row) => row.propertyId);
        const storeIds = mobileInput.storeIds ?? currentStores.map((row) => row.storeId);
        const hierarchy = await loadHierarchy(customerId, propertyIds, storeIds, request);
        if (!hierarchy) throw new Error("INVALID_SCOPE");
        await transaction.delete(mobileUserPropertyAccessTable).where(eq(mobileUserPropertyAccessTable.mobileUserId, id));
        await transaction.delete(mobileUserStoreAccessTable).where(eq(mobileUserStoreAccessTable.mobileUserId, id));
        await transaction.insert(mobileUserPropertyAccessTable).values(propertyIds.map((propertyId: number) => ({ mobileUserId: id, propertyId })));
        await transaction.insert(mobileUserStoreAccessTable).values(storeIds.map((storeId: number) => ({ mobileUserId: id, storeId })));
        await transaction.update(mobileUsersTable).set({ customerId, updatedAt: new Date() }).where(eq(mobileUsersTable.id, id));
      }
      const password = "temporaryPassword" in parsed.data ? (parsed.data as { temporaryPassword?: string }).temporaryPassword : undefined;
      if (domain === "MOBILE") {
        const [updated] = await transaction.update(mobileUsersTable).set({
          ...("email" in parsed.data && parsed.data.email ? { email: parsed.data.email.trim().toLowerCase() } : {}),
          ...("displayName" in parsed.data && parsed.data.displayName ? { displayName: parsed.data.displayName.trim() } : {}),
          ...(status ? { status: status } : {}),
          ...(password ? { passwordHash: passwordDigest(password), mustChangePassword: true } : {}),
          updatedAt: new Date(),
        }).where(eq(mobileUsersTable.id, id)).returning();
        if (password || status) await transaction.update(userAccountsTable).set({ ...(password ? { passwordHash: passwordDigest(password) } : {}), ...(status ? { status: normalizeStatus(status) } : {}), updatedAt: new Date() }).where(eq(userAccountsTable.id, current.legacyUserId));
        if (roleRows) {
          await transaction.delete(mobileUserRolesTable).where(eq(mobileUserRolesTable.mobileUserId, id));
          await assignRoles(transaction, roleRows, domain, id);
          await transaction.update(userAccountsTable).set({ role: primaryRole(parsed.data.roleCodes!) }).where(eq(userAccountsTable.id, current.legacyUserId));
        }
        return updated;
      }
      const [updated] = await transaction.update(cloudUsersTable).set({
        ...("email" in parsed.data && parsed.data.email ? { email: parsed.data.email.trim().toLowerCase() } : {}),
        ...("displayName" in parsed.data && parsed.data.displayName ? { displayName: parsed.data.displayName.trim() } : {}),
        ...(status ? { status: status } : {}),
        ...(password ? { passwordHash: passwordDigest(password), mustChangePassword: true } : {}),
        ...(roleRows ? { isSuperAdmin: parsed.data.roleCodes!.includes("CLOUD_SUPER_ADMIN") } : {}),
        updatedAt: new Date(),
      }).where(eq(cloudUsersTable.id, id)).returning();
      if (password || status) await transaction.update(userAccountsTable).set({ ...(password ? { passwordHash: passwordDigest(password) } : {}), ...(status ? { status: normalizeStatus(status) } : {}), updatedAt: new Date() }).where(eq(userAccountsTable.id, current.legacyUserId));
      if (roleRows) {
        await transaction.delete(cloudUserRolesTable).where(eq(cloudUserRolesTable.cloudUserId, id));
        await assignRoles(transaction, roleRows, domain, id);
        await transaction.update(userAccountsTable).set({ role: primaryRole(parsed.data.roleCodes!) }).where(eq(userAccountsTable.id, current.legacyUserId));
      }
      return updated;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      response.status(404).json({ error: "NOT_FOUND", message: "User not found." });
      return;
    }
    if (error instanceof Error && error.message === "INVALID_SCOPE") {
      response.status(422).json({ error: "INVALID_SCOPE", message: "The selected customer, property, and store hierarchy is not valid." });
      return;
    }
    request.log.warn({ error }, "Could not update domain user");
    response.status(409).json({ error: "CONFLICT", message: "The user update could not be saved." });
    return;
  }
  if (!target) {
    response.status(404).json({ error: "NOT_FOUND", message: "User not found." });
    return;
  }
  const targetLegacyId = target.legacyUserId;
  const changedAccess = Boolean(
    parsed.data.roleCodes ||
    ("propertyIds" in parsed.data && parsed.data.propertyIds) ||
    ("storeIds" in parsed.data && parsed.data.storeIds),
  );
  await recordAuditEvent(status ? "USER_STATUS_CHANGED" : changedAccess ? "USER_ACCESS_CHANGED" : "USER_UPDATED", {
    actorUserId: request.currentUser!.id,
    targetUserId: targetLegacyId,
    metadata: { domain },
  });
  response.json(domain === "MOBILE" ? await mobileResponse(target as typeof mobileUsersTable.$inferSelect) : await cloudResponse(target as typeof cloudUsersTable.$inferSelect));
}

router.patch("/admin/mobile-users/:id", requireCloudAuth, requirePermission("MANAGE_USERS"), async (request: AuthenticatedRequest, response) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) { response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid user id." }); return; }
  await updateDomainUser(request, response, "MOBILE", id, request.body);
});
router.patch("/admin/cloud-users/:id", requireCloudAuth, requirePermission("MANAGE_USERS"), async (request: AuthenticatedRequest, response) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) { response.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid user id." }); return; }
  await updateDomainUser(request, response, "CLOUD", id, request.body);
});

async function resetDomainPassword(request: AuthenticatedRequest, response: import("express").Response, domain: Domain, id: number) {
  const temporaryPassword = generateTemporaryPassword();
  const [user] = domain === "MOBILE"
    ? await db.select().from(mobileUsersTable).where(eq(mobileUsersTable.id, id)).limit(1)
    : await db.select().from(cloudUsersTable).where(eq(cloudUsersTable.id, id)).limit(1);
  if (!user) { response.status(404).json({ error: "NOT_FOUND", message: "User not found." }); return; }
  if (domain === "MOBILE") {
    await db.transaction(async (transaction) => {
      await transaction.update(mobileUsersTable).set({ passwordHash: passwordDigest(temporaryPassword), status: "ACTIVE", mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null, passwordChangedAt: null, updatedAt: new Date() }).where(eq(mobileUsersTable.id, id));
      await transaction.update(userAccountsTable).set({ passwordHash: passwordDigest(temporaryPassword), updatedAt: new Date() }).where(eq(userAccountsTable.id, user.legacyUserId));
    });
  } else {
    await db.transaction(async (transaction) => {
      await transaction.update(cloudUsersTable).set({ passwordHash: passwordDigest(temporaryPassword), status: "ACTIVE", mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null, passwordChangedAt: null, updatedAt: new Date() }).where(eq(cloudUsersTable.id, id));
      await transaction.update(userAccountsTable).set({ passwordHash: passwordDigest(temporaryPassword), updatedAt: new Date() }).where(eq(userAccountsTable.id, user.legacyUserId));
    });
  }
  const notification = await sendCredentialNotification("RESET_CREDENTIALS", user, temporaryPassword, request.currentUser!.id);
  await recordAuditEvent("USER_PASSWORD_RESET", { actorUserId: request.currentUser!.id, targetUserId: user.legacyUserId, metadata: { domain, notificationStatus: notification.status } });
  response.json({ notification });
}

router.post("/admin/mobile-users/:id/reset-password", requireCloudAuth, requirePermission("RESET_USER_PASSWORD"), async (request: AuthenticatedRequest, response) => resetDomainPassword(request, response, "MOBILE", Number(request.params.id)));
router.post("/admin/cloud-users/:id/reset-password", requireCloudAuth, requirePermission("RESET_USER_PASSWORD"), async (request: AuthenticatedRequest, response) => resetDomainPassword(request, response, "CLOUD", Number(request.params.id)));
router.post("/admin/mobile-users/:id/resend-credentials", requireCloudAuth, requirePermission("RESET_USER_PASSWORD"), async (request: AuthenticatedRequest, response) => resetDomainPassword(request, response, "MOBILE", Number(request.params.id)));
router.post("/admin/cloud-users/:id/resend-credentials", requireCloudAuth, requirePermission("RESET_USER_PASSWORD"), async (request: AuthenticatedRequest, response) => resetDomainPassword(request, response, "CLOUD", Number(request.params.id)));

router.post("/auth/change-password", requireAuth, async (request: AuthenticatedRequest, response) => {
  const parsed = z.object({ currentPassword: z.string().min(1), newPassword: Password }).safeParse(request.body);
  if (!parsed.success || !request.currentUser) {
    response.status(400).json({ error: "VALIDATION_ERROR", message: parsed.success ? "Authentication is required." : parsed.error.message });
    return;
  }
  const identity = request.currentUser as AuthenticatedIdentity;
  if (identity.principalType === "CLOUD") {
    const [user] = await db.select().from(cloudUsersTable).where(eq(cloudUsersTable.id, identity.principalId)).limit(1);
    if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) { response.status(401).json({ error: "INVALID_PASSWORD", message: "The current password is incorrect." }); return; }
    await db.transaction(async (transaction) => {
      await transaction.update(cloudUsersTable).set({ passwordHash: passwordDigest(parsed.data.newPassword), mustChangePassword: false, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(cloudUsersTable.id, user.id));
      await transaction.update(userAccountsTable).set({ passwordHash: passwordDigest(parsed.data.newPassword), updatedAt: new Date() }).where(eq(userAccountsTable.id, user.legacyUserId));
    });
    await recordAuditEvent("USER_PASSWORD_CHANGED", { actorUserId: request.currentUser.id, targetUserId: user.legacyUserId, metadata: { domain: "CLOUD" } });
    response.json({ changed: true });
    return;
  }
  if (identity.principalType === "MOBILE") {
    const [user] = await db.select().from(mobileUsersTable).where(eq(mobileUsersTable.id, identity.principalId)).limit(1);
    if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) { response.status(401).json({ error: "INVALID_PASSWORD", message: "The current password is incorrect." }); return; }
    await db.transaction(async (transaction) => {
      await transaction.update(mobileUsersTable).set({ passwordHash: passwordDigest(parsed.data.newPassword), mustChangePassword: false, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(mobileUsersTable.id, user.id));
      await transaction.update(userAccountsTable).set({ passwordHash: passwordDigest(parsed.data.newPassword), updatedAt: new Date() }).where(eq(userAccountsTable.id, user.legacyUserId));
    });
    await recordAuditEvent("USER_PASSWORD_CHANGED", { actorUserId: request.currentUser.id, targetUserId: user.legacyUserId, metadata: { domain: "MOBILE" } });
    response.json({ changed: true });
    return;
  }
  response.status(400).json({ error: "UNSUPPORTED_IDENTITY", message: "A domain identity is required." });
});

export default router;