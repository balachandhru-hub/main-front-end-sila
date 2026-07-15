import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import BuyerDashboard from './components/BuyerDashboard';
import BuyerProfile from './components/BuyerProfile';
import { getBuyerProfile, getOnboardingDetails, createBuyerProfile, updateRejectedBuyer } from './api/Buyerapi';
import { useAuthStore } from '../../host-app/src/store/useAuthStore';
import type { OnboardingResponse, BuyerProfileResponse } from './api/Buyerapi';

// ============================================================================
// HELPER: Check if profile is complete in sessionStorage
// ============================================================================
const readIsProfileComplete = (): boolean => {
  return sessionStorage.getItem('vosox_buyer_profile_complete') === 'true';
};

// ============================================================================
// ONBOARDING ROUTE: Handles the wizard flow
// ============================================================================
interface OnboardingRouteProps {
  onCompleteSuccess: () => void;
  onboardingData: OnboardingResponse | null;
  rejectedProfile?: BuyerProfileResponse | null;
}

const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ onCompleteSuccess, onboardingData, rejectedProfile }) => {
  const navigate = useNavigate();
  const organizationId = useAuthStore((state) => state.organizationId);

  const handleOnboardingComplete = async (data: any) => {
    const orgId = organizationId || sessionStorage.getItem('vosox_organization_id');

    if (!orgId) {
      throw new Error('Organization ID not found. Please log in again.');
    }

    try {
      // ============================================================================
      // NEW: Map categories from selected sub-products with parent info
      // ============================================================================
      const buyerCategories = data.selectedSubProducts?.length > 0
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
        buyerCategories: buyerCategories,
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
        buyerDocumentRegistrations: data.registrations.map((r: any) => ({
          registrationNumber: r.number,
          registrationName: r.name,
          expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString() : null,
          registrationType: r.type,
          registrationDocument: {
            entityType: 'BUYER',
            entityId: 'a266daa7-a80e-4463-abcc-fbe11294c051',
            assetType: r.type,
            fileBytes: '', 
            fileName: r.attachmentName || '',
            contentType: 'application/pdf',
            isSingletonAsset: true,
          },
        })),
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
        const updatePayload = {
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
          }
        };
        await updateRejectedBuyer(updatePayload);
      } else {
        await createBuyerProfile(payload);
      }

      sessionStorage.setItem('vosox_buyer_profile_complete', 'true');
      onCompleteSuccess();
      navigate('/buyer/dashboard', { replace: true });
    } catch (error) {
      console.error('Error saving buyer profile:', error);
      throw error;
    }
  };

  return <BuyerProfile onComplete={handleOnboardingComplete} onboardingData={onboardingData} />;
};

// ============================================================================
// MAIN BUYER APP: Router with profile completion check
// ============================================================================
const BuyerApp: React.FC = () => {
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingResponse | null>(null);
  const [rejectedProfile, setRejectedProfile] = useState<BuyerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const organizationId = useAuthStore((state) => state.organizationId);

  useEffect(() => {
    const checkProfile = async () => {
      const orgId = organizationId || sessionStorage.getItem('vosox_organization_id');
      const previousOrgId = sessionStorage.getItem('vosox_last_org_id');

      // If organization changed, clear old profile flag
      if (orgId && previousOrgId && orgId !== previousOrgId) {
        console.log('🔄 New user detected! Clearing old profile flag');
        sessionStorage.removeItem('vosox_buyer_profile_complete');
      }

      if (orgId) {
        sessionStorage.setItem('vosox_last_org_id', orgId);
      }

      // First check sessionStorage
      const isComplete = readIsProfileComplete();
      if (isComplete) {
        setProfileComplete(true);
        setLoading(false);
        return;
      }

      try {
        // Try to fetch buyer profile from API
        const profile = await getBuyerProfile();
        
        // ✅ 200 (profile !== null) → profile exists, go to dashboard or handle REJECT
        if (profile !== null) {
          if (profile.businessProfile?.status === 'REJECT') {
            const onboarding = await getOnboardingDetails();
            setOnboardingData(onboarding);
            setRejectedProfile(profile);
            setProfileComplete(false);
          } else {
            sessionStorage.setItem('vosox_buyer_profile_complete', 'true');
            setProfileComplete(true);
          }
        } else {
          // 204 (profile === null) → show onboarding form
          const onboarding = await getOnboardingDetails();
          setOnboardingData(onboarding);
          setRejectedProfile(null);
          setProfileComplete(false);
        }
      } catch (error: any) {
        // ✅ ANY ERROR (404, 429, 500, network error, etc.) → SHOW FORM
        console.log('Profile check failed, showing onboarding form:', error.message);
        try {
          const onboarding = await getOnboardingDetails();
          setOnboardingData(onboarding);
        } catch (onboardingError) {
          console.error('Error fetching onboarding details:', onboardingError);
        }
        setProfileComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [organizationId]);

  // Loading state
  if (loading || profileComplete === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ color: '#6c757d', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="onboarding"
        element={
          profileComplete ? (
            <Navigate to="/buyer/dashboard" replace />
          ) : (
            <OnboardingRoute 
              onCompleteSuccess={() => setProfileComplete(true)} 
              onboardingData={onboardingData}
              rejectedProfile={rejectedProfile}
            />
          )
        }
      />
      
      <Route
        path="dashboard"
        element={
          profileComplete ? (
            <BuyerDashboard />
          ) : (
            <Navigate to="/buyer/onboarding" replace />
          )
        }
      />
      
      <Route 
        path="*" 
        element={<Navigate to={profileComplete ? '/buyer/dashboard' : '/buyer/onboarding'} replace />} 
      />
    </Routes>
  );
};

export default BuyerApp;