import React, { useEffect, useState } from 'react';
import { ToastContainer } from '@vosox/shared-ui';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useNetworkAdminAuthStore } from './store/useAuthStore';
import PlatformUserDashboard from './components/PlatformUserDashboard';
import Department from './components/departmentbuyer';
import DepartmentCostList from './components/DepartmentCostList';
import NetworkAdminDashboard from './components/NetworkAdminDashboard/NetworkAdminDashboard';
import NetworkAdminOnboarding from './components/NetworkAdminOnboarding/NetworkAdminOnboarding';
import ItemMaster from './components/ItemMaster';
import SupplierAdminDash from './components/SupplierAdminDash';
import BuyerAdminDash from './components/BuyerAdminDash';
import { fetchReferenceList } from './api/masterdataApi';
import NetworkAdminProfilePage from './pages/NetworkAdminProfilePage';
import PlatformUserTemplates from './components/PlatformUserTemplates';
import {
  getNetworkAdminProfile,
  getNetworkAdminOnboardingDetails,
  createNetworkAdminBuyerProfile,
  createNetworkAdminSupplierProfile,
  updateRejectedNetworkAdminBuyer,
  updateRejectedNetworkAdminSupplier,
  type NetworkAdminRole,
} from './api/networkAdminApi';
import type {
  NetworkAdminProfileResponse,
  NetworkAdminOnboardingResponse,
} from './dto/networkAdminDto';
import BuyerAdminProfilePage from './pages/BuyerAdminProfilePage';
import SupplierAdminProfilePage from './pages/SupplierAdminProfilePage';

const NETWORK_ADMIN_ROLES: NetworkAdminRole[] = ['BUYER_NETWORK_ADMIN', 'SUPPLIER_NETWORK_ADMIN'];

