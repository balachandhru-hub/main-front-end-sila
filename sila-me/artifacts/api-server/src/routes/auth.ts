import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  cloudUsersTable,
  db,
  mobileUsersTable,
  cloudUserRolesTable,
  mobileUserRolesTable,
  rolesTable,
  userAccountsTable,
  type CloudUser,
  type MobileUser,
} from "@workspace/db";
import {
  GetSessionResponse,
  GetMeResponse,
  MobileLoginBody,
  MobileLoginResponse,
  SignInBody,
  SignInResponse,
} from "@workspace/api-zod";
import {
  allowedRoutes,
  clearSession,
  issueMobileAccessToken,
  MOBILE_TOKEN_TTL_SECONDS,
  publicUser,
  setSession,
  userFromRequest,
  verifyPassword,
  type AuthenticatedIdentity,
} from "../lib/access";
import { resolveAuthContext } from "../lib/auth-context";
import { recordAuditEvent } from "../lib/audit";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();
const mobileLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const MOBILE_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MOBILE_LOGIN_LIMIT = 10;

async function localUser(email: string) {
  const [user] = await db
    .select()
    .from(userAccountsTable)
    .where(
      and(
        eq(userAccountsTable.email, email.trim().toLowerCase()),
        eq(userAccountsTable.authProvider, "SILA Local Login"),
      ),
    )
    .limit(1);
  return user;
}

async function mobileUser(email: string): Promise<MobileUser | undefined> {
  const [user] = await db
    .select()
    .from(mobileUsersTable)
    .where(eq(mobileUsersTable.email, email.trim().toLowerCase()))
    .limit(1);
  return user;
}

async function cloudUser(email: string): Promise<CloudUser | undefined> {
  const [user] = await db
    .select()
    .from(cloudUsersTable)
    .where(eq(cloudUsersTable.email, email.trim().toLowerCase()))
    .limit(1);
  return user;
}

async function domainProjection(
  legacyUserId: number,
  domain: { email: string; displayName: string; status: string; role: string; mustChangePassword?: boolean },
  principalType: "MOBILE" | "CLOUD",
  principalId: number,
): Promise<AuthenticatedIdentity | null> {
  const [legacyUser] = await db
    .select()
    .from(userAccountsTable)
    .where(eq(userAccountsTable.id, legacyUserId))
    .limit(1);
  if (!legacyUser) return null;
  return Object.assign({}, legacyUser, {
    email: domain.email,
    name: domain.displayName,
    role: domain.role,
    mustChangePassword: domain.mustChangePassword ?? false,
    status: domain.status.toUpperCase() === "ACTIVE" ? "Active" : domain.status,
    principalType,
    principalId,
  });
}

async function domainPrimaryRole(principalType: "MOBILE" | "CLOUD", principalId: number): Promise<string> {
  const rows = principalType === "MOBILE"
    ? await db
        .select({ code: rolesTable.code })
        .from(mobileUserRolesTable)
        .innerJoin(rolesTable, eq(mobileUserRolesTable.roleId, rolesTable.id))
        .where(and(eq(mobileUserRolesTable.mobileUserId, principalId), eq(rolesTable.status, "Active")))
        .limit(1)
    : await db
        .select({ code: rolesTable.code })
        .from(cloudUserRolesTable)
        .innerJoin(rolesTable, eq(cloudUserRolesTable.roleId, rolesTable.id))
        .where(and(eq(cloudUserRolesTable.cloudUserId, principalId), eq(rolesTable.status, "Active")))
        .limit(1);
  return rows[0]?.code ?? (principalType === "MOBILE" ? "MOBILE_SUPER_ADMIN" : "CLOUD_SUPER_ADMIN");
}

function mobileRateLimitKey(request: AuthenticatedRequest, email: string): string {
  return `${request.ip ?? "unknown"}:${email.trim().toLowerCase()}`;
}

function mobileLoginLimited(key: string): boolean {
  const now = Date.now();
  const current = mobileLoginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    mobileLoginAttempts.set(key, { count: 0, resetAt: now + MOBILE_LOGIN_WINDOW_MS });
    return false;
  }
  return current.count >= MOBILE_LOGIN_LIMIT;
}

function recordMobileLoginFailure(key: string): void {
  const current = mobileLoginAttempts.get(key);
  if (current) current.count += 1;
}

router.post("/auth/sign-in", async (request, response): Promise<void> => {
  const parsed = SignInBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "A valid email and password are required." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const cloud = await cloudUser(email);
  if (cloud) {
    if (
      cloud.status.toUpperCase() !== "ACTIVE" ||
      !verifyPassword(parsed.data.password, cloud.passwordHash)
    ) {
      await recordAuditEvent("WEB_LOGIN_FAILED", {
        targetUserId: cloud.legacyUserId,
        metadata: { email },
      });
      response.status(401).json({ error: "Invalid credentials or suspended account." });
      return;
    }
    const identity = await domainProjection(
      cloud.legacyUserId,
      {
        email: cloud.email,
        displayName: cloud.displayName,
        status: cloud.status,
        role: await domainPrimaryRole("CLOUD", cloud.id),
        mustChangePassword: cloud.mustChangePassword,
      },
      "CLOUD",
      cloud.id,
    );
    if (!identity) {
      response.status(500).json({ error: "CLOUD_IDENTITY_NOT_READY" });
      return;
    }
    await db
      .update(cloudUsersTable)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(cloudUsersTable.id, cloud.id));
    setSession(response, cloud.id, "CLOUD");
    await recordAuditEvent("WEB_LOGIN_SUCCESS", { actorUserId: identity.id });
    response.json(
      SignInResponse.parse({
        user: publicUser(identity),
        allowedRoutes: allowedRoutes(identity.role),
      }),
    );
    return;
  }
  if (await mobileUser(email)) {
    await recordAuditEvent("WEB_LOGIN_FAILED", { metadata: { email, reason: "MOBILE_USER" } });
    response.status(401).json({ error: "Invalid credentials or suspended account." });
    return;
  }
  const user = await localUser(email);

  if (!user || user.status !== "Active" || !verifyPassword(parsed.data.password, user.passwordHash)) {
    await recordAuditEvent("WEB_LOGIN_FAILED", {
      targetUserId: user?.id,
      metadata: { email },
    });
    response.status(401).json({ error: "Invalid credentials or suspended account." });
    return;
  }

  const [updatedUser] = await db
    .update(userAccountsTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(userAccountsTable.id, user.id))
    .returning();
  const session = { user: publicUser(updatedUser ?? user), allowedRoutes: allowedRoutes(user.role) };
  setSession(response, user.id, "LEGACY");
  await recordAuditEvent("WEB_LOGIN_SUCCESS", { actorUserId: user.id });
  response.json(SignInResponse.parse(session));
});

