import { and, eq, inArray } from "drizzle-orm";
import {
  cloudUserRolesTable,
  mobileUserPropertyAccessTable,
  mobileUserRolesTable,
  mobileUserStoreAccessTable,
  mobileUsersTable,
  customersTable,
  db,
  permissionsTable,
  propertiesTable,
  rolePermissionsTable,
  rolesTable,
  storesTable,
  userCustomerAccessTable,
  userPropertyAccessTable,
  userRolesTable,
  userStoreAccessTable,
  type Customer,
  type Property,
  type Store,
  type UserAccount,
} from "@workspace/db";

export type AuthContext = {
  userId: number;
  customerId: number | null;
  propertyIds: number[];
  storeIds: number[];
  roles: string[];
  permissions: string[];
  user: UserAccount;
  customers: Customer[];
  properties: Property[];
  stores: Store[];
};

const legacyRolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: [
    "MANAGE_USERS",
    "CREATE_MOBILE_USER",
    "CREATE_CLOUD_USER",
    "RESET_USER_PASSWORD",
    "MANAGE_ROLES",
    "MANAGE_CONFIGURATION",
    "MANAGE_ORGANIZATION",
    "VIEW_MATERIALS",
    "MANAGE_MATERIALS",
    "VIEW_SUPPLIERS",
    "MANAGE_SUPPLIERS",
    "VIEW_AUDIT",
    "RECEIVE_GOODS",
    "COUNT_INVENTORY",
    "TRANSFER_STOCK",
    "ISSUE_GOODS",
    "WRITE_OFF_STOCK",
    "SCAN_DOCUMENT",
    "APPROVE_TRANSACTIONS",
  ],
  CUSTOMER_SUPPORT_COORDINATOR: [
    "MANAGE_USERS",
    "MANAGE_CONFIGURATION",
    "MANAGE_ORGANIZATION",
    "VIEW_AUDIT",
    "VIEW_MATERIALS",
    "VIEW_SUPPLIERS",
  ],
  CUSTOMER_MANAGER: [
    "MANAGE_CONFIGURATION",
    "MANAGE_ORGANIZATION",
    "VIEW_MATERIALS",
    "MANAGE_MATERIALS",
    "VIEW_SUPPLIERS",
    "MANAGE_SUPPLIERS",
  ],
  STORE_MANAGER: ["RECEIVE_GOODS", "COUNT_INVENTORY", "APPROVE_TRANSACTIONS"],
  INVENTORY_CONTROLLER: [
    "COUNT_INVENTORY",
    "TRANSFER_STOCK",
    "WRITE_OFF_STOCK",
    "VIEW_MATERIALS",
  ],
  PROCUREMENT_MANAGER: [
    "RECEIVE_GOODS",
    "APPROVE_TRANSACTIONS",
    "VIEW_MATERIALS",
    "VIEW_SUPPLIERS",
  ],
  FINANCE_MANAGER: ["VIEW_AUDIT", "APPROVE_TRANSACTIONS"],
};

legacyRolePermissions.CLOUD_SUPER_ADMIN = legacyRolePermissions.SUPER_ADMIN;
legacyRolePermissions.MOBILE_SUPER_ADMIN = legacyRolePermissions.SUPER_ADMIN;

function active(status: string): boolean {
  return status.toUpperCase() === "ACTIVE";
}

