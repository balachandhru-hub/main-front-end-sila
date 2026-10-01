import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  cloudUsersTable,
  db,
  mobileUsersTable,
  userAccountsTable,
  type UserAccount,
  type UserSharePointLink,
} from "@workspace/db";

export const SESSION_COOKIE = "sila_session";
export const MOBILE_TOKEN_TTL_SECONDS = 28_800;
export const SUPPORTED_ROLES = [
  "SUPER_ADMIN",
  "CLOUD_SUPER_ADMIN",
  "MOBILE_SUPER_ADMIN",
  "CUSTOMER_SUPPORT_COORDINATOR",
  "CUSTOMER_MANAGER",
  "STORE_MANAGER",
  "INVENTORY_CONTROLLER",
  "PROCUREMENT_MANAGER",
  "FINANCE_MANAGER",
] as const;
export type SupportedRole = (typeof SUPPORTED_ROLES)[number];

const ROLE_ROUTES: Record<SupportedRole, string[]> = {
  SUPER_ADMIN: ["*"],
  CLOUD_SUPER_ADMIN: ["*"],
  MOBILE_SUPER_ADMIN: [
    "/",
    "/stores",
    "/transactions",
    "/approval-monitoring",
    "/materials",
    "/suppliers",
    "/audit",
  ],
  CUSTOMER_SUPPORT_COORDINATOR: [
    "/",
    "/customers",
    "/properties",
    "/stores",
    "/users",
    "/access",
    "/authentication",
    "/audit",
    "/readiness",
    "/setup-wizard",
  ],
  CUSTOMER_MANAGER: [
    "/",
    "/customers",
    "/properties",
    "/stores",
    "/users",
    "/access",
    "/readiness",
    "/setup-wizard",
  ],
  STORE_MANAGER: [
    "/",
    "/stores",
    "/transactions",
    "/approval-monitoring",
    "/materials",
    "/audit",
  ],
  INVENTORY_CONTROLLER: [
    "/",
    "/properties",
    "/stores",
    "/transactions",
    "/approval-monitoring",
    "/materials",
    "/audit",
  ],
  PROCUREMENT_MANAGER: [
    "/",
    "/customers",
    "/properties",
    "/transactions",
    "/approval-monitoring",
    "/delegations",
    "/suppliers",
    "/audit",
  ],
  FINANCE_MANAGER: [
    "/",
    "/customers",
    "/transactions",
    "/approval-monitoring",
    "/erp-errors",
    "/audit",
  ],
};

export type PrincipalType = "MOBILE" | "CLOUD" | "LEGACY";
export type AuthenticatedIdentity = UserAccount & {
  principalType: PrincipalType;
  principalId: number;
};

const sessionSecret = process.env.SESSION_SECRET ?? "";
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set to sign SILA Cloud sessions.");
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, digest] = storedHash.split(":");
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signedSession(userId: number, principalType: "CLOUD" | "LEGACY"): string {
  const payload = `${principalType === "CLOUD" ? "C" : "L"}${userId}`;
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function mobileTokenSecret(): string {
  const secret = process.env.MOBILE_TOKEN_SECRET ?? process.env.SESSION_SECRET ?? "";
  if (!secret) {
    throw new Error(
      "MOBILE_TOKEN_SECRET or SESSION_SECRET must be set to sign SILA mobile tokens.",
    );
  }
  return secret;
}

function mobileTokenSignature(payload: string): string {
  return createHmac("sha256", mobileTokenSecret())
    .update(payload)
    .digest("base64url");
}

export function issueMobileAccessToken(
  userId: number,
  principalType: "MOBILE" | "LEGACY" = "MOBILE",
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(userId),
      iat: now,
      exp: now + MOBILE_TOKEN_TTL_SECONDS,
      purpose: "sila-mobile-access",
      principal_type: principalType,
    }),
  ).toString("base64url");
  return `v1.${payload}.${mobileTokenSignature(payload)}`;
}

function userIdFromMobileToken(value: string): { id: number; principalType: PrincipalType } | null {
  const [version, payload, signature] = value.split(".");
  if (version !== "v1" || !payload || !signature) return null;
  const expected = mobileTokenSignature(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
      purpose?: unknown;
      principal_type?: unknown;
    };
    if (
      typeof parsed.sub !== "string" ||
      !/^\d+$/.test(parsed.sub) ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1000) ||
      parsed.purpose !== "sila-mobile-access"
    ) {
      return null;
    }
    const principalType =
      parsed.principal_type === "MOBILE" || parsed.principal_type === "LEGACY"
        ? parsed.principal_type
        : null;
    if (!principalType) return null;
    return { id: Number(parsed.sub), principalType };
  } catch {
    return null;
  }
}

function userIdFromSession(
  value: string | undefined,
): { id: number; principalType: PrincipalType } | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret).update(payload).digest("hex");
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (/^C\d+$/.test(payload)) return { id: Number(payload.slice(1)), principalType: "CLOUD" };
  if (/^L\d+$/.test(payload)) return { id: Number(payload.slice(1)), principalType: "LEGACY" };
  if (/^\d+$/.test(payload)) return { id: Number(payload), principalType: "LEGACY" };
  return null;
}