router.post(
  "/auth/mobile/login",
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const requestBody =
      request.body && typeof request.body === "object"
        ? {
            ...request.body,
            email:
              typeof request.body.email === "string"
                ? request.body.email.trim()
                : request.body.email,
          }
        : request.body;
    const parsed = MobileLoginBody.safeParse(requestBody);
    if (!parsed.success) {
      response.status(400).json({
        error: "VALIDATION_ERROR",
        message: "A valid email and password are required.",
      });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const rateLimitKey = mobileRateLimitKey(request, email);
    if (mobileLoginLimited(rateLimitKey)) {
      await recordAuditEvent("MOBILE_LOGIN_FAILED", {
        metadata: { email, reason: "RATE_LIMITED" },
      });
      response.status(429).json({
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many login attempts. Try again later.",
      });
      return;
    }

    const mobile = await mobileUser(email);
    const now = new Date();
    const failureReason = !mobile
      ? "USER_NOT_FOUND"
      : mobile.lockedUntil && mobile.lockedUntil > now
        ? "USER_LOCKED"
        : mobile.status.toUpperCase() === "SUSPENDED"
          ? "USER_SUSPENDED"
          : mobile.status.toUpperCase() !== "ACTIVE"
            ? "USER_INACTIVE"
            : "PASSWORD_MISMATCH";
    if (
      !mobile ||
      (mobile.lockedUntil && mobile.lockedUntil > now) ||
      mobile.status.toUpperCase() !== "ACTIVE" ||
      !verifyPassword(parsed.data.password, mobile.passwordHash)
    ) {
      recordMobileLoginFailure(rateLimitKey);
      await recordAuditEvent("MOBILE_LOGIN_FAILED", {
        targetUserId: mobile?.legacyUserId,
        metadata: { email, reason: failureReason },
      });
      response.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid credentials or suspended account.",
      });
      return;
    }

    mobileLoginAttempts.delete(rateLimitKey);
    const identity = await domainProjection(
      mobile.legacyUserId,
      {
        email: mobile.email,
        displayName: mobile.displayName,
        status: mobile.status,
        role: await domainPrimaryRole("MOBILE", mobile.id),
        mustChangePassword: mobile.mustChangePassword,
      },
      "MOBILE",
      mobile.id,
    );
    if (!identity) {
      response.status(500).json({
        error: "MOBILE_IDENTITY_NOT_READY",
        message: "The mobile identity is not linked to an application actor.",
      });
      return;
    }
    await db
      .update(mobileUsersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(mobileUsersTable.id, mobile.id));
    await recordAuditEvent("MOBILE_LOGIN_SUCCESS", { actorUserId: identity.id });
    response.json(
      MobileLoginResponse.parse({
        accessToken: issueMobileAccessToken(mobile.id, "MOBILE"),
        tokenType: "Bearer",
        expiresIn: MOBILE_TOKEN_TTL_SECONDS,
        mustChangePassword: mobile.mustChangePassword,
        user: {
          id: identity.id,
          name: identity.name,
          email: identity.email,
        },
      }),
    );
  },
);

router.get(
  "/auth/session",
  requireAuth,
  (request: AuthenticatedRequest, response): void => {
    const user = request.currentUser!;
    response.json(
      GetSessionResponse.parse({
        user: publicUser(user),
        allowedRoutes: allowedRoutes(user.role),
      }),
    );
  },
);

router.get(
  "/me",
  requireAuth,
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const context = await resolveAuthContext(request.currentUser!);
    response.json(
      GetMeResponse.parse({
        user: {
          id: context.user.id,
          name: context.user.name,
          email: context.user.email,
          status: "ACTIVE",
        },
        userType:
          (context.user as AuthenticatedIdentity).principalType === "MOBILE"
            ? "MOBILE"
            : "CLOUD",
        customer:
          context.customers.length === 1
            ? {
                id: context.customers[0].id,
                code: context.customers[0].code,
                name: context.customers[0].name,
              }
            : null,
        properties: context.properties.map(({ id, code, name }) => ({
          id,
          code,
          name,
        })),
        stores: context.stores.map(({ id, code, name, propertyId }) => ({
          id,
          code,
          name,
          propertyId,
        })),
        roles: context.roles,
        permissions: context.permissions,
      }),
    );
  },
);

router.post("/auth/sign-out", async (request, response): Promise<void> => {
  const user = await userFromRequest(request);
  if (user) await recordAuditEvent("LOGOUT", { actorUserId: user.id });
  clearSession(response);
  response.sendStatus(204);
});

export default router;