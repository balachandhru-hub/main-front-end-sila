import axiosInstance from "../axiosInstance";
import { OPERATIONS_BASE, cleanParams, readError } from "./http";

/* ------------------------------------------------------------------ */
/* Supplier master                                                     */
/* ------------------------------------------------------------------ */

export interface OperationsSupplier {
  id: string;
  supplierCode: string;
  name: string;
  searchName?: string | null;
  businessPartnerId?: string | null;
  legalName?: string | null;
  taxNumber?: string | null;
  trn?: string | null;
  email?: string | null;
  phone?: string | null;
  entityCode: string;
  country?: string | null;
  city?: string | null;
  postalCode?: string | null;
  street?: string | null;
  currency?: string | null;
  isBlocked: boolean;
  isDeleted: boolean;
  isActive?: boolean;
  status: string;
  aliases: string[];
  sourceSystem?: string | null;
  sourceLastChangedAt?: string | null;
  lastSyncedAt?: string | null;
  updatedAt: string;
}

export interface OperationsSupplierWrite {
  supplierCode: string;
  name: string;
  searchName?: string | null;
  businessPartnerId?: string | null;
  legalName?: string | null;
  taxNumber?: string | null;
  trn?: string | null;
  email?: string | null;
  phone?: string | null;
  entityCode: string;
  country?: string | null;
  city?: string | null;
  postalCode?: string | null;
  street?: string | null;
  currency?: string | null;
  isBlocked: boolean;
  isDeleted: boolean;
  status: string;
  aliases: string[];
}

export interface SupplierSearch {
  query?: string;
  entityCode?: string;
  status?: string;
}

/* ------------------------------------------------------------------ */
/* Organization units                                                  */
/* ------------------------------------------------------------------ */

export const UNIT_KINDS = ["PROPERTY", "HOTEL", "OUTLET", "KITCHEN", "STORE", "STORAGE_LOCATION"] as const;

export interface OrganizationUnit {
  id: string;
  parentUnitId?: string | null;
  code: string;
  name: string;
  kind: string;
  status: string;
}

export interface OrganizationUnitWrite {
  code: string;
  name: string;
  kind: string;
  parentUnitId?: string | null;
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const normalizeSupplier = (supplier: OperationsSupplier): OperationsSupplier => ({
  ...supplier,
  aliases: asArray<string>(supplier.aliases),
});

export const getOperationsSuppliers = async (search: SupplierSearch = {}): Promise<OperationsSupplier[]> => {
  try {
    const response = await axiosInstance.get<OperationsSupplier[]>(`${OPERATIONS_BASE}/master-data/suppliers`, {
      params: cleanParams({ query: search.query?.trim(), entityCode: search.entityCode?.trim(), status: search.status }),
    });
    return asArray<OperationsSupplier>(response.data).map(normalizeSupplier);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load suppliers."));
  }
};

export const getOperationsSupplier = async (supplierId: string): Promise<OperationsSupplier> => {
  try {
    const response = await axiosInstance.get<OperationsSupplier>(`${OPERATIONS_BASE}/master-data/suppliers/${supplierId}`);
    return normalizeSupplier(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the supplier."));
  }
};

/** Create is a PUT on the collection; update is a PUT on the supplier. */
export const saveOperationsSupplier = async (
  supplierId: string | null,
  payload: OperationsSupplierWrite,
): Promise<OperationsSupplier> => {
  const url = supplierId
    ? `${OPERATIONS_BASE}/master-data/suppliers/${supplierId}`
    : `${OPERATIONS_BASE}/master-data/suppliers`;
  try {
    const response = await axiosInstance.put<OperationsSupplier>(url, payload);
    return normalizeSupplier(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the supplier."));
  }
};

export const getOrganizationUnits = async (): Promise<OrganizationUnit[]> => {
  try {
    const response = await axiosInstance.get<OrganizationUnit[]>(`${OPERATIONS_BASE}/units`);
    return asArray<OrganizationUnit>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load organization units."));
  }
};

export const createOrganizationUnit = async (payload: OrganizationUnitWrite): Promise<OrganizationUnit> => {
  try {
    const response = await axiosInstance.post<OrganizationUnit>(`${OPERATIONS_BASE}/units`, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not create the organization unit."));
  }
};