export async function resolveAuthContext(user: UserAccount): Promise<AuthContext> {
  const identity = user as UserAccount & {
    principalType?: "MOBILE" | "CLOUD" | "LEGACY";
    principalId?: number;
  };
  const isMobilePrincipal =
    identity.principalType === "MOBILE" && identity.principalId !== undefined;
  const isCloudPrincipal =
    identity.principalType === "CLOUD" && identity.principalId !== undefined;
  const [allCustomers, allProperties, allStores, roleRows, customerAccess, propertyAccess, storeAccess] =
    await Promise.all([
      db.select().from(customersTable),
      db.select().from(propertiesTable),
      db.select().from(storesTable),
      isMobilePrincipal
        ? db
            .select({ id: rolesTable.id, code: rolesTable.code })
            .from(mobileUserRolesTable)
            .innerJoin(rolesTable, eq(mobileUserRolesTable.roleId, rolesTable.id))
            .where(
              and(
                eq(mobileUserRolesTable.mobileUserId, identity.principalId!),
                eq(rolesTable.status, "Active"),
              ),
            )
        : isCloudPrincipal
          ? db
            .select({ id: rolesTable.id, code: rolesTable.code })
            .from(cloudUserRolesTable)
            .innerJoin(rolesTable, eq(cloudUserRolesTable.roleId, rolesTable.id))
            .where(
              and(
                eq(cloudUserRolesTable.cloudUserId, identity.principalId!),
                eq(rolesTable.status, "Active"),
              ),
            )
          : db
            .select({ id: rolesTable.id, code: rolesTable.code })
            .from(userRolesTable)
            .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
            .where(and(eq(userRolesTable.userId, user.id), eq(rolesTable.status, "Active"))),
      isMobilePrincipal
        ? db
            .select({ customerId: mobileUsersTable.customerId })
            .from(mobileUsersTable)
            .where(eq(mobileUsersTable.id, identity.principalId!))
        : db
            .select({ customerId: userCustomerAccessTable.customerId })
            .from(userCustomerAccessTable)
            .where(eq(userCustomerAccessTable.userId, user.id)),
      isMobilePrincipal
        ? db
            .select({ propertyId: mobileUserPropertyAccessTable.propertyId })
            .from(mobileUserPropertyAccessTable)
            .where(eq(mobileUserPropertyAccessTable.mobileUserId, identity.principalId!))
        : db
            .select({ propertyId: userPropertyAccessTable.propertyId })
            .from(userPropertyAccessTable)
            .where(eq(userPropertyAccessTable.userId, user.id)),
      isMobilePrincipal
        ? db
            .select({ storeId: mobileUserStoreAccessTable.storeId })
            .from(mobileUserStoreAccessTable)
            .where(eq(mobileUserStoreAccessTable.mobileUserId, identity.principalId!))
        : db
            .select({ storeId: userStoreAccessTable.storeId })
            .from(userStoreAccessTable)
            .where(eq(userStoreAccessTable.userId, user.id)),
    ]);

  const activeCustomers = allCustomers.filter((customer) => active(customer.status));
  const customerIds =
    isCloudPrincipal
      ? new Set(activeCustomers.map((customer) => customer.id))
      : isMobilePrincipal || user.accessModel === "Explicit"
      ? new Set(customerAccess.map((entry) => entry.customerId))
      : new Set(
          activeCustomers
            .filter(
              (customer) =>
                user.customerScope === "*" || customer.code === user.customerScope,
            )
            .map((customer) => customer.id),
        );
  const customers = activeCustomers.filter((customer) => customerIds.has(customer.id));

  const activeProperties = allProperties.filter(
    (property) => active(property.status) && customerIds.has(property.customerId),
  );
  const propertyIds =
    isCloudPrincipal
      ? new Set(activeProperties.map((property) => property.id))
      : isMobilePrincipal || user.accessModel === "Explicit"
      ? new Set(propertyAccess.map((entry) => entry.propertyId))
      : new Set(
          activeProperties
            .filter(
              (property) =>
                user.propertyScope === "*" || property.code === user.propertyScope,
            )
            .map((property) => property.id),
        );
  const properties = activeProperties.filter((property) => propertyIds.has(property.id));

  const activeStores = allStores.filter(
    (store) => active(store.status) && propertyIds.has(store.propertyId),
  );
  const storeIds =
    isCloudPrincipal
      ? new Set(activeStores.map((store) => store.id))
      : isMobilePrincipal || user.accessModel === "Explicit"
      ? new Set(storeAccess.map((entry) => entry.storeId))
      : new Set(
          activeStores
            .filter(
              (store) => user.storeScope === "*" || store.code === user.storeScope,
            )
            .map((store) => store.id),
        );
  const stores = activeStores.filter((store) => storeIds.has(store.id));

  const roles = roleRows.length > 0 ? roleRows.map((role) => role.code) : [user.role];
  const roleIds = roleRows.map((role) => role.id);
  const permissionRows =
    roleIds.length === 0
      ? []
      : await db
          .select({ code: permissionsTable.code })
          .from(rolePermissionsTable)
          .innerJoin(
            permissionsTable,
            eq(rolePermissionsTable.permissionId, permissionsTable.id),
          )
          .where(inArray(rolePermissionsTable.roleId, roleIds));

  return {
    userId: user.id,
    customerId: customers.length === 1 ? customers[0].id : null,
    propertyIds: properties.map((property) => property.id),
    storeIds: stores.map((store) => store.id),
    roles: [...new Set(roles)],
    permissions: [
      ...new Set(
        permissionRows.length > 0
          ? permissionRows.map((permission) => permission.code)
          : roles.flatMap((role) => legacyRolePermissions[role] ?? []),
      ),
    ],
    user,
    customers,
    properties,
    stores,
  };
}