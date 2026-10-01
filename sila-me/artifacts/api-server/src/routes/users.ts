import { Router, type IRouter } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import {
  db,
  rolesTable,
  userAccountsTable,
  userSharePointLinksTable,
  userRolesTable,
} from "@workspace/db";
import {
  CreateUserBody,
  CreateUserResponse,
  ListUsersResponse,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
} from "@workspace/api-zod";
import {
  isUserVisibleToCaller,
  passwordDigest,
  publicUser,
  SUPPORTED_ROLES,
} from "../lib/access";
import { recordAuditEvent } from "../lib/audit";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();
const supportedRoleSet = new Set<string>(SUPPORTED_ROLES);
const supportedStatuses = new Set(["Active", "Suspended"]);

type SharePointLinkInput = {
  sharePointSiteUrl?: string | null;
  sharePointFolderPath?: string | null;
  sharePointFolderUrl?: string | null;
};

function parseSharePointLink(
  input: SharePointLinkInput,
):
  | {
      siteUrl: string;
      folderPath: string;
      folderUrl: string | null;
    }
  | { error: string }
  | null {
  const siteUrl = input.sharePointSiteUrl?.trim() ?? "";
  const folderPath = input.sharePointFolderPath?.trim() ?? "";
  const folderUrl = input.sharePointFolderUrl?.trim() ?? "";
  const hasAnyValue = Boolean(siteUrl || folderPath || folderUrl);
  if (!hasAnyValue) return null;
  if (!siteUrl || !folderPath) {
    return { error: "SharePoint site URL and folder path are both required." };
  }
  try {
    const parsedSite = new URL(siteUrl);
    if (parsedSite.protocol !== "https:") {
      return { error: "SharePoint site URL must use HTTPS." };
    }
    if (parsedSite.pathname.includes("/:f:/") || parsedSite.pathname.includes("/personal/")) {
      return {
        error: "Use the SharePoint site URL, not a sharing or personal OneDrive URL.",
      };
    }
    if (folderPath.startsWith("http://") || folderPath.startsWith("https://")) {
      return { error: "Folder path must be relative to the document library." };
    }
    if (folderPath.includes("/:f:/") || folderPath.includes("/personal/")) {
      return { error: "Folder path must not be a sharing or personal OneDrive URL." };
    }
    if (folderUrl) {
      const parsedFolder = new URL(folderUrl);
      if (parsedFolder.protocol !== "https:") {
        return { error: "SharePoint folder URL must use HTTPS." };
      }
    }
  } catch {
    return { error: "Enter a valid SharePoint site URL." };
  }
  return {
    siteUrl: siteUrl.replace(/\/+$/, ""),
    folderPath: folderPath.replace(/^\/+|\/+$/g, ""),
    folderUrl: folderUrl || null,
  };
}

async function getSharePointLinks(userIds: number[]): Promise<Map<number, typeof userSharePointLinksTable.$inferSelect>> {
  if (userIds.length === 0) return new Map();
  const links = await db
    .select()
    .from(userSharePointLinksTable)
    .where(inArray(userSharePointLinksTable.userId, userIds));
  return new Map(links.map((link) => [link.userId, link]));
}

function linkInputFromUser(data: {
  sharePointSiteUrl?: string | null;
  sharePointFolderPath?: string | null;
  sharePointFolderUrl?: string | null;
}): SharePointLinkInput {
  return {
    sharePointSiteUrl: data.sharePointSiteUrl,
    sharePointFolderPath: data.sharePointFolderPath,
    sharePointFolderUrl: data.sharePointFolderUrl,
  };
}

