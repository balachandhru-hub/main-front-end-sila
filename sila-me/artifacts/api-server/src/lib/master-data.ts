import { and, eq, inArray } from "drizzle-orm";
import {
  customersTable,
  db,
  materialAliasesTable,
  materialBarcodesTable,
  materialConfirmationsTable,
  materialsTable,
  materialUomConversionsTable,
  supplierAliasesTable,
  supplierMaterialMappingsTable,
  suppliersTable,
  type Material,
  type Supplier,
} from "@workspace/db";

export type MasterDataScope = { customerIds: number[] };

export type MaterialSummary = Material & {
  customerCode: string;
  matchedBy?: string;
};

export type MaterialDetail = MaterialSummary & {
  aliases: typeof materialAliasesTable.$inferSelect[];
  barcodes: typeof materialBarcodesTable.$inferSelect[];
  uomConversions: typeof materialUomConversionsTable.$inferSelect[];
  supplierMappings: Array<
    typeof supplierMaterialMappingsTable.$inferSelect & {
      supplierCode: string;
      supplierName: string;
    }
  >;
};

export type SupplierSummary = Supplier & {
  customerCode: string;
  matchedBy?: string;
};

export type SupplierDetail = SupplierSummary & {
  aliases: typeof supplierAliasesTable.$inferSelect[];
  materialMappings: Array<
    typeof supplierMaterialMappingsTable.$inferSelect & {
      materialCode: string;
      materialDescription: string;
    }
  >;
};

export type MaterialSearchInput = MasterDataScope & {
  query?: string;
  barcode?: string;
  plantCode?: string;
  limit?: number;
  offset?: number;
};

export type SupplierSearchInput = MasterDataScope & {
  query?: string;
  limit?: number;
  offset?: number;
};

export class MasterDataNotFoundError extends Error {}
export class MasterDataConflictError extends Error {}

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function contains(haystack: string | null | undefined, needle: string): boolean {
  return normalized(haystack).includes(normalized(needle));
}

function exact(haystack: string | null | undefined, needle: string): boolean {
  return normalized(haystack) === normalized(needle);
}

function requireScope(scope: MasterDataScope): number[] {
  return [...new Set(scope.customerIds)].filter((id) => Number.isInteger(id));
}

async function customersByIds(customerIds: number[]) {
  if (customerIds.length === 0) return [];
  return db
    .select()
    .from(customersTable)
    .where(inArray(customersTable.id, customerIds));
}

async function materialRows(scope: MasterDataScope, includeInactive = false) {
  const customerIds = requireScope(scope);
  if (customerIds.length === 0) return [];
  return db
    .select()
    .from(materialsTable)
    .where(
      and(
        inArray(materialsTable.customerId, customerIds),
        includeInactive ? undefined : eq(materialsTable.active, true),
      ),
    );
}

async function supplierRows(scope: MasterDataScope, includeInactive = false) {
  const customerIds = requireScope(scope);
  if (customerIds.length === 0) return [];
  return db
    .select()
    .from(suppliersTable)
    .where(
      and(
        inArray(suppliersTable.customerId, customerIds),
        includeInactive ? undefined : eq(suppliersTable.active, true),
      ),
    );
}

function scoreMaterial(material: Material, aliases: string[], query: string): [number, string] {
  const candidates: Array<[string | null | undefined, string]> = [
    [material.materialCode, "material_code"],
    [material.supplierMaterialCode, "supplier_material_code"],
    [material.manufacturerPartNumber, "manufacturer_part_number"],
    [material.materialDescription, "description"],
    [material.shortDescription, "short_description"],
    [material.brand, "brand"],
    [material.category, "category"],
    ...aliases.map((alias) => [alias, "alias"] as [string, string]),
  ];
  const exactMatch = candidates.find(([value]) => exact(value, query));
  if (exactMatch) return [100, exactMatch[1]];
  const prefixMatch = candidates.find(([value]) => normalized(value).startsWith(normalized(query)));
  if (prefixMatch) return [80, prefixMatch[1]];
  const partialMatch = candidates.find(([value]) => contains(value, query));
  return partialMatch ? [50, partialMatch[1]] : [0, ""];
}

function materialSummary(
  material: Material,
  customerCodeById: Map<number, string>,
  matchedBy?: string,
): MaterialSummary {
  return {
    ...material,
    customerCode: customerCodeById.get(material.customerId) ?? "UNKNOWN",
    ...(matchedBy ? { matchedBy } : {}),
  };
}

