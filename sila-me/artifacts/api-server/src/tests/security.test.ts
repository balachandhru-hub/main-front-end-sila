import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, test } from "node:test";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import {
  auditEventsTable,
  cloudUsersTable,
  customersTable,
  db,
  materialAliasesTable,
  materialBarcodesTable,
  materialConfirmationsTable,
  materialsTable,
  mobileConfigurationsTable,
  mobileUserPropertyAccessTable,
  mobileUserRolesTable,
  mobileUserStoreAccessTable,
  mobileUsersTable,
  pool,
  propertiesTable,
  rolesTable,
  storesTable,
  supplierAliasesTable,
  supplierMaterialMappingsTable,
  suppliersTable,
  userAccountsTable,
  userSharePointLinksTable,
  type Customer,
  type Property,
  type Store,
  type UserAccount,
} from "@workspace/db";
import app from "../app";
import { allowedRoutes, canAccessRoute, passwordDigest } from "../lib/access";

const fixturePrefix = `SECURITYTEST${process.pid}${Date.now()}`;
const fixturePassword = "test-password";
const customerA = `${fixturePrefix}-CUSTOMER-A`;
const customerB = `${fixturePrefix}-CUSTOMER-B`;

type FixtureUser = UserAccount;
type SignInBody =
  | {
      user: { id: number; role: string };
      allowedRoutes: string[];
    }
  | {
      error: string;
    };

let server: Server;
let baseUrl: string;
let fixtureUsers: Record<string, FixtureUser>;
let fixtureCustomers: Record<"A" | "B", Customer>;
let fixtureProperties: Record<"A" | "B", Property>;
let fixtureStores: Record<"A" | "B", Store>;
let fixtureMaterials: { A: { id: number }; B: { id: number } };
let fixtureSuppliers: { A: { id: number }; B: { id: number } };
let userAccountsTableReady = false;

