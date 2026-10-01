import {
  customersTable,
  db,
  mobileConfigurationsTable,
  materialAliasesTable,
  materialBarcodesTable,
  materialsTable,
  materialUomConversionsTable,
  supplierAliasesTable,
  supplierMaterialMappingsTable,
  suppliersTable,
  permissionsTable,
  propertiesTable,
  rolePermissionsTable,
  rolesTable,
  storesTable,
  userAccountsTable,
  userCustomerAccessTable,
  userPropertyAccessTable,
  userRolesTable,
  userStoreAccessTable,
} from "@workspace/db";
import { and, count, eq, isNull } from "drizzle-orm";
import { passwordDigest, SUPPORTED_ROLES } from "./access";

const seedUsers = [
  {
    code: "ADMIN001",
    email: "admin@sila.cloud",
    name: "Platform Ops",
    role: "SUPER_ADMIN",
    customerScope: "*",
    propertyScope: "*",
    storeScope: "*",
  },
  {
    code: "SUPPORT001",
    email: "support@sila.cloud",
    name: "Customer Support",
    role: "CUSTOMER_SUPPORT_COORDINATOR",
    customerScope: "*",
    propertyScope: "*",
    storeScope: "*",
  },
  {
    code: "SRIRAM001",
    email: "sriram@sila.cloud",
    name: "Sriram Krishnan",
    role: "STORE_MANAGER",
    customerScope: "FIVE",
    propertyScope: "FIVE_PALM",
    storeScope: "MAIN_STORE",
  },
  {
    code: "INVCTRL001",
    email: "amira@sila.cloud",
    name: "Amira Hussain",
    role: "INVENTORY_CONTROLLER",
    customerScope: "FIVE",
    propertyScope: "FIVE_PALM",
    storeScope: "*",
  },
  {
    code: "PROCMGR001",
    email: "nikhil@sila.cloud",
    name: "Nikhil Menon",
    role: "PROCUREMENT_MANAGER",
    customerScope: "FIVE",
    propertyScope: "*",
    storeScope: "*",
  },
  {
    code: "FINMGR001",
    email: "leena@sila.cloud",
    name: "Leena Dsouza",
    role: "FINANCE_MANAGER",
    customerScope: "FIVE",
    propertyScope: "*",
    storeScope: "*",
    status: "Suspended",
  },
] as const;

const permissionNames: Record<string, string> = {
  MANAGE_USERS: "Manage users",
  MANAGE_ROLES: "Manage roles",
  MANAGE_CONFIGURATION: "Manage configuration",
  MANAGE_ORGANIZATION: "Manage customers, properties, and stores",
  VIEW_AUDIT: "View audit history",
  VIEW_MATERIALS: "View material master",
  MANAGE_MATERIALS: "Manage material master",
  VIEW_SUPPLIERS: "View supplier master",
  MANAGE_SUPPLIERS: "Manage supplier master",
  RECEIVE_GOODS: "Receive goods",
  COUNT_INVENTORY: "Count inventory",
  TRANSFER_STOCK: "Transfer stock",
  ISSUE_GOODS: "Issue goods",
  WRITE_OFF_STOCK: "Write off stock",
  SCAN_DOCUMENT: "Scan documents",
  APPROVE_TRANSACTIONS: "Approve transactions",
  CREATE_MOBILE_USER: "Create and manage mobile users",
  CREATE_CLOUD_USER: "Create and manage Cloud users",
  RESET_USER_PASSWORD: "Reset user passwords",
};

const rolePermissionCodes: Record<string, string[]> = {
  SUPER_ADMIN: Object.keys(permissionNames),
  CLOUD_SUPER_ADMIN: ["MANAGE_USERS", "MANAGE_ROLES", "MANAGE_CONFIGURATION", "MANAGE_ORGANIZATION", "VIEW_AUDIT", "CREATE_MOBILE_USER", "CREATE_CLOUD_USER", "RESET_USER_PASSWORD"],
  MOBILE_SUPER_ADMIN: ["MANAGE_USERS", "MANAGE_CONFIGURATION", "VIEW_AUDIT"],
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
  INVENTORY_CONTROLLER: ["COUNT_INVENTORY", "TRANSFER_STOCK", "WRITE_OFF_STOCK", "VIEW_MATERIALS"],
  PROCUREMENT_MANAGER: [
    "RECEIVE_GOODS",
    "APPROVE_TRANSACTIONS",
    "VIEW_MATERIALS",
    "VIEW_SUPPLIERS",
  ],
  FINANCE_MANAGER: ["VIEW_AUDIT", "APPROVE_TRANSACTIONS"],
};

