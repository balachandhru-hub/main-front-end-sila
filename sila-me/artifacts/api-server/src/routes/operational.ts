import { Router, type IRouter } from "express";
import { desc, inArray } from "drizzle-orm";
import {
  auditEventsTable,
  customersTable,
  db,
  storesTable,
  userAccountsTable,
  type Customer,
  type Store,
} from "@workspace/db";
import { resolveAuthContext } from "../lib/auth-context";
import {
  requireAuth,
  requireOperationalAccess,
  type AuthenticatedRequest,
  type OperationalAccessPolicy,
  type OperationalScope,
} from "../middlewares/auth";

const router: IRouter = Router();

export const operationalPolicies = {
  transactions: {
    surface: "transactions",
    allowedRoles: [
      "SUPER_ADMIN",
      "STORE_MANAGER",
      "INVENTORY_CONTROLLER",
      "PROCUREMENT_MANAGER",
      "FINANCE_MANAGER",
    ],
    scope: "store",
  },
  "approval-monitoring": {
    surface: "approval-monitoring",
    allowedRoles: [
      "SUPER_ADMIN",
      "STORE_MANAGER",
      "INVENTORY_CONTROLLER",
      "PROCUREMENT_MANAGER",
      "FINANCE_MANAGER",
    ],
    scope: "store",
  },
  materials: {
    surface: "materials",
    allowedRoles: ["SUPER_ADMIN", "STORE_MANAGER", "INVENTORY_CONTROLLER"],
    scope: "store",
  },
  audit: {
    surface: "audit",
    allowedRoles: [
      "SUPER_ADMIN",
      "CUSTOMER_SUPPORT_COORDINATOR",
      "STORE_MANAGER",
      "INVENTORY_CONTROLLER",
      "PROCUREMENT_MANAGER",
      "FINANCE_MANAGER",
    ],
    scope: "customer",
  },
  "erp-errors": {
    surface: "erp-errors",
    allowedRoles: ["SUPER_ADMIN", "FINANCE_MANAGER"],
    scope: "customer",
  },
  "integration-monitoring": {
    surface: "integration-monitoring",
    allowedRoles: ["SUPER_ADMIN"],
    scope: "customer",
  },
  readiness: {
    surface: "readiness",
    allowedRoles: ["SUPER_ADMIN", "CUSTOMER_SUPPORT_COORDINATOR", "CUSTOMER_MANAGER"],
    scope: "customer",
  },
} as const satisfies Record<string, OperationalAccessPolicy>;

type ScopeResponse = {
  customerIds: number[];
  propertyIds: number[];
  storeIds: number[];
};

function scopeResponse(scope: OperationalScope): ScopeResponse {
  return {
    customerIds: scope.customerIds,
    propertyIds: scope.propertyIds,
    storeIds: scope.storeIds,
  };
}

function customerResponse(customer: Customer) {
  return {
    id: customer.id,
    code: customer.code,
    name: customer.name,
    status: customer.status,
  };
}

function storeResponse(store: Store) {
  return {
    id: store.id,
    propertyId: store.propertyId,
    code: store.code,
    name: store.name,
    status: store.status,
  };
}

async function scopedCustomers(scope: OperationalScope): Promise<ReturnType<typeof customerResponse>[]> {
  const rows = await db
    .select()
    .from(customersTable)
    .where(inArray(customersTable.id, scope.customerIds));
  return rows.map(customerResponse).sort((left, right) => left.code.localeCompare(right.code));
}

async function scopedStores(scope: OperationalScope): Promise<ReturnType<typeof storeResponse>[]> {
  const rows = await db
    .select()
    .from(storesTable)
    .where(inArray(storesTable.id, scope.storeIds));
  return rows.map(storeResponse).sort((left, right) => left.code.localeCompare(right.code));
}

async function visibleAuditUserIds(request: AuthenticatedRequest): Promise<number[]> {
  const context = request.authContext!;
  const users = await db.select().from(userAccountsTable);
  const visible: number[] = [];

  for (const user of users) {
    if (user.id === request.currentUser!.id) {
      visible.push(user.id);
      continue;
    }
    const userContext = await resolveAuthContext(user);
    if (
      userContext.customers.some(({ id }) => context.customers.some((customer) => customer.id === id)) ||
      userContext.properties.some(({ id }) => context.propertyIds.includes(id)) ||
      userContext.stores.some(({ id }) => context.storeIds.includes(id))
    ) {
      visible.push(user.id);
    }
  }
  return visible;
}

router.get(
  "/transactions",
  requireAuth,
  requireOperationalAccess(operationalPolicies.transactions),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json({
      surface: "transactions",
      scope: scopeResponse(request.operationalScope!),
      records: await scopedStores(request.operationalScope!),
    });
  },
);

router.get(
  "/approval-monitoring",
  requireAuth,
  requireOperationalAccess(operationalPolicies["approval-monitoring"]),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json({
      surface: "approval-monitoring",
      scope: scopeResponse(request.operationalScope!),
      records: await scopedStores(request.operationalScope!),
    });
  },
);

router.get(
  "/materials",
  requireAuth,
  requireOperationalAccess(operationalPolicies.materials),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json({
      surface: "materials",
      scope: scopeResponse(request.operationalScope!),
      records: await scopedStores(request.operationalScope!),
    });
  },
);

router.get(
  "/readiness",
  requireAuth,
  requireOperationalAccess(operationalPolicies.readiness),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json({
      surface: "readiness",
      scope: scopeResponse(request.operationalScope!),
      records: await scopedCustomers(request.operationalScope!),
    });
  },
);

router.get(
  "/integration-monitoring",
  requireAuth,
  requireOperationalAccess(operationalPolicies["integration-monitoring"]),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json({
      surface: "integration-monitoring",
      scope: scopeResponse(request.operationalScope!),
      records: await scopedCustomers(request.operationalScope!),
    });
  },
);

router.get(
  "/erp-errors",
  requireAuth,
  requireOperationalAccess(operationalPolicies["erp-errors"]),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    response.json({
      surface: "erp-errors",
      scope: scopeResponse(request.operationalScope!),
      records: await scopedCustomers(request.operationalScope!),
    });
  },
);

router.get(
  "/audit",
  requireAuth,
  requireOperationalAccess(operationalPolicies.audit),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const visibleUserIds = await visibleAuditUserIds(request);
    const events = await db
      .select()
      .from(auditEventsTable)
      .orderBy(desc(auditEventsTable.createdAt))
      .limit(100);
    const records = events
      .filter(
        (event) =>
          (event.actorUserId !== null && visibleUserIds.includes(event.actorUserId)) ||
          (event.targetUserId !== null && visibleUserIds.includes(event.targetUserId)),
      )
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        actorUserId: event.actorUserId,
        targetUserId: event.targetUserId,
        metadata: event.metadata,
        createdAt: event.createdAt,
      }));

    response.json({
      surface: "audit",
      scope: scopeResponse(request.operationalScope!),
      records,
    });
  },
);

export default router;