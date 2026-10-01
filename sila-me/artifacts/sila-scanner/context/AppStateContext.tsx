import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { demoUser, type UserRole } from '@/constants/config';
import { api, assertMobileIdentity, setAuthExpiredHandler, type AuthUserResponse, type MobileConfigResponse } from '@/services/api';
import {
  clearSessionToken,
  getSessionToken,
  hasCompletedMobileAuthMigration,
  markMobileAuthMigrationComplete,
  saveSessionToken,
} from '@/services/auth';
import { initialApprovalRequests, type ApprovalRequest, type ApprovalStatus } from '@/services/approvals/approvalService';
import type { GrnPostResponse } from '@/services/erp/grnService';
import type { PurchaseOrder, PurchaseOrderLine } from '@/services/erp/poService';
import {
  clearCachedServerData,
  createLocalId,
  getLatestInvoiceDraft,
  saveInvoiceDraft,
  saveCachedMobileConfig,
  saveLocalProfile,
} from '@/data/local/database';

export type InvoiceStatus = 'Uploaded' | 'Pending' | 'Retry' | 'Failed';

export type InvoiceRecord = {
  id: string;
  fileName: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: string;
  property: string;
  department: string;
  uploadedBy: string;
  uploadedAt: string;
  status: InvoiceStatus;
  pageCount: number;
  fileSize: string;
  poNumber: string;
  grnNumber?: string;
  grnStatus?: 'POSTED';
  serverInvoiceId?: number;
  serverDocumentId?: number;
  processingStatus?: string;
};

export type DraftPage = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  rotationDegrees?: number;
};

export type InvoiceDraft = {
  localId: string;
  idempotencyKey: string;
  pages: DraftPage[];
  fileUri?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  serverDocumentId?: number;
  serverInvoiceId?: number;
  uploadStatus: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  processingStatus: string;
  lastError?: string;
  currency: string;
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  poNumber: string;
  invoiceType?: 'MATERIAL' | 'SERVICE' | 'MIXED' | 'UNKNOWN';
  pageCount: number;
  documentId?: number;
  invoiceHeaderId?: number;
};