function supplierSummary(
  supplier: Supplier,
  customerCodeById: Map<number, string>,
  matchedBy?: string,
): SupplierSummary {
  return {
    ...supplier,
    customerCode: customerCodeById.get(supplier.customerId) ?? "UNKNOWN",
    ...(matchedBy ? { matchedBy } : {}),
  };
}

export interface MaterialProvider {
  search(input: MaterialSearchInput): Promise<MaterialSummary[]>;
  getById(id: number, scope: MasterDataScope): Promise<MaterialDetail>;
  getByCode(code: string, scope: MasterDataScope, plantCode?: string): Promise<MaterialDetail>;
  recognize(
    clues: Record<string, unknown>,
    scope: MasterDataScope,
  ): Promise<{ strategy: string; candidates: MaterialSummary[] }>;
  confirm(
    materialId: number,
    scope: MasterDataScope,
    userId: number,
    clues: Record<string, unknown>,
  ): Promise<MaterialDetail>;
  create(input: NewMaterial, scope: MasterDataScope): Promise<MaterialDetail>;
  update(id: number, input: Partial<NewMaterial>, scope: MasterDataScope): Promise<MaterialDetail>;
  createAlias(materialId: number, input: NewMaterialAlias, scope: MasterDataScope): Promise<MaterialDetail>;
  deleteAlias(materialId: number, aliasId: number, scope: MasterDataScope): Promise<MaterialDetail>;
  createBarcode(materialId: number, input: NewMaterialBarcode, scope: MasterDataScope): Promise<MaterialDetail>;
  deleteBarcode(materialId: number, barcodeId: number, scope: MasterDataScope): Promise<MaterialDetail>;
  createUomConversion(
    materialId: number,
    input: NewMaterialUomConversion,
    scope: MasterDataScope,
  ): Promise<MaterialDetail>;
  deleteUomConversion(materialId: number, conversionId: number, scope: MasterDataScope): Promise<MaterialDetail>;
}

export interface SupplierProvider {
  search(input: SupplierSearchInput): Promise<SupplierSummary[]>;
  getById(id: number, scope: MasterDataScope): Promise<SupplierDetail>;
  getByCode(code: string, scope: MasterDataScope): Promise<SupplierDetail>;
  create(input: NewSupplier, scope: MasterDataScope): Promise<SupplierDetail>;
  update(id: number, input: Partial<NewSupplier>, scope: MasterDataScope): Promise<SupplierDetail>;
  createMapping(input: NewSupplierMaterialMapping, scope: MasterDataScope): Promise<SupplierDetail>;
  updateMapping(
    id: number,
    input: Partial<NewSupplierMaterialMapping>,
    scope: MasterDataScope,
  ): Promise<SupplierDetail>;
  createAlias(supplierId: number, input: NewSupplierAlias, scope: MasterDataScope): Promise<SupplierDetail>;
  deleteAlias(supplierId: number, aliasId: number, scope: MasterDataScope): Promise<SupplierDetail>;
}