async function saveSharePointLink(
  userId: number,
  actorUserId: number,
  input: SharePointLinkInput,
): Promise<typeof userSharePointLinksTable.$inferSelect | null> {
  const parsed = parseSharePointLink(input);
  if (parsed && "error" in parsed) throw new Error(parsed.error);
  if (!parsed) {
    await db
      .delete(userSharePointLinksTable)
      .where(eq(userSharePointLinksTable.userId, userId));
    return null;
  }
  const [link] = await db
    .insert(userSharePointLinksTable)
    .values({
      userId,
      siteUrl: parsed.siteUrl,
      folderPath: parsed.folderPath,
      folderUrl: parsed.folderUrl,
      status: "PendingVerification",
      verificationMessage: "Saved; SharePoint access has not been verified yet.",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .onConflictDoUpdate({
      target: userSharePointLinksTable.userId,
      set: {
        siteUrl: parsed.siteUrl,
        folderPath: parsed.folderPath,
        folderUrl: parsed.folderUrl,
        status: "PendingVerification",
        verificationMessage: "Saved; SharePoint access has not been verified yet.",
        lastVerifiedAt: null,
        updatedBy: actorUserId,
        updatedAt: new Date(),
      },
    })
    .returning();
  return link ?? null;
}

function invalidRoleOrStatus(role?: string, status?: string): string | null {
  if (role !== undefined && !supportedRoleSet.has(role)) return "Unsupported user role.";
  if (status !== undefined && !supportedStatuses.has(status)) return "Status must be Active or Suspended.";
  return null;
}

router.get(
  "/users",
  requireAuth,
  requireRole("SUPER_ADMIN", "CUSTOMER_SUPPORT_COORDINATOR", "CUSTOMER_MANAGER"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const caller = request.currentUser!;
    const records = await db.select().from(userAccountsTable).orderBy(asc(userAccountsTable.code));
    const visible =
      caller.role === "SUPER_ADMIN"
        ? records
        : records.filter((user) => isUserVisibleToCaller(caller, user));
    const links = await getSharePointLinks(visible.map((user) => user.id));
    response.json(
      ListUsersResponse.parse(visible.map((user) => publicUser(user, links.get(user.id) ?? null))),
    );
  },
);

router.post(
  "/users",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const parsed = CreateUserBody.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.message });
      return;
    }
    const invalid = invalidRoleOrStatus(parsed.data.role);
    if (invalid) {
      response.status(400).json({ error: invalid });
      return;
    }
    const data = parsed.data;
    const linkInput = linkInputFromUser(data);
    const link = parseSharePointLink(linkInput);
    if (link && "error" in link) {
      response.status(400).json({ error: link.error });
      return;
    }
    try {
      const [created] = await db
        .insert(userAccountsTable)
        .values({
          code: data.code.trim().toUpperCase(),
          email: data.email.trim().toLowerCase(),
          name: data.name.trim(),
          authProvider: data.authProvider ?? "SILA Local Login",
          role: data.role,
          customerScope: data.customerScope,
          propertyScope: data.propertyScope,
          storeScope: data.storeScope,
          passwordHash: passwordDigest(data.password),
        })
        .returning();
      const [role] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.code, data.role))
        .limit(1);
      if (role) {
        await db
          .insert(userRolesTable)
          .values({ userId: created.id, roleId: role.id })
          .onConflictDoNothing();
      }
      const savedLink = link ? await saveSharePointLink(created.id, request.currentUser!.id, linkInput) : null;
      await recordAuditEvent("USER_CREATED", {
        actorUserId: request.currentUser!.id,
        targetUserId: created.id,
      });
      if (savedLink) {
        await recordAuditEvent("USER_SHAREPOINT_LINK_UPDATED", {
          actorUserId: request.currentUser!.id,
          targetUserId: created.id,
          metadata: { siteUrl: savedLink.siteUrl, folderPath: savedLink.folderPath },
        });
      }
      response.status(201).json(CreateUserResponse.parse(publicUser(created, savedLink)));
    } catch (error) {
      request.log.warn({ error }, "Could not create user");
      if (error instanceof Error && error.message.includes("SharePoint")) {
        response.status(400).json({ error: error.message });
        return;
      }
      response.status(409).json({ error: "A user with that code or email already exists." });
    }
  },
);