const readIsNetworkAdminProfileComplete = (): boolean => {
  return sessionStorage.getItem('vosox_network_admin_profile_complete') === 'true';
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface NetworkAdminOnboardingRouteProps {
  role: NetworkAdminRole;
  organizationId: string | null;
  onCompleteSuccess: () => void;
  onboardingData: NetworkAdminOnboardingResponse | null;
  rejectedProfile: NetworkAdminProfileResponse | null;
}

const NetworkAdminOnboardingRoute: React.FC<NetworkAdminOnboardingRouteProps> = ({
  role,
  organizationId,
  onCompleteSuccess,
  onboardingData,
  rejectedProfile,
}) => {
  const navigate = useNavigate();

  const handleOnboardingComplete = async (data: any) => {
    const orgId = organizationId || sessionStorage.getItem('vosox_organization_id');

    if (!orgId) {
      throw new Error('Organization ID not found. Please log in again.');
    }

    try {
      const categoriesFromForm =
        data.selectedSubProducts?.length > 0
          ? data.selectedSubProducts.map((sub: any) => ({
              segment: sub.parentSegment || 0,
              segmentTitle: sub.parentTitle || '',
              family: sub.parentFamily || 0,
              familyTitle: sub.parentTitle || '',
              class: sub.class,
              classTitle: sub.title,
              commodity: sub.commodity,
              commodityTitle: sub.title,
            }))
          : data.selectedProducts?.map((product: any) => ({
              segment: product.segment,
              segmentTitle: product.title,
              family: product.family,
              familyTitle: product.title,
              class: 0,
              classTitle: '',
              commodity: 0,
              commodityTitle: '',
            })) || [];

      const entityTypeKey = role === 'BUYER_NETWORK_ADMIN' ? 'BUYER' : 'SUPPLIER';
const entityTypes = await fetchReferenceList(['ENTITY_TYPE']);
const entityId = Array.isArray(entityTypes)
    ? entityTypes.find((e: any) => e.key === entityTypeKey)?.id || ''
    : '';
      const mappedRegistrations = await Promise.all(
        data.registrations.map(async (r: any) => {
          const fileBytes = r.certificateFile ? await fileToBase64(r.certificateFile) : '';
          return {
            registrationNumber: r.number,
            registrationName: r.name,
            expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString() : null,
            registrationType: r.type,
            registrationDocument: {
              entityType: entityTypeKey,
              entityId,
              assetType: r.type,
              fileBytes,
              fileName: r.certificateFile?.name || r.attachmentName || '',
              contentType: r.certificateFile?.type || 'application/pdf',
              isSingletonAsset: true,
            },
          };
        })
      );

      if (role === 'BUYER_NETWORK_ADMIN') {
        const payload = {
          organizationId: orgId,
          organizationName: onboardingData?.organizationName || '',
          email: onboardingData?.email || '',
          phone: onboardingData?.phone || '',
          country: onboardingData?.country || '',
          addressLine1: onboardingData?.addressLine1 || '',
          addressLine2: onboardingData?.addressLine2 || '',
          city: onboardingData?.city || '',
          state: onboardingData?.state || '',
          pinCode: onboardingData?.pinCode || '',
          industry: data.businessInfo.industry,
          businessType: data.businessInfo.businessType,
          employeeCount: parseInt(data.businessInfo.employeeCount, 10) || 0,
          annualTurnover: parseFloat(data.businessInfo.annualTurnover) || 0,
          currency: data.businessInfo.currency,
          yearEstablished: parseInt(data.businessInfo.yearEstablished, 10) || 0,
          website: data.businessInfo.website || '',
          description: data.businessInfo.companyDescription || '',
          status: 'PENDING',
          buyerCategories: categoriesFromForm,
          buyerBankAccounts: data.bankAccounts.map((b: any) => ({
            accountHolderName: b.accountHolderName,
            bankName: b.bankName,
            branchName: b.branchName,
            accountNumber: b.accountNumber,
            ifscCode: b.ifscCode,
            swiftCode: b.swiftCode || '',
            currency: b.currency,
            isPrimary: b.isPrimary,
          })),
          buyerDocumentRegistrations: mappedRegistrations,
          buyerDeliveryLocations: data.dispatchLocations.map((l: any) => ({
            locationName: l.locationName,
            addressLine1: l.addressLine1,
            addressLine2: l.addressLine2 || '',
            city: l.city,
            state: l.state,
            country: l.country,
            pinCode: l.pinZip,
            contactPerson: l.contactPerson,
            contactPhone: l.contactPhone,
            isDefault: l.isDefault,
          })),
        };

        if (rejectedProfile) {
          await updateRejectedNetworkAdminBuyer({
            buyer: {
              buyerId: rejectedProfile.id,
              businessProfile: {
                organizationId: payload.organizationId,
                organizationName: payload.organizationName,
                email: payload.email,
                phone: payload.phone,
                country: payload.country,
                addressLine1: payload.addressLine1,
                addressLine2: payload.addressLine2,
                city: payload.city,
                state: payload.state,
                pinCode: payload.pinCode,
                industry: payload.industry,
                businessType: payload.businessType,
                employeeCount: payload.employeeCount,
                annualTurnover: payload.annualTurnover,
                currency: payload.currency,
                yearEstablished: payload.yearEstablished,
                website: payload.website,
                description: payload.description,
                status: payload.status,
              },
              buyerCategories: payload.buyerCategories,
              buyerBankAccounts: payload.buyerBankAccounts,
              buyerDocumentRegistrations: payload.buyerDocumentRegistrations,
              buyerDeliveryLocations: payload.buyerDeliveryLocations,
            },
          });
        } else {
          await createNetworkAdminBuyerProfile(payload);
        }
      } else {
        const payload = {
          organizationId: orgId,
          businessProfile: {
            organizationName: onboardingData?.organizationName || '',
            email: onboardingData?.email || '',
            phone: onboardingData?.phone || '',
            country: onboardingData?.country || '',
            addressLine1: onboardingData?.addressLine1 || '',
            addressLine2: onboardingData?.addressLine2 || '',
            city: onboardingData?.city || '',
            state: onboardingData?.state || '',
            pinCode: onboardingData?.pinCode || '',
            industry: data.businessInfo.industry,
            businessType: data.businessInfo.businessType,
            employeeCount: parseInt(data.businessInfo.employeeCount, 10) || 0,
            annualTurnover: parseFloat(data.businessInfo.annualTurnover) || 0,
            currency: data.businessInfo.currency,
            yearEstablished: parseInt(data.businessInfo.yearEstablished, 10) || 0,
            website: data.businessInfo.website || '',
            description: data.businessInfo.companyDescription || '',
            status: 'PENDING',
          },
          registrations: mappedRegistrations.map((r) => ({
            registrationType: r.registrationType,
            registrationNumber: r.registrationNumber,
            registrationName: r.registrationName,
            asset: r.registrationDocument,
            expiryDate: r.expiryDate,
          })),
          bankAccounts: data.bankAccounts.map((b: any) => ({
            accountHolderName: b.accountHolderName,
            bankName: b.bankName,
            branchName: b.branchName,
            accountNumber: b.accountNumber,
            ifscCode: b.ifscCode,
            swiftCode: b.swiftCode || '',
            iban: b.iban || '',
            currency: b.currency,
            isPrimary: b.isPrimary,
          })),
          dispatchLocations: data.dispatchLocations.map((l: any) => ({
            locationName: l.locationName,
            addressLine1: l.addressLine1,
            addressLine2: l.addressLine2 || '',
            city: l.city,
            state: l.state,
            country: l.country,
            pinCode: l.pinZip,
            contactPerson: l.contactPerson,
            contactEmail: l.contactEmail || '',
            contactPhone: l.contactPhone,
            isDefault: l.isDefault,
          })),
          supplierCategories: categoriesFromForm,
        };

        if (rejectedProfile) {
          await updateRejectedNetworkAdminSupplier({
            supplier: {
              supplierId: rejectedProfile.id,
              businessProfile: payload.businessProfile,
              registrations: payload.registrations,
              bankAccounts: payload.bankAccounts,
              dispatchLocations: payload.dispatchLocations,
              supplierCategories: payload.supplierCategories,
            },
          });
        } else {
          await createNetworkAdminSupplierProfile(payload);
        }
      }

      sessionStorage.setItem('vosox_network_admin_profile_complete', 'true');
      onCompleteSuccess();
      navigate('/platform-user/network-admin', { replace: true });
    } catch (error) {
      throw error;
    }
  };

  return (
    <NetworkAdminOnboarding
      onComplete={handleOnboardingComplete}
      onboardingData={onboardingData}
      rejectedProfile={rejectedProfile}
    />
  );
};

const PlatformUserApp: React.FC = () => {
  const initializeFromSession = useNetworkAdminAuthStore((state) => state.initializeFromSession);
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const isLoading = useNetworkAdminAuthStore((state) => state.isLoading);

  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [onboardingData, setOnboardingData] = useState<NetworkAdminOnboardingResponse | null>(null);
  const [rejectedProfile, setRejectedProfile] = useState<NetworkAdminProfileResponse | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    initializeFromSession();
  }, [initializeFromSession]);

  const isNetworkAdmin =
    currentUser ? NETWORK_ADMIN_ROLES.includes(currentUser.userRole as NetworkAdminRole) : false;
  const networkAdminRole = currentUser?.userRole as NetworkAdminRole | undefined;

  useEffect(() => {
    if (isLoading || !isNetworkAdmin || !networkAdminRole) {
      setCheckingProfile(false);
      return;
    }

    const checkProfile = async () => {
      const orgId = currentUser?.organizationId || sessionStorage.getItem('vosox_organization_id');
      const previousOrgId = sessionStorage.getItem('vosox_na_last_org_id');

      if (orgId && previousOrgId && orgId !== previousOrgId) {
        sessionStorage.removeItem('vosox_network_admin_profile_complete');
      }
      if (orgId) {
        sessionStorage.setItem('vosox_na_last_org_id', orgId);
      }

      if (readIsNetworkAdminProfileComplete()) {
        setProfileComplete(true);
        setCheckingProfile(false);
        return;
      }

      try {
        const profile = await getNetworkAdminProfile(networkAdminRole);

        if (profile !== null) {
          if (profile.businessProfile?.status === 'REJECTED') {
            const onboarding = await getNetworkAdminOnboardingDetails();
            setOnboardingData(onboarding);
            setRejectedProfile(profile);
            setProfileComplete(false);
          } else {
            sessionStorage.setItem('vosox_network_admin_profile_complete', 'true');
            setProfileComplete(true);
          }
        } else {
          const onboarding = await getNetworkAdminOnboardingDetails();
          setOnboardingData(onboarding);
          setRejectedProfile(null);
          setProfileComplete(false);
        }
      } catch (error: any) {
        try {
          const onboarding = await getNetworkAdminOnboardingDetails();
          setOnboardingData(onboarding);
        } catch {
        }
        setProfileComplete(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [isLoading, isNetworkAdmin, networkAdminRole, currentUser?.organizationId]);

  if (isLoading || (isNetworkAdmin && checkingProfile)) return null;

  const defaultRoute = isNetworkAdmin ? 'network-admin' : 'dashboard';

  return (
    <>
      <ToastContainer />
      <Routes>
      <Route path="dashboard" element={<PlatformUserDashboard />} />
      <Route path="settings" element={<Department />} />
      <Route path="departmentcostlist" element={<DepartmentCostList />} />

      <Route
        path="network-admin/onboarding"
        element={
          !isNetworkAdmin || !networkAdminRole ? (
            <Navigate to="/platform-user/dashboard" replace />
          ) : profileComplete ? (
            <Navigate to="/platform-user/network-admin" replace />
          ) : (
            <NetworkAdminOnboardingRoute
              role={networkAdminRole}
              organizationId={currentUser?.organizationId || null}
              onCompleteSuccess={() => setProfileComplete(true)}
              onboardingData={onboardingData}
              rejectedProfile={rejectedProfile}
            />
          )
        }
      />

      <Route
        path="network-admin"
        element={
          isNetworkAdmin && profileComplete === false ? (
            <Navigate to="/platform-user/network-admin/onboarding" replace />
          ) : (
            <NetworkAdminDashboard />
          )
        }
      />
      <Route
        path="network-admin/profile"
        element={
          isNetworkAdmin && profileComplete === false ? (
            <Navigate to="/platform-user/network-admin/onboarding" replace />
          ) : (
            <NetworkAdminProfilePage />
          )
        }
      />
      <Route
        path="network-admin/*"
        element={
          isNetworkAdmin && profileComplete === false ? (
            <Navigate to="/platform-user/network-admin/onboarding" replace />
          ) : (
            <NetworkAdminDashboard />
          )
        }
      />
      <Route path="templates" element={<PlatformUserTemplates />} />

      <Route path="buyer-admin" element={<BuyerAdminDash />} />
      <Route path="buyer-admin/profile" element={<BuyerAdminProfilePage />} />
      <Route path="supplier-admin" element={<SupplierAdminDash />} />
      <Route path="supplier-admin/profile" element={<SupplierAdminProfilePage />} />

      <Route path="itemmaster" element={<ItemMaster />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </>
  );
};

export default PlatformUserApp;