async function ensureUserAccountsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sila_user_accounts (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      code text NOT NULL,
      email text NOT NULL,
      name text NOT NULL,
      auth_provider text NOT NULL DEFAULT 'SILA Local Login',
      role text NOT NULL,
      customer_scope text NOT NULL DEFAULT '*',
      property_scope text NOT NULL DEFAULT '*',
      store_scope text NOT NULL DEFAULT '*',
      password_hash text NOT NULL,
      status text NOT NULL DEFAULT 'Active',
      last_login_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS sila_user_accounts_code_idx
    ON sila_user_accounts (code)
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS sila_user_accounts_email_idx
    ON sila_user_accounts (email)
  `);
  userAccountsTableReady = true;
}

async function createFixtureUser(
  name: string,
  role: string,
  customerScope: string,
  overrides: Partial<{
    propertyScope: string;
    storeScope: string;
    status: string;
  }> = {},
): Promise<FixtureUser> {
  const [user] = await db
    .insert(userAccountsTable)
    .values({
      code: `${fixturePrefix}-${name}`,
      email: `${name.toLowerCase()}-${process.pid}@security-test.invalid`,
      name: `Security test ${name}`,
      authProvider: "SILA Local Login",
      role,
      customerScope,
      propertyScope: overrides.propertyScope ?? "*",
      storeScope: overrides.storeScope ?? "*",
      passwordHash: passwordDigest(fixturePassword),
      status: overrides.status ?? "Active",
    })
    .returning();

  assert.ok(user, `Could not create fixture user ${name}`);
  return user;
}

async function request(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

async function signIn(user: FixtureUser): Promise<{
  response: Response;
  body: SignInBody;
  cookie: string;
}> {
  const response = await request("/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      password: fixturePassword,
    }),
  });
  const body = (await response.json()) as SignInBody;
  const setCookie = response.headers.get("set-cookie");
  return {
    response,
    body,
    cookie: setCookie?.split(";")[0] ?? "",
  };
}

async function mobileSignIn(user: FixtureUser, email = user.email): Promise<{
  response: Response;
  body: {
    accessToken?: string;
    mustChangePassword?: boolean;
    user?: { id: number };
    error?: string;
  };
}> {
  const response = await request("/api/auth/mobile/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: fixturePassword,
    }),
  });
  return {
    response,
    body: (await response.json()) as {
      accessToken?: string;
      mustChangePassword?: boolean;
      user?: { id: number };
      error?: string;
    },
  };
}

function sessionHeaders(cookie: string): { cookie: string } {
  return { cookie };
}

before(async () => {
  await ensureUserAccountsTable();
  const created = await Promise.all([
    createFixtureUser("ADMIN", "SUPER_ADMIN", "*"),
    createFixtureUser("SUPPORT", "CUSTOMER_SUPPORT_COORDINATOR", "*"),
    createFixtureUser("MANAGER", "CUSTOMER_MANAGER", customerA),
    createFixtureUser("PROPERTY_MANAGER", "CUSTOMER_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
    }),
    createFixtureUser("STORE_MANAGER", "CUSTOMER_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
      storeScope: "STORE-A",
    }),
    createFixtureUser("PROPERTY_MATCH", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
    }),
    createFixtureUser("PROPERTY_OTHER", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-B",
    }),
    createFixtureUser("STORE_MATCH", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
      storeScope: "STORE-A",
    }),
    createFixtureUser("STORE_OTHER", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
      storeScope: "STORE-B",
    }),
    createFixtureUser("PEER", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
      storeScope: "STORE-A",
    }),
    createFixtureUser("OUTSIDE", "STORE_MANAGER", customerB),
    createFixtureUser("STORE", "STORE_MANAGER", customerA),
    createFixtureUser("SUSPENDED", "FINANCE_MANAGER", customerA, {
      status: "Suspended",
    }),
    createFixtureUser("MOBILE_PEER", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
      storeScope: "STORE-A",
    }),
    createFixtureUser("MOBILE_MANAGER", "STORE_MANAGER", customerA, {
      propertyScope: "PROPERTY-A",
      storeScope: "STORE-A",
    }),
  ]);

  fixtureUsers = Object.fromEntries(
    [
      "ADMIN",
      "SUPPORT",
      "MANAGER",
      "PROPERTY_MANAGER",
      "STORE_MANAGER",
      "PROPERTY_MATCH",
      "PROPERTY_OTHER",
      "STORE_MATCH",
      "STORE_OTHER",
      "PEER",
      "OUTSIDE",
      "STORE",
      "SUSPENDED",
      "MOBILE_PEER",
      "MOBILE_MANAGER",
    ].map((name, index) => [name, created[index]]),
  );

  const [createdCustomerA, createdCustomerB] = await db
    .insert(customersTable)
    .values([
      { code: customerA, name: "Security test Customer A" },
      { code: customerB, name: "Security test Customer B" },
    ])
    .returning();
  fixtureCustomers = { A: createdCustomerA, B: createdCustomerB };

  const [createdPropertyA, createdPropertyB] = await db
    .insert(propertiesTable)
    .values([
      {
        customerId: fixtureCustomers.A.id,
        code: "PROPERTY-A",
        name: "Security test Property A",
      },
      {
        customerId: fixtureCustomers.B.id,
        code: "PROPERTY-B",
        name: "Security test Property B",
      },
    ])
    .returning();
  fixtureProperties = { A: createdPropertyA, B: createdPropertyB };

  const [createdStoreA, createdStoreB] = await db
    .insert(storesTable)
    .values([
      {
        propertyId: fixtureProperties.A.id,
        code: "STORE-A",
        name: "Security test Store A",
      },
      {
        propertyId: fixtureProperties.B.id,
        code: "STORE-B",
        name: "Security test Store B",
      },
    ])
    .returning();
  fixtureStores = { A: createdStoreA, B: createdStoreB };

  const [mobileRole] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.code, "STORE_MANAGER"))
    .limit(1);
  assert.ok(mobileRole, "STORE_MANAGER role is required for mobile fixtures");
  const [peerMobile, managerMobile] = await db
    .insert(mobileUsersTable)
    .values([
      {
        legacyUserId: fixtureUsers.MOBILE_PEER.id,
        code: `${fixturePrefix}-MOBILE-PEER`,
        customerId: fixtureCustomers.A.id,
        email: fixtureUsers.MOBILE_PEER.email,
        displayName: fixtureUsers.MOBILE_PEER.name,
        passwordHash: fixtureUsers.MOBILE_PEER.passwordHash,
        status: "ACTIVE",
      },
      {
        legacyUserId: fixtureUsers.MOBILE_MANAGER.id,
        code: `${fixturePrefix}-MOBILE-MANAGER`,
        customerId: fixtureCustomers.A.id,
        email: fixtureUsers.MOBILE_MANAGER.email,
        displayName: fixtureUsers.MOBILE_MANAGER.name,
        passwordHash: fixtureUsers.MOBILE_MANAGER.passwordHash,
        status: "ACTIVE",
      },
    ])
    .returning();
  await db.insert(mobileUserRolesTable).values([
    { mobileUserId: peerMobile.id, roleId: mobileRole.id },
    { mobileUserId: managerMobile.id, roleId: mobileRole.id },
  ]);
  await db.insert(mobileUserPropertyAccessTable).values([
    { mobileUserId: peerMobile.id, propertyId: fixtureProperties.A.id },
    { mobileUserId: managerMobile.id, propertyId: fixtureProperties.A.id },
  ]);
  await db.insert(mobileUserStoreAccessTable).values([
    { mobileUserId: peerMobile.id, storeId: fixtureStores.A.id },
    { mobileUserId: managerMobile.id, storeId: fixtureStores.A.id },
  ]);

  const [materialA, materialB] = await db
    .insert(materialsTable)
    .values([
      {
        customerId: fixtureCustomers.A.id,
        materialCode: `${fixturePrefix}-MAT-A`,
        materialDescription: "Security test coffee",
        baseUom: "EA",
        plantCode: "PLANT-A",
        sourceSystem: "DEV_DATABASE",
      },
      {
        customerId: fixtureCustomers.B.id,
        materialCode: `${fixturePrefix}-MAT-B`,
        materialDescription: "Security test tea",
        baseUom: "EA",
        plantCode: "PLANT-B",
        sourceSystem: "DEV_DATABASE",
      },
    ])
    .returning({ id: materialsTable.id });
  fixtureMaterials = { A: materialA, B: materialB };
  await db.insert(materialBarcodesTable).values({
    materialId: materialA.id,
    barcode: `${fixturePrefix}-BAR-A`,
    barcodeType: "TEST",
    isPrimary: true,
  });
  await db.insert(materialAliasesTable).values({
    materialId: materialA.id,
    alias: `${fixturePrefix}-coffee-alias`,
    aliasType: "SEARCH",
  });

  const [supplierA, supplierB] = await db
    .insert(suppliersTable)
    .values([
      {
        customerId: fixtureCustomers.A.id,
        supplierCode: `${fixturePrefix}-SUP-A`,
        supplierName: "Security test supplier A",
        taxRegistrationNumber: `${fixturePrefix}-TRN-A`,
        sourceSystem: "DEV_DATABASE",
      },
      {
        customerId: fixtureCustomers.B.id,
        supplierCode: `${fixturePrefix}-SUP-B`,
        supplierName: "Security test supplier B",
        taxRegistrationNumber: `${fixturePrefix}-TRN-B`,
        sourceSystem: "DEV_DATABASE",
      },
    ])
    .returning({ id: suppliersTable.id });
  fixtureSuppliers = { A: supplierA, B: supplierB };
  await db.insert(supplierAliasesTable).values({
    supplierId: supplierA.id,
    alias: `${fixturePrefix}-supplier-alias`,
    aliasType: "SEARCH",
  });
  await db.insert(supplierMaterialMappingsTable).values({
    customerId: fixtureCustomers.A.id,
    supplierId: supplierA.id,
    materialId: materialA.id,
    supplierMaterialCode: `${fixturePrefix}-SUP-MAT-A`,
    supplierDescription: "Supplier-side coffee",
    sourceSystem: "DEV_DATABASE",
  });

  await db.insert(mobileConfigurationsTable).values({
    customerId: fixtureCustomers.A.id,
    propertyId: fixtureProperties.A.id,
    storeId: fixtureStores.A.id,
    configurationVersion: 7,
    receiveGoods: true,
    inventoryCount: true,
    stockTransfer: false,
  });

  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (userAccountsTableReady) {
    const fixtureUserIds = Object.values(fixtureUsers).map((user) => user.id);
    await db
      .delete(mobileUsersTable)
      .where(inArray(mobileUsersTable.legacyUserId, fixtureUserIds));
    await db
      .delete(auditEventsTable)
      .where(
        or(
          inArray(auditEventsTable.actorUserId, fixtureUserIds),
          inArray(auditEventsTable.targetUserId, fixtureUserIds),
        ),
      );
    await db
      .delete(userAccountsTable)
      .where(
        and(
          like(userAccountsTable.code, `${fixturePrefix}%`),
          like(userAccountsTable.email, `%@security-test.invalid`),
        ),
      );
  }
  if (fixtureCustomers) {
    await db
      .delete(materialConfirmationsTable)
      .where(
        inArray(materialConfirmationsTable.customerId, [
          fixtureCustomers.A.id,
          fixtureCustomers.B.id,
        ]),
      );
    await db
      .delete(materialsTable)
      .where(inArray(materialsTable.id, [fixtureMaterials.A.id, fixtureMaterials.B.id]));
    await db
      .delete(supplierMaterialMappingsTable)
      .where(
        inArray(supplierMaterialMappingsTable.customerId, [
          fixtureCustomers.A.id,
          fixtureCustomers.B.id,
        ]),
      );
    await db
      .delete(suppliersTable)
      .where(inArray(suppliersTable.id, [fixtureSuppliers.A.id, fixtureSuppliers.B.id]));
    await db
      .delete(mobileConfigurationsTable)
      .where(
        inArray(mobileConfigurationsTable.customerId, [
          fixtureCustomers.A.id,
          fixtureCustomers.B.id,
        ]),
      );
    await db
      .delete(storesTable)
      .where(inArray(storesTable.id, [fixtureStores.A.id, fixtureStores.B.id]));
    await db
      .delete(propertiesTable)
      .where(
        inArray(propertiesTable.id, [
          fixtureProperties.A.id,
          fixtureProperties.B.id,
        ]),
      );
    await db
      .delete(customersTable)
      .where(
        inArray(customersTable.id, [
          fixtureCustomers.A.id,
          fixtureCustomers.B.id,
        ]),
      );
  }
  await pool.end();
});

describe("sign-in security boundary", () => {
  test("allows an active user to sign in and returns role routes", async () => {
    const result = await signIn(fixtureUsers.MANAGER);

    assert.equal(result.response.status, 200);
    assert.ok(
      result.cookie,
      "Successful sign-in should issue a session cookie",
    );
    assert.ok("user" in result.body);
    assert.ok("allowedRoutes" in result.body);
    assert.equal(result.body.user.id, fixtureUsers.MANAGER.id);
    assert.equal(result.body.user.role, "CUSTOMER_MANAGER");
    assert.ok(result.body.allowedRoutes.includes("/users"));
    assert.ok(!result.body.allowedRoutes.includes("/audit"));
  });

  test("rejects a suspended user", async () => {
    const result = await signIn(fixtureUsers.SUSPENDED);

    assert.equal(result.response.status, 401);
    assert.deepEqual(result.body, {
      error: "Invalid credentials or suspended account.",
    });
  });

  test("rejects invalid credentials", async () => {
    const response = await request("/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: fixtureUsers.MANAGER.email,
        password: "not-the-test-password",
      }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Invalid credentials or suspended account.",
    });
  });

  test("rejects malformed and tampered session cookies", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const [, sessionValue] = cookie.split("=");
    assert.ok(sessionValue);
    const tamperedCookie = `sila_session=${sessionValue.slice(0, -1)}${
      sessionValue.endsWith("0") ? "1" : "0"
    }`;

    for (const invalidCookie of ["sila_session=not-a-session", tamperedCookie]) {
      const response = await request("/api/auth/session", {
        headers: sessionHeaders(invalidCookie),
      });

      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required or has expired.",
      });
    }
  });

  test("stops accepting an active session after the account is suspended", async () => {
    const target = fixtureUsers.PEER;
    const { response: signInResponse, cookie: sessionCookie } = await signIn(target);
    assert.equal(signInResponse.status, 200);

    const activeResponse = await request("/api/me", {
      headers: sessionHeaders(sessionCookie),
    });
    assert.equal(activeResponse.status, 200);

    const { cookie: adminCookie } = await signIn(fixtureUsers.ADMIN);
    try {
      const suspendResponse = await request(`/api/users/${target.id}`, {
        method: "PATCH",
        headers: sessionHeaders(adminCookie),
        body: JSON.stringify({ status: "Suspended" }),
      });
      assert.equal(suspendResponse.status, 200);

      const staleMeResponse = await request("/api/me", {
        headers: sessionHeaders(sessionCookie),
      });
      assert.equal(staleMeResponse.status, 401);
      assert.deepEqual(await staleMeResponse.json(), {
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required or has expired.",
      });

      const staleSessionResponse = await request("/api/auth/session", {
        headers: sessionHeaders(sessionCookie),
      });
      assert.equal(staleSessionResponse.status, 401);
      assert.deepEqual(await staleSessionResponse.json(), {
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required or has expired.",
      });
    } finally {
      await db
        .update(userAccountsTable)
        .set({ status: "Active" })
        .where(eq(userAccountsTable.id, target.id));
    }
  });
});

describe("role route permissions", () => {
  test("exposes only the routes allowed by each role", () => {
    assert.deepEqual(allowedRoutes("SUPER_ADMIN"), ["*"]);
    assert.equal(canAccessRoute("SUPER_ADMIN", "/anything"), true);
    assert.equal(canAccessRoute("CUSTOMER_MANAGER", "/users"), true);
    assert.equal(canAccessRoute("CUSTOMER_MANAGER", "/audit"), false);
    assert.equal(canAccessRoute("STORE_MANAGER", "/stores"), true);
    assert.equal(canAccessRoute("STORE_MANAGER", "/users"), false);
    assert.deepEqual(allowedRoutes("UNKNOWN_ROLE"), []);
  });

  test("blocks a store manager from the user-management route", async () => {
    const { cookie } = await signIn(fixtureUsers.STORE);
    const response = await request("/api/users", {
      headers: sessionHeaders(cookie),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "Your role cannot perform this action.",
    });
  });
});

describe("forbidden user mutations", () => {
  test("blocks non-admin users from creating or editing users", async () => {
    for (const name of ["MANAGER", "STORE"] as const) {
      const { cookie } = await signIn(fixtureUsers[name]);
      const createResponse = await request("/api/users", {
        method: "POST",
        headers: sessionHeaders(cookie),
        body: JSON.stringify({
          code: `${fixturePrefix}-FORBIDDEN-${name}`,
          email: `forbidden-${name.toLowerCase()}-${process.pid}@security-test.invalid`,
          name: "Should not be created",
          role: "STORE_MANAGER",
          customerScope: customerA,
          propertyScope: "*",
          storeScope: "*",
          password: fixturePassword,
        }),
      });
      assert.equal(createResponse.status, 403);

      const updateResponse = await request(
        `/api/users/${fixtureUsers.OUTSIDE.id}`,
        {
          method: "PATCH",
          headers: sessionHeaders(cookie),
          body: JSON.stringify({ name: "Should not be changed" }),
        },
      );
      assert.equal(updateResponse.status, 403);
    }
  });

  test("prevents an administrator from suspending their own account", async () => {
    const { cookie } = await signIn(fixtureUsers.ADMIN);
    const response = await request(`/api/users/${fixtureUsers.ADMIN.id}`, {
      method: "PATCH",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({ status: "Suspended" }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "You cannot suspend your own account.",
    });
  });
});

describe("user SharePoint link boundaries", () => {
  test("creates, returns, updates, and removes a user folder link", async () => {
    const { cookie } = await signIn(fixtureUsers.ADMIN);
    const code = `${fixturePrefix}-SHAREPOINT`;
    const createResponse = await request("/api/users", {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        code,
        email: `${code.toLowerCase()}@security-test.invalid`,
        name: "SharePoint link test",
        role: "STORE_MANAGER",
        customerScope: customerB,
        propertyScope: "*",
        storeScope: "*",
        password: fixturePassword,
        sharePointSiteUrl: "https://rnextautomations.sharepoint.com/sites/SILASTORE",
        sharePointFolderPath: "Invoices/FIVE-JVC",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      id: number;
      sharePointLink: { siteUrl: string; folderPath: string; status: string } | null;
    };
    assert.equal(created.sharePointLink?.siteUrl, "https://rnextautomations.sharepoint.com/sites/SILASTORE");
    assert.equal(created.sharePointLink?.folderPath, "Invoices/FIVE-JVC");
    assert.equal(created.sharePointLink?.status, "PendingVerification");

    const listedResponse = await request("/api/users", {
      headers: sessionHeaders(cookie),
    });
    const listed = (await listedResponse.json()) as Array<{
      id: number;
      sharePointLink: { folderPath: string } | null;
    }>;
    assert.equal(listed.find((user) => user.id === created.id)?.sharePointLink?.folderPath, "Invoices/FIVE-JVC");

    const updateResponse = await request(`/api/users/${created.id}`, {
      method: "PATCH",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        sharePointSiteUrl: "https://rnextautomations.sharepoint.com/sites/SILASTORE",
        sharePointFolderPath: "Invoices/ARCHIVE",
        sharePointFolderUrl: "https://rnextautomations.sharepoint.com/sites/SILASTORE/Shared%20Documents/Invoices/ARCHIVE",
      }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      sharePointLink: { folderPath: string } | null;
    };
    assert.equal(updated.sharePointLink?.folderPath, "Invoices/ARCHIVE");

    const removeResponse = await request(`/api/users/${created.id}`, {
      method: "PATCH",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        sharePointSiteUrl: null,
        sharePointFolderPath: null,
        sharePointFolderUrl: null,
      }),
    });
    assert.equal(removeResponse.status, 200);
    const removed = (await removeResponse.json()) as { sharePointLink: unknown };
    assert.equal(removed.sharePointLink, null);
    const storedLinks = await db
      .select()
      .from(userSharePointLinksTable)
      .where(eq(userSharePointLinksTable.userId, created.id));
    assert.equal(storedLinks.length, 0);
  });

  test("rejects sharing links and keeps link mutations tenant-safe", async () => {
    const { cookie: adminCookie } = await signIn(fixtureUsers.ADMIN);
    const invalidResponse = await request("/api/users", {
      method: "POST",
      headers: sessionHeaders(adminCookie),
      body: JSON.stringify({
        code: `${fixturePrefix}-INVALID-SHAREPOINT`,
        email: `${fixturePrefix.toLowerCase()}-invalid@security-test.invalid`,
        name: "Invalid SharePoint link",
        role: "STORE_MANAGER",
        customerScope: customerA,
        propertyScope: "*",
        storeScope: "*",
        password: fixturePassword,
        sharePointSiteUrl: "https://rnextautomations.sharepoint.com/:f:/g/personal/user",
        sharePointFolderPath: "Invoices/FIVE-JVC",
      }),
    });
    assert.equal(invalidResponse.status, 400);

    const { cookie: managerCookie } = await signIn(fixtureUsers.MANAGER);
    const forbiddenResponse = await request(`/api/users/${fixtureUsers.OUTSIDE.id}`, {
      method: "PATCH",
      headers: sessionHeaders(managerCookie),
      body: JSON.stringify({
        sharePointSiteUrl: "https://rnextautomations.sharepoint.com/sites/SILASTORE",
        sharePointFolderPath: "Invoices/FIVE-JVC",
      }),
    });
    assert.equal(forbiddenResponse.status, 403);
  });
});

describe("customer tenant filtering", () => {
  test("limits a customer manager to users in their customer scope", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const response = await request("/api/users", {
      headers: sessionHeaders(cookie),
    });
    const users = (await response.json()) as Array<{ code: string }>;
    const codes = new Set(users.map((user) => user.code));

    assert.equal(response.status, 200);
    assert.deepEqual(
      [...codes].filter((code) => code.startsWith(fixturePrefix)),
      [
        `${fixturePrefix}-MANAGER`,
        `${fixturePrefix}-MOBILE_MANAGER`,
        `${fixturePrefix}-MOBILE_PEER`,
        `${fixturePrefix}-PEER`,
        `${fixturePrefix}-PROPERTY_MANAGER`,
        `${fixturePrefix}-PROPERTY_MATCH`,
        `${fixturePrefix}-PROPERTY_OTHER`,
        `${fixturePrefix}-STORE`,
        `${fixturePrefix}-STORE_MANAGER`,
        `${fixturePrefix}-STORE_MATCH`,
        `${fixturePrefix}-STORE_OTHER`,
        `${fixturePrefix}-SUSPENDED`,
      ],
    );
    assert.equal(codes.has(fixtureUsers.OUTSIDE.code), false);
  });

  test("limits a property-scoped caller to users in their property", async () => {
    const { cookie } = await signIn(fixtureUsers.PROPERTY_MANAGER);
    const response = await request("/api/users", {
      headers: sessionHeaders(cookie),
    });
    const users = (await response.json()) as Array<{ code: string }>;
    const codes = new Set(users.map((user) => user.code));

    assert.equal(response.status, 200);
    assert.equal(codes.has(fixtureUsers.PROPERTY_MATCH.code), true);
    assert.equal(codes.has(fixtureUsers.STORE_MATCH.code), true);
    assert.equal(codes.has(fixtureUsers.STORE_OTHER.code), true);
    assert.equal(codes.has(fixtureUsers.PROPERTY_OTHER.code), false);
    assert.equal(codes.has(fixtureUsers.OUTSIDE.code), false);
  });

  test("limits a store-scoped caller to users in their store within the property", async () => {
    const { cookie } = await signIn(fixtureUsers.STORE_MANAGER);
    const response = await request("/api/users", {
      headers: sessionHeaders(cookie),
    });
    const users = (await response.json()) as Array<{ code: string }>;
    const codes = new Set(users.map((user) => user.code));

    assert.equal(response.status, 200);
    assert.equal(codes.has(fixtureUsers.STORE_MATCH.code), true);
    assert.equal(codes.has(fixtureUsers.PROPERTY_MATCH.code), false);
    assert.equal(codes.has(fixtureUsers.PROPERTY_OTHER.code), false);
    assert.equal(codes.has(fixtureUsers.STORE_OTHER.code), false);
    assert.equal(codes.has(fixtureUsers.OUTSIDE.code), false);
  });

  test("allows a wildcard customer support scope to see all customers", async () => {
    const { cookie } = await signIn(fixtureUsers.SUPPORT);
    const response = await request("/api/users", {
      headers: sessionHeaders(cookie),
    });
    const users = (await response.json()) as Array<{ code: string }>;
    const codes = new Set(users.map((user) => user.code));

    assert.equal(response.status, 200);
    assert.equal(codes.has(fixtureUsers.MANAGER.code), true);
    assert.equal(codes.has(fixtureUsers.OUTSIDE.code), true);
  });
});

describe("shared mobile authentication and scope", () => {
  test("reports when a valid mobile login requires a first-login password change", async () => {
    const [mobile] = await db
      .select()
      .from(mobileUsersTable)
      .where(eq(mobileUsersTable.legacyUserId, fixtureUsers.MOBILE_PEER.id))
      .limit(1);
    assert.ok(mobile);

    await db
      .update(mobileUsersTable)
      .set({ passwordHash: passwordDigest(fixturePassword), mustChangePassword: true })
      .where(eq(mobileUsersTable.id, mobile.id));

    const login = await mobileSignIn(fixtureUsers.MOBILE_PEER);
    assert.equal(login.response.status, 200);
    assert.equal(login.body.mustChangePassword, true);

    await db
      .update(mobileUsersTable)
      .set({ mustChangePassword: false })
      .where(eq(mobileUsersTable.id, mobile.id));
  });

  test("normalizes mobile login email casing and surrounding whitespace", async () => {
    const login = await mobileSignIn(
      fixtureUsers.MOBILE_PEER,
      ` ${fixtureUsers.MOBILE_PEER.email.toUpperCase()} `,
    );
    assert.equal(login.response.status, 200);
    assert.ok(login.body.accessToken);
  });

  test("returns the same database user through bearer authentication", async () => {
    const login = await mobileSignIn(fixtureUsers.MOBILE_PEER);
    assert.equal(login.response.status, 200);
    assert.ok(login.body.accessToken);
    assert.equal(login.body.user?.id, fixtureUsers.MOBILE_PEER.id);

    const response = await request("/api/me", {
      headers: { authorization: `Bearer ${login.body.accessToken}` },
    });
    const body = (await response.json()) as {
      user: { id: number };
      customer: { code: string };
      properties: Array<{ code: string }>;
      stores: Array<{ code: string }>;
    };
    assert.equal(response.status, 200);
    assert.equal(body.user.id, fixtureUsers.MOBILE_PEER.id);
    assert.equal(body.customer.code, customerA);
    assert.deepEqual(body.properties.map(({ code }) => code), ["PROPERTY-A"]);
    assert.deepEqual(body.stores.map(({ code }) => code), ["STORE-A"]);
  });

  test("returns the most specific mobile configuration", async () => {
    const login = await mobileSignIn(fixtureUsers.MOBILE_PEER);
    const response = await request("/api/mobile/config", {
      headers: { authorization: `Bearer ${login.body.accessToken}` },
    });
    const body = (await response.json()) as {
      configurationVersion: number;
      features: {
        receiveGoods: boolean;
        inventoryCount: boolean;
        stockTransfer: boolean;
      };
    };
    assert.equal(response.status, 200);
    assert.equal(body.configurationVersion, 7);
    assert.deepEqual(
      {
        receiveGoods: body.features.receiveGoods,
        inventoryCount: body.features.inventoryCount,
        stockTransfer: body.features.stockTransfer,
      },
      { receiveGoods: true, inventoryCount: true, stockTransfer: false },
    );
  });

  test("denies a mobile manager access to another customer's store", async () => {
    const login = await mobileSignIn(fixtureUsers.MOBILE_MANAGER);
    const response = await request(`/api/materials?storeId=${fixtureStores.B.id}`, {
      headers: { authorization: `Bearer ${login.body.accessToken}` },
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "ACCESS_DENIED",
      message: "You do not have access to the requested organization scope.",
    });
  });

  test("rejects legacy-only identities at the mobile login boundary", async () => {
    const login = await mobileSignIn(fixtureUsers.STORE);
    assert.equal(login.response.status, 401);
    assert.equal(login.body.accessToken, undefined);

    const failures = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.eventType, "MOBILE_LOGIN_FAILED"))
      .orderBy(desc(auditEventsTable.createdAt))
      .limit(20);
    const failure = failures.find(
      (event) =>
        event.metadata &&
        typeof event.metadata === "object" &&
        (event.metadata as { email?: string }).email === fixtureUsers.STORE.email,
    );
    assert.equal(
      (failure?.metadata as { reason?: string } | null)?.reason,
      "USER_NOT_FOUND",
    );
  });
});
describe("master data tenant and lookup boundaries", () => {
  test("limits material and supplier search to the signed-in customer", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);

    const materialsResponse = await request("/api/materials/search", {
      headers: sessionHeaders(cookie),
    });
    const materials = (await materialsResponse.json()) as {
      items: Array<{ id: number }>;
    };
    assert.equal(materialsResponse.status, 200);
    assert.deepEqual(materials.items.map((item) => item.id), [fixtureMaterials.A.id]);

    const suppliersResponse = await request("/api/suppliers/search", {
      headers: sessionHeaders(cookie),
    });
    const suppliers = (await suppliersResponse.json()) as {
      items: Array<{ id: number }>;
    };
    assert.equal(suppliersResponse.status, 200);
    assert.deepEqual(suppliers.items.map((item) => item.id), [fixtureSuppliers.A.id]);

    const outsideMaterial = await request(`/api/materials/${fixtureMaterials.B.id}`, {
      headers: sessionHeaders(cookie),
    });
    const outsideSupplier = await request(`/api/suppliers/${fixtureSuppliers.B.id}`, {
      headers: sessionHeaders(cookie),
    });
    assert.equal(outsideMaterial.status, 404);
    assert.equal(outsideSupplier.status, 404);
  });

  test("requires explicit master-data permissions", async () => {
    const { cookie } = await signIn(fixtureUsers.STORE);
    const response = await request("/api/materials/search", {
      headers: sessionHeaders(cookie),
    });
    assert.equal(response.status, 403);
  });

  test("resolves exact barcodes and returns no result for unknown barcodes", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const exactResponse = await request(
      `/api/materials/search?barcode=${encodeURIComponent(`${fixturePrefix}-BAR-A`)}`,
      { headers: sessionHeaders(cookie) },
    );
    const exactBody = (await exactResponse.json()) as {
      items: Array<{ id: number; matchedBy?: string }>;
    };
    assert.equal(exactResponse.status, 200);
    assert.equal(exactBody.items[0]?.id, fixtureMaterials.A.id);
    assert.equal(exactBody.items[0]?.matchedBy, "barcode");

    const unknownResponse = await request(
      `/api/materials/search?barcode=${encodeURIComponent(`${fixturePrefix}-UNKNOWN`)}`,
      { headers: sessionHeaders(cookie) },
    );
    const unknownBody = (await unknownResponse.json()) as { items: unknown[] };
    assert.equal(unknownResponse.status, 200);
    assert.deepEqual(unknownBody.items, []);
  });

  test("recognizes by alias, matches suppliers by tax id, and returns mappings", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const recognitionResponse = await request(
      `/api/materials/recognize?alias=${encodeURIComponent(`${fixturePrefix}-coffee-alias`)}`,
      { headers: sessionHeaders(cookie) },
    );
    const recognition = (await recognitionResponse.json()) as {
      strategy: string;
      recognized: { id: number } | null;
    };
    assert.equal(recognitionResponse.status, 200);
    assert.equal(recognition.strategy, "deterministic_text_match");
    assert.equal(recognition.recognized?.id, fixtureMaterials.A.id);

    const supplierResponse = await request(
      `/api/suppliers/search?q=${encodeURIComponent(`${fixturePrefix}-TRN-A`)}`,
      { headers: sessionHeaders(cookie) },
    );
    const supplierSearch = (await supplierResponse.json()) as {
      items: Array<{ id: number }>;
    };
    assert.equal(supplierResponse.status, 200);
    assert.equal(supplierSearch.items[0]?.id, fixtureSuppliers.A.id);

    const detailResponse = await request(`/api/materials/${fixtureMaterials.A.id}`, {
      headers: sessionHeaders(cookie),
    });
    const detail = (await detailResponse.json()) as {
      supplierMappings: Array<{ supplierId: number; supplierMaterialCode: string }>;
    };
    assert.equal(detailResponse.status, 200);
    assert.equal(detail.supplierMappings[0]?.supplierId, fixtureSuppliers.A.id);
    assert.equal(detail.supplierMappings[0]?.supplierMaterialCode, `${fixturePrefix}-SUP-MAT-A`);
  });

  test("records material confirmation evidence and audit", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const response = await request("/api/materials/confirm", {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        materialId: fixtureMaterials.A.id,
        clues: { barcode: `${fixturePrefix}-BAR-A`, source: "security-test" },
      }),
    });
    assert.equal(response.status, 201);

    const [confirmation] = await db
      .select()
      .from(materialConfirmationsTable)
      .where(eq(materialConfirmationsTable.materialId, fixtureMaterials.A.id))
      .limit(1);
    assert.equal(confirmation?.userId, fixtureUsers.MANAGER.id);
    const [audit] = await db
      .select()
      .from(auditEventsTable)
      .where(
        and(
          eq(auditEventsTable.eventType, "MATERIAL_CONFIRMED"),
          eq(auditEventsTable.actorUserId, fixtureUsers.MANAGER.id),
        ),
      )
      .limit(1);
    assert.ok(audit);
  });

  test("allows admins to maintain material and supplier recognition relations", async () => {
    const { cookie } = await signIn(fixtureUsers.ADMIN);
    const headers = sessionHeaders(cookie);

    const aliasResponse = await request(`/api/admin/materials/${fixtureMaterials.A.id}/aliases`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        alias: `${fixturePrefix}-admin-alias`,
        aliasType: "SEARCH",
      }),
    });
    assert.equal(aliasResponse.status, 201);

    const barcodeResponse = await request(`/api/admin/materials/${fixtureMaterials.A.id}/barcodes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        barcode: `${fixturePrefix}-ADMIN-BAR`,
        barcodeType: "TEST",
        isPrimary: false,
      }),
    });
    assert.equal(barcodeResponse.status, 201);

    const conversionResponse = await request(
      `/api/admin/materials/${fixtureMaterials.A.id}/uom-conversions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromUom: "CS",
          toUom: "EA",
          conversionFactor: "12",
        }),
      },
    );
    assert.equal(conversionResponse.status, 201);

    const supplierAliasResponse = await request(
      `/api/admin/suppliers/${fixtureSuppliers.A.id}/aliases`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          alias: `${fixturePrefix}-admin-supplier-alias`,
          aliasType: "SEARCH",
        }),
      },
    );
    assert.equal(supplierAliasResponse.status, 201);

    const materialDetailResponse = await request(`/api/materials/${fixtureMaterials.A.id}`, {
      headers: sessionHeaders((await signIn(fixtureUsers.MANAGER)).cookie),
    });
    const detail = (await materialDetailResponse.json()) as {
      aliases: Array<{ id: number; alias: string }>;
      barcodes: Array<{ id: number; barcode: string }>;
      uomConversions: Array<{ id: number; fromUom: string; toUom: string }>;
    };
    const createdAlias = detail.aliases.find((item) => item.alias === `${fixturePrefix}-admin-alias`);
    const createdBarcode = detail.barcodes.find((item) => item.barcode === `${fixturePrefix}-ADMIN-BAR`);
    const createdConversion = detail.uomConversions.find(
      (item) => item.fromUom === "CS" && item.toUom === "EA",
    );
    assert.ok(createdAlias);
    assert.ok(createdBarcode);
    assert.ok(createdConversion);

    const deleteAliasResponse = await request(
      `/api/admin/materials/${fixtureMaterials.A.id}/aliases/${createdAlias!.id}`,
      { method: "DELETE", headers },
    );
    assert.equal(deleteAliasResponse.status, 200);
    const deleteBarcodeResponse = await request(
      `/api/admin/materials/${fixtureMaterials.A.id}/barcodes/${createdBarcode!.id}`,
      { method: "DELETE", headers },
    );
    assert.equal(deleteBarcodeResponse.status, 200);
    const deleteConversionResponse = await request(
      `/api/admin/materials/${fixtureMaterials.A.id}/uom-conversions/${createdConversion!.id}`,
      { method: "DELETE", headers },
    );
    assert.equal(deleteConversionResponse.status, 200);
  });

  test("blocks viewers from changing master-data relations", async () => {
    const { cookie } = await signIn(fixtureUsers.STORE);
    const response = await request(`/api/admin/materials/${fixtureMaterials.A.id}/aliases`, {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        alias: `${fixturePrefix}-forbidden-alias`,
        aliasType: "SEARCH",
      }),
    });
    assert.equal(response.status, 403);
  });
});

describe("operational dashboard authorization", () => {
  test("requires authentication for every operational surface", async () => {
    const response = await request("/api/transactions");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required or has expired.",
    });
  });

  test("rejects a role that cannot reach the operational surface and audits the denial", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const response = await request("/api/transactions", {
      headers: sessionHeaders(cookie),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "ACCESS_DENIED",
      message: "Your role cannot access this operational surface.",
    });

    const denied = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.actorUserId, fixtureUsers.MANAGER.id))
      .orderBy(desc(auditEventsTable.createdAt));
    const denial = denied.find(
      (event) =>
        event.eventType === "ACCESS_DENIED" &&
        event.metadata &&
        typeof event.metadata === "object" &&
        (event.metadata as { surface?: string }).surface === "transactions",
    );
    assert.ok(denial);
    assert.equal((denial.metadata as { reason?: string }).reason, "ROLE_NOT_ALLOWED");
  });

  test("narrows permitted operational records to the caller's customer and store scope", async () => {
    const { cookie } = await signIn(fixtureUsers.PEER);
    const response = await request("/api/transactions", {
      headers: sessionHeaders(cookie),
    });
    const body = (await response.json()) as {
      scope: { customerIds: number[]; propertyIds: number[]; storeIds: number[] };
      records: Array<{ id: number; code: string }>;
    };

    assert.equal(response.status, 200);
    assert.deepEqual(body.scope, {
      customerIds: [fixtureCustomers.A.id],
      propertyIds: [fixtureProperties.A.id],
      storeIds: [fixtureStores.A.id],
    });
    assert.deepEqual(body.records.map(({ id, code }) => ({ id, code })), [
      { id: fixtureStores.A.id, code: "STORE-A" },
    ]);

    const granted = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.actorUserId, fixtureUsers.PEER.id))
      .orderBy(desc(auditEventsTable.createdAt));
    const grant = granted.find(
      (event) =>
        event.eventType === "OPERATIONAL_SCOPE_GRANTED" &&
        event.metadata &&
        typeof event.metadata === "object" &&
        (event.metadata as { surface?: string }).surface === "transactions",
    );
    assert.ok(grant);
    assert.deepEqual((grant.metadata as { effectiveScope?: unknown }).effectiveScope, body.scope);
  });

  test("rejects a direct request for a store outside the caller's tenant scope", async () => {
    const { cookie } = await signIn(fixtureUsers.PEER);
    const response = await request(`/api/materials?storeId=${fixtureStores.B.id}`, {
      headers: sessionHeaders(cookie),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "ACCESS_DENIED",
      message: "You do not have access to the requested organization scope.",
    });

    const denied = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.actorUserId, fixtureUsers.PEER.id))
      .orderBy(desc(auditEventsTable.createdAt));
    const denial = denied.find(
      (event) =>
        event.eventType === "ACCESS_DENIED" &&
        event.metadata &&
        typeof event.metadata === "object" &&
        (event.metadata as { surface?: string }).surface === "materials",
    );
    assert.ok(denial);
    assert.equal(
      (denial.metadata as { reason?: string }).reason,
      "SCOPE_OUTSIDE_AUTHORIZED_TENANT",
    );
  });

  test("applies the same customer boundary to readiness", async () => {
    const { cookie } = await signIn(fixtureUsers.MANAGER);
    const response = await request("/api/readiness", {
      headers: sessionHeaders(cookie),
    });
    const body = (await response.json()) as {
      records: Array<{ code: string }>;
    };

    assert.equal(response.status, 200);
    assert.deepEqual(body.records.map(({ code }) => code), [customerA]);

    const outsideResponse = await request(
      `/api/readiness?customerId=${fixtureCustomers.B.id}`,
      {
        headers: sessionHeaders(cookie),
      },
    );
    assert.equal(outsideResponse.status, 403);
  });

  test("allows wildcard support to read audit records only within its authorized scope", async () => {
    const { cookie } = await signIn(fixtureUsers.SUPPORT);
    const response = await request("/api/audit", {
      headers: sessionHeaders(cookie),
    });
    const body = (await response.json()) as {
      scope: { customerIds: number[] };
      records: Array<{ actorUserId: number | null; targetUserId: number | null }>;
    };

    assert.equal(response.status, 200);
    assert.ok(body.scope.customerIds.includes(fixtureCustomers.A.id));
    assert.ok(body.scope.customerIds.includes(fixtureCustomers.B.id));
    assert.ok(
      body.records.some(
        ({ actorUserId }) => actorUserId === fixtureUsers.SUPPORT.id,
      ),
    );
  });
});

describe("domain user administration", () => {
  test("keeps Cloud and mobile roles isolated and validates mobile hierarchy", async () => {
    const { cookie } = await signIn(fixtureUsers.ADMIN);
    const email = `${fixturePrefix.toLowerCase()}-mobile@security-test.invalid`;
    const createdResponse = await request("/api/admin/mobile-users", {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        email,
        displayName: "Domain Mobile User",
        roleCodes: ["STORE_MANAGER"],
        customerId: fixtureCustomers.A.id,
        propertyIds: [fixtureProperties.A.id],
        storeIds: [fixtureStores.A.id],
        temporaryPassword: "Valid!Temporary123",
      }),
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()) as {
      id: number;
      notification: { status: string };
      roleCodes: string[];
      propertyIds: number[];
      storeIds: number[];
    };
    assert.deepEqual(created.roleCodes, ["STORE_MANAGER"]);
    assert.deepEqual(created.propertyIds, [fixtureProperties.A.id]);
    assert.deepEqual(created.storeIds, [fixtureStores.A.id]);
    assert.equal(created.notification.status, "NOT_CONFIGURED");
    assert.equal("temporaryPassword" in created, false);

    const cloudRoleResponse = await request("/api/admin/mobile-users", {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        email: `${fixturePrefix.toLowerCase()}-wrong-role@security-test.invalid`,
        displayName: "Wrong Role",
        roleCodes: ["CLOUD_SUPER_ADMIN"],
        customerId: fixtureCustomers.A.id,
        propertyIds: [fixtureProperties.A.id],
        storeIds: [fixtureStores.A.id],
      }),
    });
    assert.equal(cloudRoleResponse.status, 422);

    const invalidHierarchyResponse = await request("/api/admin/mobile-users", {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        email: `${fixturePrefix.toLowerCase()}-wrong-scope@security-test.invalid`,
        displayName: "Wrong Scope",
        roleCodes: ["STORE_MANAGER"],
        customerId: fixtureCustomers.A.id,
        propertyIds: [fixtureProperties.B.id],
        storeIds: [fixtureStores.B.id],
      }),
    });
    assert.equal(invalidHierarchyResponse.status, 422);

    const resetResponse = await request(`/api/admin/mobile-users/${created.id}/reset-password`, {
      method: "POST",
      headers: sessionHeaders(cookie),
    });
    assert.equal(resetResponse.status, 200);
    const resetBody = (await resetResponse.json()) as Record<string, unknown>;
    assert.equal("temporaryPassword" in resetBody, false);
    const [resetUser] = await db
      .select({
        status: mobileUsersTable.status,
        mustChangePassword: mobileUsersTable.mustChangePassword,
        failedLoginAttempts: mobileUsersTable.failedLoginAttempts,
        lockedUntil: mobileUsersTable.lockedUntil,
        passwordChangedAt: mobileUsersTable.passwordChangedAt,
      })
      .from(mobileUsersTable)
      .where(eq(mobileUsersTable.id, created.id))
      .limit(1);
    assert.deepEqual(resetUser, {
      status: "ACTIVE",
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: null,
    });

    await db.delete(mobileUsersTable).where(eq(mobileUsersTable.id, created.id));
    await db.delete(userAccountsTable).where(like(userAccountsTable.email, `${fixturePrefix.toLowerCase()}-mobile@security-test.invalid`));
  });

  test("does not expose customer scope fields on Cloud user creation", async () => {
    const { cookie } = await signIn(fixtureUsers.ADMIN);
    const response = await request("/api/admin/cloud-users", {
      method: "POST",
      headers: sessionHeaders(cookie),
      body: JSON.stringify({
        email: `${fixturePrefix.toLowerCase()}-cloud@security-test.invalid`,
        displayName: "Domain Cloud User",
        roleCodes: ["CLOUD_SUPER_ADMIN"],
        temporaryPassword: "Valid!Temporary123",
        customerId: fixtureCustomers.A.id,
      }),
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal("customer" in body, false);
    assert.equal("propertyIds" in body, false);
    assert.equal("storeIds" in body, false);
    assert.deepEqual(body.roleCodes, ["CLOUD_SUPER_ADMIN"]);
    const cloudId = Number(body.id);
    await db.delete(cloudUsersTable).where(eq(cloudUsersTable.id, cloudId));
    await db.delete(userAccountsTable).where(like(userAccountsTable.email, `${fixturePrefix.toLowerCase()}-cloud@security-test.invalid`));
  });
});