async function seedOrganizations(): Promise<void> {
  await db
    .insert(customersTable)
    .values({ code: "FIVE", name: "FIVE Holdings" })
    .onConflictDoNothing();
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.code, "FIVE"))
    .limit(1);
  if (!customer) return;

  await db
    .insert(propertiesTable)
    .values({
      customerId: customer.id,
      code: "FIVE_PALM",
      name: "FIVE Palm Jumeirah",
    })
    .onConflictDoNothing();
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.customerId, customer.id),
        eq(propertiesTable.code, "FIVE_PALM"),
      ),
    )
    .limit(1);
  if (!property) return;

  await db
    .insert(storesTable)
    .values({
      propertyId: property.id,
      code: "MAIN_STORE",
      name: "Main Store",
    })
    .onConflictDoNothing();

  const [configuration] = await db
    .select({ id: mobileConfigurationsTable.id })
    .from(mobileConfigurationsTable)
    .where(
      and(
        eq(mobileConfigurationsTable.customerId, customer.id),
        isNull(mobileConfigurationsTable.propertyId),
        isNull(mobileConfigurationsTable.storeId),
      ),
    )
    .limit(1);
  if (!configuration) {
    await db.insert(mobileConfigurationsTable).values({
      customerId: customer.id,
      configurationVersion: 3,
      receiveGoods: true,
      inventoryCount: true,
      approvals: true,
    });
  }
}