function cookieValue(request: Request): string | undefined {
  const cookieHeader = request.headers.cookie;
  const match = cookieHeader?.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
  );
  return match?.[1];
}

export async function userFromRequest(request: Request): Promise<AuthenticatedIdentity | null> {
  const authorization = request.headers.authorization;
  const bearerToken =
    authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined;
  const parsed = bearerToken
    ? userIdFromMobileToken(bearerToken)
    : userIdFromSession(cookieValue(request));
  if (parsed === null) return null;

  if (parsed.principalType === "MOBILE") {
    const [mobileUser] = await db
      .select()
      .from(mobileUsersTable)
      .where(eq(mobileUsersTable.id, parsed.id))
      .limit(1);
    if (!mobileUser || mobileUser.status.toUpperCase() !== "ACTIVE") return null;
    const [legacyUser] = await db
      .select()
      .from(userAccountsTable)
      .where(eq(userAccountsTable.id, mobileUser.legacyUserId))
      .limit(1);
    if (!legacyUser) return null;
    return Object.assign({}, legacyUser, {
      email: mobileUser.email,
      name: mobileUser.displayName,
      status: "Active",
      principalType: "MOBILE" as const,
      principalId: mobileUser.id,
    });
  }

  if (parsed.principalType === "CLOUD") {
    const [cloudUser] = await db
      .select()
      .from(cloudUsersTable)
      .where(eq(cloudUsersTable.id, parsed.id))
      .limit(1);
    if (!cloudUser || cloudUser.status.toUpperCase() !== "ACTIVE") return null;
    const [legacyUser] = await db
      .select()
      .from(userAccountsTable)
      .where(eq(userAccountsTable.id, cloudUser.legacyUserId))
      .limit(1);
    if (!legacyUser) return null;
    return Object.assign({}, legacyUser, {
      email: cloudUser.email,
      name: cloudUser.displayName,
      status: "Active",
      principalType: "CLOUD" as const,
      principalId: cloudUser.id,
    });
  }

  const [user] = await db
    .select()
    .from(userAccountsTable)
    .where(eq(userAccountsTable.id, parsed.id))
    .limit(1);
  return user?.status === "Active"
    ? Object.assign({}, user, {
        principalType: "LEGACY" as const,
        principalId: user.id,
      })
    : null;
}

export function authenticationChannel(request: Request): "MOBILE" | "WEB" {
  return request.headers.authorization?.startsWith("Bearer ") ? "MOBILE" : "WEB";
}

export function setSession(
  response: Response,
  userId: number,
  principalType: "CLOUD" | "LEGACY" = "LEGACY",
): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${signedSession(userId, principalType)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${secure}`,
  );
}

export function clearSession(response: Response): void {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

export function allowedRoutes(role: string): string[] {
  return ROLE_ROUTES[role as SupportedRole] ?? [];
}

export function canAccessRoute(role: string, route: string): boolean {
  const routes = allowedRoutes(role);
  return routes.includes("*") || routes.includes(route);
}

export function scopeLabel(user: Pick<UserAccount, "customerScope" | "propertyScope" | "storeScope">): string {
  if (user.customerScope === "*") return "All customers";
  if (user.propertyScope !== "*") {
    return `${user.propertyScope} / ${user.storeScope === "*" ? "All stores" : user.storeScope}`;
  }
  return `${user.customerScope} / All properties`;
}

export function isUserVisibleToCaller(
  caller: Pick<UserAccount, "customerScope" | "propertyScope" | "storeScope">,
  target: Pick<UserAccount, "customerScope" | "propertyScope" | "storeScope">,
): boolean {
  return (
    (caller.customerScope === "*" || target.customerScope === caller.customerScope) &&
    (caller.propertyScope === "*" || target.propertyScope === caller.propertyScope) &&
    (caller.storeScope === "*" || target.storeScope === caller.storeScope)
  );
}

export function publicUser(
  user: UserAccount & { mustChangePassword?: boolean },
  sharePointLink: UserSharePointLink | null = null,
) {
  return {
    id: user.id,
    code: user.code,
    email: user.email,
    name: user.name,
    authProvider: user.authProvider,
    role: user.role,
    customerScope: user.customerScope,
    propertyScope: user.propertyScope,
    storeScope: user.storeScope,
    scope: scopeLabel(user),
    lastLoginAt: user.lastLoginAt,
    status: user.status,
    mustChangePassword: user.mustChangePassword ?? false,
    sharePointLink: sharePointLink
      ? {
          siteUrl: sharePointLink.siteUrl,
          folderPath: sharePointLink.folderPath,
          folderUrl: sharePointLink.folderUrl,
          status: sharePointLink.status,
          verificationMessage: sharePointLink.verificationMessage,
          lastVerifiedAt: sharePointLink.lastVerifiedAt,
        }
      : null,
  };
}

export function passwordDigest(password: string): string {
  return hashPassword(password);
}