router.patch(
  "/users/:id",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (request: AuthenticatedRequest, response): Promise<void> => {
    const params = UpdateUserParams.safeParse(request.params);
    const parsed = UpdateUserBody.safeParse(request.body);
    if (!params.success || !parsed.success) {
      response.status(400).json({ error: "Invalid user update." });
      return;
    }
    const invalid = invalidRoleOrStatus(parsed.data.role, parsed.data.status);
    if (invalid) {
      response.status(400).json({ error: invalid });
      return;
    }
    const hasSharePointChange =
      "sharePointSiteUrl" in parsed.data ||
      "sharePointFolderPath" in parsed.data ||
      "sharePointFolderUrl" in parsed.data;
    const linkInput = linkInputFromUser(parsed.data);
    const link = hasSharePointChange ? parseSharePointLink(linkInput) : null;
    if (link && "error" in link) {
      response.status(400).json({ error: link.error });
      return;
    }
    if (params.data.id === request.currentUser!.id && parsed.data.status === "Suspended") {
      response.status(400).json({ error: "You cannot suspend your own account." });
      return;
    }
    const update = {
      ...(parsed.data.email === undefined ? {} : { email: parsed.data.email.trim().toLowerCase() }),
      ...(parsed.data.name === undefined ? {} : { name: parsed.data.name.trim() }),
      ...(parsed.data.authProvider === undefined ? {} : { authProvider: parsed.data.authProvider }),
      ...(parsed.data.role === undefined ? {} : { role: parsed.data.role }),
      ...(parsed.data.customerScope === undefined ? {} : { customerScope: parsed.data.customerScope }),
      ...(parsed.data.propertyScope === undefined ? {} : { propertyScope: parsed.data.propertyScope }),
      ...(parsed.data.storeScope === undefined ? {} : { storeScope: parsed.data.storeScope }),
      ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
      ...(parsed.data.password === undefined ? {} : { passwordHash: passwordDigest(parsed.data.password) }),
      updatedAt: new Date(),
    };
    try {
      const [updated] = await db
        .update(userAccountsTable)
        .set(update)
        .where(eq(userAccountsTable.id, params.data.id))
        .returning();
      if (!updated) {
        response.status(404).json({ error: "User not found." });
        return;
      }
      if (parsed.data.role !== undefined) {
        const [role] = await db
          .select()
          .from(rolesTable)
          .where(eq(rolesTable.code, parsed.data.role))
          .limit(1);
        if (role) {
          await db.transaction(async (transaction) => {
            await transaction
              .delete(userRolesTable)
              .where(eq(userRolesTable.userId, updated.id));
            await transaction
              .insert(userRolesTable)
              .values({ userId: updated.id, roleId: role.id });
          });
          await recordAuditEvent("USER_ROLE_ASSIGNED", {
            actorUserId: request.currentUser!.id,
            targetUserId: updated.id,
            metadata: { roles: [parsed.data.role] },
          });
        }
      }
      const savedLink = hasSharePointChange
        ? await saveSharePointLink(updated.id, request.currentUser!.id, linkInput)
        : (await getSharePointLinks([updated.id])).get(updated.id) ?? null;
      if (hasSharePointChange) {
        await recordAuditEvent(
          savedLink ? "USER_SHAREPOINT_LINK_UPDATED" : "USER_SHAREPOINT_LINK_REMOVED",
          {
            actorUserId: request.currentUser!.id,
            targetUserId: updated.id,
            metadata: savedLink
              ? { siteUrl: savedLink.siteUrl, folderPath: savedLink.folderPath }
              : undefined,
          },
        );
      }
      const statusEvent =
        parsed.data.status === "Suspended"
          ? "USER_SUSPENDED"
          : parsed.data.status === "Active"
            ? "USER_REACTIVATED"
            : "USER_UPDATED";
      await recordAuditEvent(statusEvent, {
        actorUserId: request.currentUser!.id,
        targetUserId: updated.id,
      });
      response.json(UpdateUserResponse.parse(publicUser(updated, savedLink)));
    } catch (error) {
      request.log.warn({ error }, "Could not update user");
      if (error instanceof Error && error.message.includes("SharePoint")) {
        response.status(400).json({ error: error.message });
        return;
      }
      response.status(409).json({ error: "A user with that email already exists." });
    }
  },
);

export default router;