async function seedMasterData(): Promise<void> {
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.code, "FIVE"))
    .limit(1);
  if (!customer) return;

  const materialValues = [
    {
      customerId: customer.id,
      materialCode: "MAT-100842",
      materialDescription: "Arabica coffee beans 1kg",
      shortDescription: "Coffee beans 1kg",
      materialGroup: "BEVERAGE",
      category: "Beverage",
      brand: "SILA Select",
      baseUom: "KG",
      purchaseUom: "BAG",
      plantCode: "DXB-1001",
      storageLocation: "WH-1001",
      batchManaged: true,
      expiryManaged: true,
      sourceSystem: "DEV_DATABASE",
    },
    {
      customerId: customer.id,
      materialCode: "MAT-100991",
      materialDescription: "Sparkling water 330ml",
      shortDescription: "Sparkling water",
      materialGroup: "BEVERAGE",
      category: "Beverage",
      brand: "SILA Select",
      baseUom: "EA",
      purchaseUom: "CS",
      plantCode: "DXB-1001",
      storageLocation: "WH-1002",
      sourceSystem: "DEV_DATABASE",
    },
    {
      customerId: customer.id,
      materialCode: "MAT-204110",
      materialDescription: "Fresh salmon fillet",
      shortDescription: "Salmon fillet",
      materialGroup: "FOOD",
      category: "Food",
      brand: "Gulf Fresh",
      baseUom: "KG",
      purchaseUom: "KG",
      plantCode: "DXB-1001",
      storageLocation: "WH-1003",
      batchManaged: true,
      expiryManaged: true,
      sourceSystem: "DEV_DATABASE",
    },
  ];
  for (const value of materialValues) {
    await db.insert(materialsTable).values(value).onConflictDoNothing();
  }
  const materials = await db
    .select()
    .from(materialsTable)
    .where(eq(materialsTable.customerId, customer.id));
  const materialByCode = new Map(materials.map((material) => [material.materialCode, material]));

  const relationRows = [
    {
      materialCode: "MAT-100842",
      alias: "coffee beans",
      aliasType: "SEARCH",
      barcode: "6291100008421",
      barcodeType: "EAN13",
      conversion: { fromUom: "BAG", toUom: "KG", conversionFactor: "1.000000" },
    },
    {
      materialCode: "MAT-100991",
      alias: "sparkling water 330 ml",
      aliasType: "SEARCH",
      barcode: "6291100009919",
      barcodeType: "EAN13",
      conversion: { fromUom: "CS", toUom: "EA", conversionFactor: "24.000000" },
    },
    {
      materialCode: "MAT-204110",
      alias: "salmon fillet",
      aliasType: "SEARCH",
      barcode: "6291100041107",
      barcodeType: "EAN13",
      conversion: { fromUom: "KG", toUom: "KG", conversionFactor: "1.000000" },
    },
  ];
  for (const relation of relationRows) {
    const material = materialByCode.get(relation.materialCode);
    if (!material) continue;
    await db
      .insert(materialAliasesTable)
      .values({
        materialId: material.id,
        alias: relation.alias,
        aliasType: relation.aliasType,
        active: true,
      })
      .onConflictDoNothing();
    await db
      .insert(materialBarcodesTable)
      .values({
        materialId: material.id,
        barcode: relation.barcode,
        barcodeType: relation.barcodeType,
        isPrimary: true,
        active: true,
      })
      .onConflictDoNothing();
    await db
      .insert(materialUomConversionsTable)
      .values({ materialId: material.id, ...relation.conversion, sourceSystem: "DEV_DATABASE" })
      .onConflictDoNothing();
  }

  const supplierValues = [
    {
      customerId: customer.id,
      supplierCode: "SUP-0042",
      supplierName: "Gulf Food Services",
      legalName: "Gulf Food Services LLC",
      taxRegistrationNumber: "TRN-FIVE-0042",
      countryCode: "AE",
      email: "orders@gulffood.example",
      sourceSystem: "DEV_DATABASE",
    },
    {
      customerId: customer.id,
      supplierCode: "SUP-0081",
      supplierName: "Hotel Essentials Trading",
      legalName: "Hotel Essentials Trading LLC",
      taxRegistrationNumber: "TRN-FIVE-0081",
      countryCode: "AE",
      email: "procurement@hotelessentials.example",
      sourceSystem: "DEV_DATABASE",
    },
  ];
  for (const value of supplierValues) {
    await db.insert(suppliersTable).values(value).onConflictDoNothing();
  }
  const suppliers = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.customerId, customer.id));
  const supplierByCode = new Map(suppliers.map((supplier) => [supplier.supplierCode, supplier]));
  const supplierAliasValues = [
    { supplierCode: "SUP-0042", alias: "Gulf Foods", aliasType: "SEARCH" },
    { supplierCode: "SUP-0081", alias: "Hotel Essentials", aliasType: "SEARCH" },
  ];
  for (const value of supplierAliasValues) {
    const supplier = supplierByCode.get(value.supplierCode);
    if (!supplier) continue;
    await db.insert(supplierAliasesTable).values({ supplierId: supplier.id, ...value }).onConflictDoNothing();
  }
  const mappingValues = [
    {
      supplierCode: "SUP-0042",
      materialCode: "MAT-100842",
      supplierMaterialCode: "GFS-COFFEE-1KG",
      supplierDescription: "Arabica beans premium 1kg",
      supplierUom: "BAG",
      supplierPackSize: "1kg",
    },
    {
      supplierCode: "SUP-0081",
      materialCode: "MAT-100991",
      supplierMaterialCode: "HE-WATER-330",
      supplierDescription: "Sparkling mineral water 330ml",
      supplierUom: "CS",
      supplierPackSize: "24 x 330ml",
    },
  ];
  for (const value of mappingValues) {
    const supplier = supplierByCode.get(value.supplierCode);
    const material = materialByCode.get(value.materialCode);
    if (!supplier || !material) continue;
    await db
      .insert(supplierMaterialMappingsTable)
      .values({
        customerId: customer.id,
        supplierId: supplier.id,
        materialId: material.id,
        supplierMaterialCode: value.supplierMaterialCode,
        supplierDescription: value.supplierDescription,
        supplierUom: value.supplierUom,
        supplierPackSize: value.supplierPackSize,
        sourceSystem: "DEV_DATABASE",
      })
      .onConflictDoNothing();
  }
}