export type NewMaterial = {
  customerId: number;
  materialCode: string;
  materialDescription: string;
  shortDescription?: string | null;
  materialGroup?: string | null;
  category?: string | null;
  brand?: string | null;
  baseUom: string;
  purchaseUom?: string | null;
  supplierMaterialCode?: string | null;
  manufacturerPartNumber?: string | null;
  plantCode?: string | null;
  storageLocation?: string | null;
  batchManaged?: boolean;
  expiryManaged?: boolean;
  active?: boolean;
  sourceSystem?: string;
  externalId?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export type NewSupplier = {
  customerId: number;
  supplierCode: string;
  supplierName: string;
  legalName?: string | null;
  taxRegistrationNumber?: string | null;
  countryCode?: string | null;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
  sourceSystem?: string;
  externalId?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export type NewSupplierMaterialMapping = {
  customerId: number;
  supplierId: number;
  materialId: number;
  supplierMaterialCode?: string | null;
  supplierDescription?: string | null;
  supplierUom?: string | null;
  supplierPackSize?: string | null;
  active?: boolean;
  sourceSystem?: string;
};

export type NewMaterialAlias = {
  alias: string;
  aliasType: string;
  active?: boolean;
};

export type NewMaterialBarcode = {
  barcode: string;
  barcodeType?: string | null;
  isPrimary?: boolean;
  active?: boolean;
};

export type NewMaterialUomConversion = {
  fromUom: string;
  toUom: string;
  conversionFactor: string;
  sourceSystem?: string;
  active?: boolean;
};

export type NewSupplierAlias = {
  alias: string;
  aliasType: string;
  active?: boolean;
};

export class DatabaseMaterialProvider implements MaterialProvider {
  async search(input: MaterialSearchInput): Promise<MaterialSummary[]> {
    const materials = (await materialRows(input)).filter(
      (material) => !input.plantCode || exact(material.plantCode, input.plantCode),
    );
    const customerRows = await customersByIds(input.customerIds);
    const customerCodeById = new Map(customerRows.map((customer) => [customer.id, customer.code]));
    const ids = materials.map((material) => material.id);
    const [aliases, barcodes] = ids.length
      ? await Promise.all([
          db.select().from(materialAliasesTable).where(inArray(materialAliasesTable.materialId, ids)),
          db.select().from(materialBarcodesTable).where(inArray(materialBarcodesTable.materialId, ids)),
        ])
      : [[], []];
    const aliasesByMaterial = new Map<number, string[]>();
    for (const alias of aliases) {
      const values = aliasesByMaterial.get(alias.materialId) ?? [];
      values.push(alias.alias);
      aliasesByMaterial.set(alias.materialId, values);
    }
    const barcode = normalized(input.barcode);
    const query = normalized(input.query);
    let rows = materials.flatMap((material) => {
      const materialAliases = aliasesByMaterial.get(material.id) ?? [];
      if (barcode) {
        const exactBarcode = barcodes.some(
          (entry) =>
            entry.materialId === material.id &&
            entry.active &&
            exact(entry.barcode, barcode),
        );
        return exactBarcode ? [materialSummary(material, customerCodeById, "barcode")] : [];
      }
      if (!query) return [materialSummary(material, customerCodeById)];
      const [score, matchedBy] = scoreMaterial(material, materialAliases, query);
      return score > 0 ? [{ ...materialSummary(material, customerCodeById, matchedBy), _score: score }] : [];
    });
    rows.sort((a, b) => {
      const scoreDifference = (b as MaterialSummary & { _score?: number })._score ?? 0;
      const otherScore = (a as MaterialSummary & { _score?: number })._score ?? 0;
      return scoreDifference - otherScore || a.materialCode.localeCompare(b.materialCode);
    });
    const offset = input.offset ?? 0;
    const limit = Math.min(input.limit ?? 50, 100);
    return rows
      .slice(offset, offset + limit)
      .map((row) => {
        const result = { ...row } as MaterialSummary & { _score?: number };
        delete result._score;
        return result;
      });
  }

  async getById(id: number, scope: MasterDataScope): Promise<MaterialDetail> {
    const rows = await materialRows(scope, true);
    const material = rows.find((candidate) => candidate.id === id);
    if (!material) throw new MasterDataNotFoundError("Material not found.");
    return this.detail(material, scope);
  }

  async getByCode(code: string, scope: MasterDataScope, plantCode?: string): Promise<MaterialDetail> {
    const rows = (await materialRows(scope, true)).filter(
      (material) =>
        exact(material.materialCode, code) &&
        (!plantCode || exact(material.plantCode, plantCode)),
    );
    if (rows.length === 0) throw new MasterDataNotFoundError("Material not found.");
    if (rows.length > 1) {
      throw new MasterDataConflictError("Material code requires a plantCode to disambiguate.");
    }
    return this.detail(rows[0], scope);
  }

  async recognize(
    clues: Record<string, unknown>,
    scope: MasterDataScope,
  ): Promise<{ strategy: string; candidates: MaterialSummary[] }> {
    const barcode = typeof clues.barcode === "string" ? clues.barcode : undefined;
    if (barcode) {
      const matches = await this.search({ ...scope, barcode, limit: 10 });
      if (matches.length > 0) return { strategy: "exact_barcode", candidates: matches };
    }
    const directCode =
      typeof clues.materialCode === "string"
        ? clues.materialCode
        : typeof clues.supplierMaterialCode === "string"
          ? clues.supplierMaterialCode
          : undefined;
    if (directCode) {
      const matches = await this.search({ ...scope, query: directCode, limit: 10 });
      if (matches.length > 0) return { strategy: "exact_or_prefix_code", candidates: matches };
    }
    const text = [clues.description, clues.alias, clues.brand, clues.category]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
    return {
      strategy: text ? "deterministic_text_match" : "no_match",
      candidates: text ? await this.search({ ...scope, query: text, limit: 10 }) : [],
    };
  }

  async confirm(
    materialId: number,
    scope: MasterDataScope,
    userId: number,
    clues: Record<string, unknown>,
  ): Promise<MaterialDetail> {
    const detail = await this.getById(materialId, scope);
    await db.insert(materialConfirmationsTable).values({
      customerId: detail.customerId,
      materialId,
      userId,
      clues,
    });
    return detail;
  }

  async create(input: NewMaterial, scope: MasterDataScope): Promise<MaterialDetail> {
    if (!scope.customerIds.includes(input.customerId)) throw new MasterDataNotFoundError("Customer not found.");
    const [material] = await db
      .insert(materialsTable)
      .values({
        ...input,
        materialCode: input.materialCode.trim(),
        materialDescription: input.materialDescription.trim(),
        baseUom: input.baseUom.trim().toUpperCase(),
        sourceSystem: input.sourceSystem ?? "DEV_DATABASE",
      })
      .returning();
    if (!material) throw new MasterDataConflictError("Could not create material.");
    return this.detail(material, scope);
  }

  async update(id: number, input: Partial<NewMaterial>, scope: MasterDataScope): Promise<MaterialDetail> {
    const current = await this.getById(id, scope);
    if (input.customerId !== undefined && !scope.customerIds.includes(input.customerId)) {
      throw new MasterDataNotFoundError("Customer not found.");
    }
    const [material] = await db
      .update(materialsTable)
      .set({
        ...input,
        ...(input.materialCode ? { materialCode: input.materialCode.trim() } : {}),
        ...(input.materialDescription ? { materialDescription: input.materialDescription.trim() } : {}),
        ...(input.baseUom ? { baseUom: input.baseUom.trim().toUpperCase() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(materialsTable.id, current.id))
      .returning();
    if (!material) throw new MasterDataNotFoundError("Material not found.");
    return this.detail(material, scope);
  }

  async createAlias(
    materialId: number,
    input: NewMaterialAlias,
    scope: MasterDataScope,
  ): Promise<MaterialDetail> {
    await this.getById(materialId, scope);
    await db.insert(materialAliasesTable).values({
      materialId,
      alias: input.alias.trim(),
      aliasType: input.aliasType.trim(),
      active: input.active ?? true,
    });
    return this.getById(materialId, scope);
  }

  async deleteAlias(materialId: number, aliasId: number, scope: MasterDataScope): Promise<MaterialDetail> {
    await this.getById(materialId, scope);
    const deleted = await db
      .delete(materialAliasesTable)
      .where(and(eq(materialAliasesTable.id, aliasId), eq(materialAliasesTable.materialId, materialId)))
      .returning({ id: materialAliasesTable.id });
    if (deleted.length === 0) throw new MasterDataNotFoundError("Material alias not found.");
    return this.getById(materialId, scope);
  }

  async createBarcode(
    materialId: number,
    input: NewMaterialBarcode,
    scope: MasterDataScope,
  ): Promise<MaterialDetail> {
    await this.getById(materialId, scope);
    await db.insert(materialBarcodesTable).values({
      materialId,
      barcode: input.barcode.trim(),
      barcodeType: input.barcodeType ?? null,
      isPrimary: input.isPrimary ?? false,
      active: input.active ?? true,
    });
    return this.getById(materialId, scope);
  }

  async deleteBarcode(materialId: number, barcodeId: number, scope: MasterDataScope): Promise<MaterialDetail> {
    await this.getById(materialId, scope);
    const deleted = await db
      .delete(materialBarcodesTable)
      .where(and(eq(materialBarcodesTable.id, barcodeId), eq(materialBarcodesTable.materialId, materialId)))
      .returning({ id: materialBarcodesTable.id });
    if (deleted.length === 0) throw new MasterDataNotFoundError("Material barcode not found.");
    return this.getById(materialId, scope);
  }

  async createUomConversion(
    materialId: number,
    input: NewMaterialUomConversion,
    scope: MasterDataScope,
  ): Promise<MaterialDetail> {
    await this.getById(materialId, scope);
    await db
      .insert(materialUomConversionsTable)
      .values({
        materialId,
        fromUom: input.fromUom.trim().toUpperCase(),
        toUom: input.toUom.trim().toUpperCase(),
        conversionFactor: input.conversionFactor,
        sourceSystem: input.sourceSystem ?? "DEV_DATABASE",
        active: input.active ?? true,
      })
      .onConflictDoUpdate({
        target: [
          materialUomConversionsTable.materialId,
          materialUomConversionsTable.fromUom,
          materialUomConversionsTable.toUom,
        ],
        set: {
          conversionFactor: input.conversionFactor,
          sourceSystem: input.sourceSystem ?? "DEV_DATABASE",
          active: input.active ?? true,
          updatedAt: new Date(),
        },
      });
    return this.getById(materialId, scope);
  }

  async deleteUomConversion(
    materialId: number,
    conversionId: number,
    scope: MasterDataScope,
  ): Promise<MaterialDetail> {
    await this.getById(materialId, scope);
    const deleted = await db
      .delete(materialUomConversionsTable)
      .where(
        and(
          eq(materialUomConversionsTable.id, conversionId),
          eq(materialUomConversionsTable.materialId, materialId),
        ),
      )
      .returning({ id: materialUomConversionsTable.id });
    if (deleted.length === 0) throw new MasterDataNotFoundError("UOM conversion not found.");
    return this.getById(materialId, scope);
  }

  private async detail(material: Material, scope: MasterDataScope): Promise<MaterialDetail> {
    const [customerRows, aliases, barcodes, uomConversions, mappings] = await Promise.all([
      customersByIds([material.customerId]),
      db.select().from(materialAliasesTable).where(eq(materialAliasesTable.materialId, material.id)),
      db.select().from(materialBarcodesTable).where(eq(materialBarcodesTable.materialId, material.id)),
      db
        .select()
        .from(materialUomConversionsTable)
        .where(eq(materialUomConversionsTable.materialId, material.id)),
      db
        .select({
          id: supplierMaterialMappingsTable.id,
          customerId: supplierMaterialMappingsTable.customerId,
          supplierId: supplierMaterialMappingsTable.supplierId,
          materialId: supplierMaterialMappingsTable.materialId,
          supplierMaterialCode: supplierMaterialMappingsTable.supplierMaterialCode,
          supplierDescription: supplierMaterialMappingsTable.supplierDescription,
          supplierUom: supplierMaterialMappingsTable.supplierUom,
          supplierPackSize: supplierMaterialMappingsTable.supplierPackSize,
          active: supplierMaterialMappingsTable.active,
          sourceSystem: supplierMaterialMappingsTable.sourceSystem,
          createdAt: supplierMaterialMappingsTable.createdAt,
          updatedAt: supplierMaterialMappingsTable.updatedAt,
          supplierCode: suppliersTable.supplierCode,
          supplierName: suppliersTable.supplierName,
        })
        .from(supplierMaterialMappingsTable)
        .innerJoin(suppliersTable, eq(supplierMaterialMappingsTable.supplierId, suppliersTable.id))
        .where(eq(supplierMaterialMappingsTable.materialId, material.id)),
    ]);
    return {
      ...materialSummary(material, new Map(customerRows.map((customer) => [customer.id, customer.code]))),
      aliases,
      barcodes,
      uomConversions,
      supplierMappings: mappings,
    };
  }
}

export class DatabaseSupplierProvider implements SupplierProvider {
  async search(input: SupplierSearchInput): Promise<SupplierSummary[]> {
    const suppliers = await supplierRows(input);
    const customerRows = await customersByIds(input.customerIds);
    const customerCodeById = new Map(customerRows.map((customer) => [customer.id, customer.code]));
    const ids = suppliers.map((supplier) => supplier.id);
    const aliases = ids.length
      ? await db.select().from(supplierAliasesTable).where(inArray(supplierAliasesTable.supplierId, ids))
      : [];
    const aliasesBySupplier = new Map<number, string[]>();
    for (const alias of aliases) {
      const values = aliasesBySupplier.get(alias.supplierId) ?? [];
      values.push(alias.alias);
      aliasesBySupplier.set(alias.supplierId, values);
    }
    const query = normalized(input.query);
    const rows = suppliers
      .flatMap((supplier) => {
        if (!query) return [supplierSummary(supplier, customerCodeById)];
        const fields = [
          supplier.supplierCode,
          supplier.supplierName,
          supplier.legalName,
          supplier.taxRegistrationNumber,
          ... (aliasesBySupplier.get(supplier.id) ?? []),
        ];
        const exactField = fields.find((field) => exact(field, query));
        const partialField = fields.find((field) => contains(field, query));
        if (!partialField) return [];
        return [
          {
            ...supplierSummary(
              supplier,
              customerCodeById,
              exactField ? "exact_code_or_tax_id" : "name_or_alias",
            ),
            _score: exactField ? 100 : 50,
          },
        ];
      })
      .sort(
        (a, b) =>
          ((b as SupplierSummary & { _score?: number })._score ?? 0) -
            ((a as SupplierSummary & { _score?: number })._score ?? 0) ||
          a.supplierCode.localeCompare(b.supplierCode),
      );
    const offset = input.offset ?? 0;
    const limit = Math.min(input.limit ?? 50, 100);
    return rows
      .slice(offset, offset + limit)
      .map((row) => {
        const result = { ...row } as SupplierSummary & { _score?: number };
        delete result._score;
        return result;
      });
  }

  async getById(id: number, scope: MasterDataScope): Promise<SupplierDetail> {
    const rows = await supplierRows(scope, true);
    const supplier = rows.find((candidate) => candidate.id === id);
    if (!supplier) throw new MasterDataNotFoundError("Supplier not found.");
    return this.detail(supplier);
  }

  async getByCode(code: string, scope: MasterDataScope): Promise<SupplierDetail> {
    const rows = (await supplierRows(scope, true)).filter((supplier) => exact(supplier.supplierCode, code));
    if (rows.length === 0) throw new MasterDataNotFoundError("Supplier not found.");
    return this.detail(rows[0]);
  }

  async create(input: NewSupplier, scope: MasterDataScope): Promise<SupplierDetail> {
    if (!scope.customerIds.includes(input.customerId)) throw new MasterDataNotFoundError("Customer not found.");
    const [supplier] = await db
      .insert(suppliersTable)
      .values({
        ...input,
        supplierCode: input.supplierCode.trim(),
        supplierName: input.supplierName.trim(),
        sourceSystem: input.sourceSystem ?? "DEV_DATABASE",
      })
      .returning();
    if (!supplier) throw new MasterDataConflictError("Could not create supplier.");
    return this.detail(supplier);
  }

  async update(id: number, input: Partial<NewSupplier>, scope: MasterDataScope): Promise<SupplierDetail> {
    const current = await this.getById(id, scope);
    if (input.customerId !== undefined && !scope.customerIds.includes(input.customerId)) {
      throw new MasterDataNotFoundError("Customer not found.");
    }
    const [supplier] = await db
      .update(suppliersTable)
      .set({
        ...input,
        ...(input.supplierCode ? { supplierCode: input.supplierCode.trim() } : {}),
        ...(input.supplierName ? { supplierName: input.supplierName.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(suppliersTable.id, current.id))
      .returning();
    if (!supplier) throw new MasterDataNotFoundError("Supplier not found.");
    return this.detail(supplier);
  }

  async createMapping(input: NewSupplierMaterialMapping, scope: MasterDataScope): Promise<SupplierDetail> {
    if (!scope.customerIds.includes(input.customerId)) throw new MasterDataNotFoundError("Customer not found.");
    const [supplier, material] = await Promise.all([
      this.getById(input.supplierId, scope),
      new DatabaseMaterialProvider().getById(input.materialId, scope),
    ]);
    if (supplier.customerId !== material.customerId || supplier.customerId !== input.customerId) {
      throw new MasterDataNotFoundError("Supplier and material must belong to the same customer.");
    }
    await db
      .insert(supplierMaterialMappingsTable)
      .values({ ...input, sourceSystem: input.sourceSystem ?? "DEV_DATABASE" })
      .onConflictDoUpdate({
        target: [
          supplierMaterialMappingsTable.customerId,
          supplierMaterialMappingsTable.supplierId,
          supplierMaterialMappingsTable.materialId,
        ],
        set: {
          supplierMaterialCode: input.supplierMaterialCode,
          supplierDescription: input.supplierDescription,
          supplierUom: input.supplierUom,
          supplierPackSize: input.supplierPackSize,
          active: input.active ?? true,
          sourceSystem: input.sourceSystem ?? "DEV_DATABASE",
          updatedAt: new Date(),
        },
      });
    return this.detail((await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplier.id)).limit(1))[0]);
  }

  async updateMapping(
    id: number,
    input: Partial<NewSupplierMaterialMapping>,
    scope: MasterDataScope,
  ): Promise<SupplierDetail> {
    const [mapping] = await db
      .select()
      .from(supplierMaterialMappingsTable)
      .where(eq(supplierMaterialMappingsTable.id, id))
      .limit(1);
    if (!mapping || !scope.customerIds.includes(mapping.customerId)) {
      throw new MasterDataNotFoundError("Supplier-material mapping not found.");
    }
    if (input.customerId !== undefined && !scope.customerIds.includes(input.customerId)) {
      throw new MasterDataNotFoundError("Customer not found.");
    }
    const targetCustomerId = input.customerId ?? mapping.customerId;
    if (input.supplierId !== undefined || input.materialId !== undefined || targetCustomerId !== mapping.customerId) {
      const targetSupplier = await this.getById(input.supplierId ?? mapping.supplierId, scope);
      const targetMaterial = await materialProvider.getById(input.materialId ?? mapping.materialId, scope);
      if (
        targetSupplier.customerId !== targetCustomerId ||
        targetMaterial.customerId !== targetCustomerId
      ) {
        throw new MasterDataNotFoundError("Supplier and material must belong to the same customer.");
      }
    }
    const [updated] = await db
      .update(supplierMaterialMappingsTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(supplierMaterialMappingsTable.id, id))
      .returning();
    if (!updated) throw new MasterDataNotFoundError("Supplier-material mapping not found.");
    return this.getById(updated.supplierId, scope);
  }

  async createAlias(
    supplierId: number,
    input: NewSupplierAlias,
    scope: MasterDataScope,
  ): Promise<SupplierDetail> {
    await this.getById(supplierId, scope);
    await db.insert(supplierAliasesTable).values({
      supplierId,
      alias: input.alias.trim(),
      aliasType: input.aliasType.trim(),
      active: input.active ?? true,
    });
    return this.getById(supplierId, scope);
  }

  async deleteAlias(supplierId: number, aliasId: number, scope: MasterDataScope): Promise<SupplierDetail> {
    await this.getById(supplierId, scope);
    const deleted = await db
      .delete(supplierAliasesTable)
      .where(and(eq(supplierAliasesTable.id, aliasId), eq(supplierAliasesTable.supplierId, supplierId)))
      .returning({ id: supplierAliasesTable.id });
    if (deleted.length === 0) throw new MasterDataNotFoundError("Supplier alias not found.");
    return this.getById(supplierId, scope);
  }

  private async detail(supplier: Supplier): Promise<SupplierDetail> {
    const [customerRows, aliases, mappings] = await Promise.all([
      customersByIds([supplier.customerId]),
      db.select().from(supplierAliasesTable).where(eq(supplierAliasesTable.supplierId, supplier.id)),
      db
        .select({
          id: supplierMaterialMappingsTable.id,
          customerId: supplierMaterialMappingsTable.customerId,
          supplierId: supplierMaterialMappingsTable.supplierId,
          materialId: supplierMaterialMappingsTable.materialId,
          supplierMaterialCode: supplierMaterialMappingsTable.supplierMaterialCode,
          supplierDescription: supplierMaterialMappingsTable.supplierDescription,
          supplierUom: supplierMaterialMappingsTable.supplierUom,
          supplierPackSize: supplierMaterialMappingsTable.supplierPackSize,
          active: supplierMaterialMappingsTable.active,
          sourceSystem: supplierMaterialMappingsTable.sourceSystem,
          createdAt: supplierMaterialMappingsTable.createdAt,
          updatedAt: supplierMaterialMappingsTable.updatedAt,
          materialCode: materialsTable.materialCode,
          materialDescription: materialsTable.materialDescription,
        })
        .from(supplierMaterialMappingsTable)
        .innerJoin(materialsTable, eq(supplierMaterialMappingsTable.materialId, materialsTable.id))
        .where(eq(supplierMaterialMappingsTable.supplierId, supplier.id)),
    ]);
    return {
      ...supplierSummary(supplier, new Map(customerRows.map((customer) => [customer.id, customer.code]))),
      aliases,
      materialMappings: mappings,
    };
  }
}

export const materialProvider = new DatabaseMaterialProvider();
export const supplierProvider = new DatabaseSupplierProvider();