import type { NextFunction, Request, Response } from "express";
import type { UserAccount } from "@workspace/db";
import {
  authenticationChannel,
  userFromRequest,
  type AuthenticatedIdentity,
} from "../lib/access";
import { resolveAuthContext, type AuthContext } from "../lib/auth-context";
import { recordAuditEvent } from "../lib/audit";

export type AuthenticatedRequest = Request & {
  currentUser?: UserAccount;
  authContext?: AuthContext;
  authChannel?: "WEB" | "MOBILE";
  operationalScope?: OperationalScope;
};

export type OperationalSurface =
  | "transactions"
  | "approval-monitoring"
  | "materials"
  | "audit"
  | "erp-errors"
  | "integration-monitoring"
  | "readiness";

export type OperationalScope = {
  customerIds: number[];
  propertyIds: number[];
  storeIds: number[];
};

export type OperationalAccessPolicy = {
  surface: OperationalSurface;
  allowedRoles: readonly string[];
  scope: "customer" | "property" | "store";
};

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const user = await userFromRequest(request);
  if (!user) {
    response.status(401).json({
      error: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required or has expired.",
    });
    return;
  }
  request.currentUser = user;
  request.authChannel = authenticationChannel(request);
  next();
}

export async function requireMobileAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(request, response, () => undefined);
  if (!request.currentUser) return;
  if (
    request.authChannel !== "MOBILE" ||
    (request.currentUser as AuthenticatedIdentity).principalType === "CLOUD"
  ) {
    response.status(401).json({
      error: "MOBILE_AUTHENTICATION_REQUIRED",
      message: "A SILA Store mobile identity is required.",
    });
    return;
  }
  next();
}

export async function requireCloudAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(request, response, () => undefined);
  if (!request.currentUser) return;
  if (
    (request.currentUser as AuthenticatedIdentity).principalType === "MOBILE"
  ) {
    response.status(401).json({
      error: "CLOUD_AUTHENTICATION_REQUIRED",
      message: "A SILA Cloud identity is required.",
    });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void => {
    if (!request.currentUser || !roles.includes(request.currentUser.role)) {
      response.status(403).json({ error: "Your role cannot perform this action." });
      return;
    }
    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return async (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!request.currentUser) {
      response.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required or has expired.",
      });
      return;
    }

    const context = await resolveAuthContext(request.currentUser);
    request.authContext = context;
    if (!permissions.some((permission) => context.permissions.includes(permission))) {
      await recordAuditEvent("ACCESS_DENIED", {
        actorUserId: request.currentUser.id,
        metadata: { path: request.path, requiredPermissions: permissions },
      });
      response.status(403).json({
        error: "ACCESS_DENIED",
        message: "You do not have permission to perform this action.",
      });
      return;
    }
    next();
  };
}

function requestedScopeIds(request: Request): {
  customerId?: number;
  propertyId?: number;
  storeId?: number;
} | null {
  const values = ["customerId", "propertyId", "storeId"] as const;
  const parsed: {
    customerId?: number;
    propertyId?: number;
    storeId?: number;
  } = {};

  for (const value of values) {
    const raw = request.query[value];
    if (raw === undefined) continue;
    if (typeof raw !== "string" || !/^\d+$/.test(raw) || Number(raw) <= 0) return null;
    parsed[value] = Number(raw);
  }
  return parsed;
}

function scopedOperationalIds(
  context: AuthContext,
  requested: {
    customerId?: number;
    propertyId?: number;
    storeId?: number;
  },
): OperationalScope | null {
  const customerIds = requested.customerId
    ? context.customers.some(({ id }) => id === requested.customerId)
      ? [requested.customerId]
      : null
    : context.customers.map(({ id }) => id);
  if (!customerIds) return null;

  const propertyIds = context.properties
    .filter(
      ({ id, customerId }) =>
        customerIds!.includes(customerId) &&
        (requested.propertyId === undefined || requested.propertyId === id),
    )
    .map(({ id }) => id);
  if (requested.propertyId !== undefined && !propertyIds.includes(requested.propertyId)) {
    return null;
  }

  const storeIds = context.stores
    .filter(
      ({ id, propertyId }) =>
        propertyIds.includes(propertyId) &&
        (requested.storeId === undefined || requested.storeId === id),
    )
    .map(({ id }) => id);
  if (requested.storeId !== undefined && !storeIds.includes(requested.storeId)) {
    return null;
  }

  return { customerIds, propertyIds, storeIds };
}

function operationalDeniedMetadata(
  request: AuthenticatedRequest,
  policy: OperationalAccessPolicy,
  reason: string,
  requestedScope: unknown,
): Record<string, unknown> {
  return {
    path: request.path,
    surface: policy.surface,
    reason,
    allowedRoles: policy.allowedRoles,
    requestedScope,
  };
}

export function requireOperationalAccess(policy: OperationalAccessPolicy) {
  return async (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!request.currentUser) {
      response.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required or has expired.",
      });
      return;
    }

    const requested = requestedScopeIds(request);
    if (requested === null) {
      await recordAuditEvent("ACCESS_DENIED", {
        actorUserId: request.currentUser.id,
        metadata: operationalDeniedMetadata(
          request,
          policy,
          "INVALID_SCOPE_QUERY",
          request.query,
        ),
      });
      response.status(403).json({
        error: "ACCESS_DENIED",
        message: "The requested organization scope is invalid.",
      });
      return;
    }

    if (!policy.allowedRoles.includes(request.currentUser.role)) {
      await recordAuditEvent("ACCESS_DENIED", {
        actorUserId: request.currentUser.id,
        metadata: operationalDeniedMetadata(
          request,
          policy,
          "ROLE_NOT_ALLOWED",
          requested,
        ),
      });
      response.status(403).json({
        error: "ACCESS_DENIED",
        message: "Your role cannot access this operational surface.",
      });
      return;
    }

    const context = await resolveAuthContext(request.currentUser);
    const scope = scopedOperationalIds(context, requested);
    if (!scope) {
      await recordAuditEvent("ACCESS_DENIED", {
        actorUserId: request.currentUser.id,
        metadata: operationalDeniedMetadata(
          request,
          policy,
          "SCOPE_OUTSIDE_AUTHORIZED_TENANT",
          requested,
        ),
      });
      response.status(403).json({
        error: "ACCESS_DENIED",
        message: "You do not have access to the requested organization scope.",
      });
      return;
    }

    request.authContext = context;
    request.operationalScope = scope;
    await recordAuditEvent("OPERATIONAL_SCOPE_GRANTED", {
      actorUserId: request.currentUser.id,
      metadata: {
        path: request.path,
        surface: policy.surface,
        scopeType: policy.scope,
        requestedScope: requested,
        effectiveScope: scope,
      },
    });
    next();
  };
}