async function seedRolesAndPermissions(): Promise<void> {
  const cloudRoles = new Set(["SUPER_ADMIN", "CLOUD_SUPER_ADMIN", "CUSTOMER_SUPPORT_COORDINATOR", "CUSTOMER_MANAGER"]);
  const mobileRoles = new Set(["MOBILE_SUPER_ADMIN", "STORE_MANAGER", "INVENTORY_CONTROLLER", "PROCUREMENT_MANAGER", "FINANCE_MANAGER"]);
  for (const role of SUPPORTED_ROLES) {
    const applicationScope = cloudRoles.has(role) ? "CLOUD" : mobileRoles.has(role) ? "MOBILE" : "BOTH";
    await db
      .insert(rolesTable)
      .values({
        code: role,
        name: role
          .split("_")
          .map((word) => word[0] + word.slice(1).toLowerCase())
          .join(" "),
        applicationScope,
      })
      .onConflictDoUpdate({ target: rolesTable.code, set: { applicationScope } });
  }
  for (const [code, name] of Object.entries(permissionNames)) {
    await db.insert(permissionsTable).values({ code, name }).onConflictDoNothing();
  }

  const roles = await db.select().from(rolesTable);
  const permissions = await db.select().from(permissionsTable);
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));
  for (const role of roles) {
    for (const permissionCode of rolePermissionCodes[role.code] ?? []) {
      const permission = permissionByCode.get(permissionCode);
      if (!permission) continue;
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: role.id, permissionId: permission.id })
        .onConflictDoNothing();
    }
  }
}

async function seedLegacyUserAccess(): Promise<void> {
  const [users, roles, customers, properties, stores] = await Promise.all([
    db.select().from(userAccountsTable),
    db.select().from(rolesTable),
    db.select().from(customersTable),
    db.select().from(propertiesTable),
    db.select().from(storesTable),
  ]);
  const roleByCode = new Map(roles.map((role) => [role.code, role]));
  const customerByCode = new Map(customers.map((customer) => [customer.code, customer]));
  const propertyByCode = new Map(properties.map((property) => [property.code, property]));
  const storeByCode = new Map(stores.map((store) => [store.code, store]));

  for (const user of users) {
    const role = roleByCode.get(user.role);
    if (role) {
      await db
        .insert(userRolesTable)
        .values({ userId: user.id, roleId: role.id })
        .onConflictDoNothing();
    }
    const customer = customerByCode.get(user.customerScope);
    if (customer) {
      await db
        .insert(userCustomerAccessTable)
        .values({ userId: user.id, customerId: customer.id })
        .onConflictDoNothing();
    }
    const property = propertyByCode.get(user.propertyScope);
    if (property) {
      await db
        .insert(userPropertyAccessTable)
        .values({ userId: user.id, propertyId: property.id })
        .onConflictDoNothing();
    }
    const store = storeByCode.get(user.storeScope);
    if (store) {
      await db
        .insert(userStoreAccessTable)
        .values({ userId: user.id, storeId: store.id })
        .onConflictDoNothing();
    }
  }
}

const developmentSeedPassword = process.env.SILA_DEV_PASSWORD;

export async function seedUserAccounts(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return;

  const [{ value }] = await db.select({ value: count() }).from(userAccountsTable);
  if (value === 0 && developmentSeedPassword) {
    await db.insert(userAccountsTable).values(
      seedUsers.map((user) => ({
        ...user,
        authProvider: "SILA Local Login",
        passwordHash: passwordDigest(developmentSeedPassword),
      })),
    );
  } else if (value === 0) {
    console.warn(
      "Skipping development user seeding: set SILA_DEV_PASSWORD in the local API environment to enable it.",
    );
  }

  await seedOrganizations();
  await seedMasterData();
  await seedRolesAndPermissions();
  await seedLegacyUserAccess();
}