type AppStateContextValue = {
  user: typeof demoUser;
  customer: string;
  property: string;
  department: string;
  properties: string[];
  departments: string[];
  stores: AuthUserResponse['stores'];
  customerId: number | null;
  propertyId: number | null;
  selectedStore: AuthUserResponse['stores'][number] | null;
  roles: string[];
  permissions: string[];
  accessToken: string | null;
  mobileConfig: MobileConfigResponse | null;
  invoices: InvoiceRecord[];
  approvals: ApprovalRequest[];
  draft: InvoiceDraft;
  selectedPurchaseOrder: PurchaseOrder | null;
  purchaseOrderLines: PurchaseOrderLine[];
  grn: GrnPostResponse | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  setAuthenticated: (value: boolean) => void;
  loginWithLocal: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasRole: (code: string) => boolean;
  canAccessStore: (storeId: number) => boolean;
  cycleProperty: () => void;
  cycleDepartment: () => void;
  updateDraft: (updates: Partial<InvoiceDraft>) => void;
  addPage: () => void;
  removePage: () => void;
  selectPurchaseOrder: (purchaseOrder: PurchaseOrder) => void;
  updatePurchaseOrderLine: (poItem: string, updates: Partial<PurchaseOrderLine>) => void;
  setGrnPosted: (result: GrnPostResponse) => void;
  resetDraft: () => void;
  createApproval: (request: Omit<ApprovalRequest, 'id' | 'status' | 'submittedAt'>) => void;
  resolveApproval: (id: string, status: Extract<ApprovalStatus, 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'>) => void;
};

const initialInvoices: InvoiceRecord[] = [];

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<typeof demoUser>(demoUser);
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [propertyIds, setPropertyIds] = useState<number[]>([]);
  const [stores, setStores] = useState<AuthUserResponse['stores']>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [mobileConfig, setMobileConfig] = useState<MobileConfigResponse | null>(null);
  const [propertyIndex, setPropertyIndex] = useState(0);
  const [departmentIndex, setDepartmentIndex] = useState(0);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(initialApprovalRequests);
  const [draft, setDraft] = useState<InvoiceDraft>({
    localId: createLocalId('invoice'),
    idempotencyKey: createLocalId('invoice_request'),
    pages: [],
    uploadStatus: 'PENDING',
    processingStatus: 'NOT_STARTED',
    currency: 'AED',
    supplierName: '',
    invoiceNumber: '',
    invoiceDate: '',
    poNumber: '',
    pageCount: 0,
  });
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [purchaseOrderLines, setPurchaseOrderLines] = useState<PurchaseOrderLine[]>([]);
  const [grn, setGrn] = useState<GrnPostResponse | null>(null);

  useEffect(() => {
    void getLatestInvoiceDraft().then((saved) => {
      if (!saved) return;
      setDraft((current) => ({
        ...current,
        localId: saved.localId,
        idempotencyKey: saved.idempotencyKey,
        pages: saved.pages.map((page) => ({
          uri: page.fileReference,
          name: page.fileReference.split('/').pop() || `page-${page.pageNumber}.jpg`,
          mimeType: page.fileReference.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        })),
        pageCount: saved.pages.length || current.pageCount,
        fileUri: saved.fileReference ?? undefined,
        fileName: saved.fileName ?? undefined,
        mimeType: saved.mimeType ?? undefined,
        fileSizeBytes: saved.fileSizeBytes ?? undefined,
        serverDocumentId: saved.documentId ? Number(saved.documentId) : undefined,
        serverInvoiceId: saved.invoiceId ? Number(saved.invoiceId) : undefined,
        uploadStatus: (saved.uploadStatus as InvoiceDraft['uploadStatus']) || current.uploadStatus,
        processingStatus: saved.processingStatus ?? current.processingStatus,
        lastError: saved.lastError ?? undefined,
        supplierName: saved.supplierName ?? current.supplierName,
        invoiceNumber: saved.invoiceNumber ?? current.invoiceNumber,
        invoiceDate: saved.invoiceDate ?? current.invoiceDate,
        poNumber: saved.poNumber ?? current.poNumber,
        currency: saved.currency ?? current.currency,
        netAmount: saved.netAmount,
        taxAmount: saved.taxAmount,
        grossAmount: saved.grossAmount,
      }));
    }).catch(() => undefined);
  }, []);

  const applyBackendUser = (backendUser: AuthUserResponse, config: MobileConfigResponse): void => {
    assertMobileIdentity(backendUser);
    setUser({
      name: backendUser.displayName,
      email: backendUser.email,
      role: roleLabel(backendUser.roles),
    });
    setCustomer(backendUser.customer?.name ?? '');
    setCustomerId(backendUser.customer?.id ?? null);
    setProperties(backendUser.properties.map((property) => property.name));
    setPropertyIds(backendUser.properties.map((property) => property.id));
    setStores(backendUser.stores);
    setRoles(backendUser.roles);
    setPermissions(backendUser.permissions);
    setMobileConfig(config);
    setPropertyIndex(0);
    void saveLocalProfile({
      userId: backendUser.userId,
      displayName: backendUser.displayName,
      email: backendUser.email,
      customerId: backendUser.customer ? String(backendUser.customer.id) : null,
      customerCode: backendUser.customer?.code ?? null,
      customerName: backendUser.customer?.name ?? null,
      properties: backendUser.properties,
      stores: backendUser.stores,
      roles: backendUser.roles,
      permissions: backendUser.permissions,
    }).catch((error) => {
      if (__DEV__) console.warn('[SILA Store Local DB] Profile cache failed', error);
    });
    void saveCachedMobileConfig({
      configurationVersion: config.configurationVersion,
      payload: config,
    }).catch((error) => {
      if (__DEV__) console.warn('[SILA Store Local DB] Mobile config cache failed', error);
    });
  };

  const resetBackendSession = (): void => {
    setAuthenticated(false);
    setAccessToken(null);
    setUser(demoUser);
    setCustomer('');
    setCustomerId(null);
    setProperties([]);
    setPropertyIds([]);
    setStores([]);
    setRoles([]);
    setPermissions([]);
    setMobileConfig(null);
    setPropertyIndex(0);
    setDepartmentIndex(0);
  };

  const refreshCurrentUser = async (): Promise<void> => {
    const [backendUser, config] = await Promise.all([api.getMe(), api.getMobileConfig()]);
    applyBackendUser(backendUser, config);
  };

  useEffect(() => {
    setAuthExpiredHandler(() => {
      void clearSessionToken();
      resetBackendSession();
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        if (!(await hasCompletedMobileAuthMigration())) {
          await clearSessionToken();
          await clearCachedServerData();
          await markMobileAuthMigrationComplete();
        }
        const token = await getSessionToken();
        if (!token) return;
        setAccessToken(token);
        const [backendUser, config] = await Promise.all([api.getMe(), api.getMobileConfig()]);
        if (mounted) {
          applyBackendUser(backendUser, config);
          setAuthenticated(true);
        }
      } catch {
        await clearSessionToken();
        if (mounted) resetBackendSession();
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const token = params.get('access_token');
      if (!token) return;
      void (async () => {
        try {
          await saveSessionToken(token);
          setAccessToken(token);
          const [backendUser, config] = await Promise.all([api.getMe(), api.getMobileConfig()]);
          applyBackendUser(backendUser, config);
          setAuthenticated(true);
        } catch {
          await clearSessionToken();
          resetBackendSession();
        }
      })();
    });
    return () => subscription.remove();
  }, []);

  const loginWithLocal = async (login: string, password: string): Promise<void> => {
    const result = await api.loginMobile(login, password);
    await saveSessionToken(result.accessToken);
    setAccessToken(result.accessToken);
    try {
      const [backendUser, config] = await Promise.all([api.getMe(), api.getMobileConfig()]);
      applyBackendUser(backendUser, config);
      setAuthenticated(true);
    } catch (error) {
      await clearSessionToken();
      resetBackendSession();
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (isAuthenticated) await api.logout();
    } finally {
      await clearSessionToken();
      try {
        await clearCachedServerData();
      } catch (error) {
        if (__DEV__) console.warn('[SILA Store Local DB] Cache cleanup failed', error);
      }
      resetBackendSession();
    }
  };

  const setAuthState = (value: boolean): void => {
    if (!value) void logout();
  };

  const value = useMemo<AppStateContextValue>(
    () => ({
      user,
      customer,
      property: properties[propertyIndex] ?? '',
      department: stores[departmentIndex]?.name ?? '',
      properties,
      departments: stores.map((store) => store.name),
      stores,
      customerId,
      propertyId: propertyIds[propertyIndex] ?? null,
      selectedStore: stores[departmentIndex] ?? stores[0] ?? null,
      roles,
      permissions,
      accessToken,
      mobileConfig,
      invoices,
      approvals,
      draft,
      selectedPurchaseOrder,
      purchaseOrderLines,
      grn,
      isAuthenticated,
      authLoading,
      setAuthenticated: setAuthState,
      loginWithLocal,
      logout,
      refreshCurrentUser,
      hasPermission: (code) => permissions.includes(code),
      hasRole: (code) => roles.includes(code),
      canAccessStore: (storeId) => stores.some((store) => store.id === storeId),
      cycleProperty: () =>
        setPropertyIndex((index) => (index + 1) % Math.max(properties.length, 1)),
      cycleDepartment: () =>
        setDepartmentIndex((index) => (index + 1) % Math.max(stores.length, 1)),
       updateDraft: (updates) => {
         setDraft((current) => {
           const next = { ...current, ...updates };
           void saveInvoiceDraft({
             localId: next.localId,
             idempotencyKey: next.idempotencyKey,
             documentId: next.serverDocumentId ? String(next.serverDocumentId) : null,
             invoiceId: next.serverInvoiceId ? String(next.serverInvoiceId) : null,
             fileReference: next.fileUri,
             fileName: next.fileName,
             mimeType: next.mimeType,
             fileSizeBytes: next.fileSizeBytes,
             propertyCode: properties[propertyIndex],
             storeCode: stores[departmentIndex]?.code,
             uploadStatus: next.uploadStatus,
             processingStatus: next.processingStatus,
             status: next.uploadStatus === 'FAILED' ? 'FAILED' : 'DRAFT',
             lastError: next.lastError,
             supplierName: next.supplierName,
             invoiceNumber: next.invoiceNumber,
             invoiceDate: next.invoiceDate,
             poNumber: next.poNumber,
             currency: next.currency,
             netAmount: next.netAmount,
             taxAmount: next.taxAmount,
             grossAmount: next.grossAmount,
             pages: next.pages.map((page, index) => ({
               pageNumber: index + 1,
               fileReference: page.uri,
               rotationDegrees: page.rotationDegrees,
             })),
           }).catch(() => undefined);
           return next;
         });
       },
       addPage: () => setDraft((current) => ({ ...current, pageCount: current.pages.length || current.pageCount + 1 })),
      removePage: () =>
        setDraft((current) => ({
          ...current,
           pages: current.pages.slice(0, -1),
           pageCount: Math.max(0, current.pages.length - 1),
        })),
      selectPurchaseOrder: (purchaseOrder) => {
        setSelectedPurchaseOrder(purchaseOrder);
        setPurchaseOrderLines(purchaseOrder.items.map((item) => ({ ...item })));
      },
      updatePurchaseOrderLine: (poItem, updates) =>
        setPurchaseOrderLines((current) =>
          current.map((line) => (line.poItem === poItem ? { ...line, ...updates } : line)),
        ),
      setGrnPosted: (result) => setGrn(result),
      resetDraft: () =>
        (() => {
          setDraft({
            supplierName: '',
            invoiceNumber: '',
            invoiceDate: '',
            poNumber: '',
             pageCount: 0,
             localId: createLocalId('invoice'),
             idempotencyKey: createLocalId('invoice_request'),
             pages: [],
             uploadStatus: 'PENDING',
             processingStatus: 'NOT_STARTED',
             currency: 'AED',
          });
          setSelectedPurchaseOrder(null);
          setPurchaseOrderLines([]);
          setGrn(null);
        })(),
      createApproval: (request) =>
        setApprovals((current) => [
          {
            ...request,
            id: `approval-${Date.now()}`,
            status: 'PENDING',
            submittedAt: 'Just now',
          },
          ...current,
        ]),
      resolveApproval: (id, status) =>
        setApprovals((current) => current.map((approval) => (approval.id === id ? { ...approval, status } : approval))),
    }),
    [
      departmentIndex,
      draft,
      grn,
      invoices,
      approvals,
      authLoading,
      customer,
      customerId,
      isAuthenticated,
      loginWithLocal,
      propertyIndex,
      propertyIds,
      properties,
      stores,
      roles,
      permissions,
      accessToken,
      mobileConfig,
      purchaseOrderLines,
      selectedPurchaseOrder,
      user,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function roleLabel(roleCodes: string[]): UserRole {
  const roleMap: Record<string, UserRole> = {
    RECEIVER: 'Receiver',
    STORE_STAFF: 'Store Staff',
    STORE_MANAGER: 'Store Manager',
    INVENTORY_CONTROLLER: 'Inventory Controller',
    FINANCE: 'Finance',
    ADMIN: 'Admin',
  };
  return roleCodes.map((code) => roleMap[code]).find(Boolean) ?? 'Store Staff';
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}