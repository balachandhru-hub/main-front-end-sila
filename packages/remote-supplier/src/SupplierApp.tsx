import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SupplierDashboard from './components/SupplierDashboard';
import Invitations from './components/Invitations';
import SupplierOnboardingForm, {
  fileToBase64,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type Step4Data,
  type DispatchLocationEntry,
  type RegistrationEntry,
  type BankAccountEntry,
} from './components/SupplierOnboardingForm';
import { createSupplierProfile, fetchOnboardingDetails, getSupplierProfile } from './api/supplierApi';
import { useAuthStore } from '../../host-app/src/store/useAuthStore';

const readIsProfileComplete = (): boolean => {
  return sessionStorage.getItem('vosox_profile_complete') === 'true';
};

const OnboardingRoute: React.FC<{ onCompleteSuccess: () => void }> = ({ onCompleteSuccess }) => {
  const navigate = useNavigate();

  const handleOnboardingComplete = async (data: {
    step1: Step1Data;
    step2: Step2Data;
    step3: Step3Data;
    step4: Step4Data;
  }) => {
    const orgId = useAuthStore.getState().organizationId || sessionStorage.getItem('vosox_organization_id');
    let onboardingInfo: any = null;
    try {
      onboardingInfo = await fetchOnboardingDetails();
    } catch (e) {
      console.warn('Failed to fetch onboarding info, using fallbacks', e);
    }


    const orgName = onboardingInfo?.organizationName;
    const orgEmail = onboardingInfo?.email;
    const orgPhone = onboardingInfo?.phone;
    const orgCountry = onboardingInfo?.country;
    const orgAddress1 = onboardingInfo?.addressLine1;
    const orgAddress2 = onboardingInfo?.addressLine2;
    const orgCity = onboardingInfo?.city;
    const orgState = onboardingInfo?.state;
    const orgPin = onboardingInfo?.pinCode;

    // 2. Map registrations, converting files to base64
    const mappedRegistrations = await Promise.all(
      data.step2.registrations.map(async (reg: RegistrationEntry) => {
        const fileBytes = reg.certificateFile ? await fileToBase64(reg.certificateFile) : '';
        return {
          registrationType: reg.type,
          registrationNumber: reg.number,
          registrationName: reg.name,
          asset: reg.certificateFile
            ? {
              entityType: 'SUPPLIER',
              entityId: '7b75d5fd-a87d-4fca-a9a9-c6e781f8d431',
              assetType: reg.type,
              fileName: reg.certificateFile.name,
              contentType: reg.certificateFile.type,
              isSingletonAsset: false,
              fileBytes: fileBytes,
            }
            : null,
          expiryDate: reg.expiryDate ? new Date(reg.expiryDate).toISOString() : null,
        };
      })
    );

    // 3. Map bank accounts
    const mappedBankAccounts = data.step3.accounts.map((acc: BankAccountEntry) => ({
      accountHolderName: acc.accountHolderName,
      bankName: acc.bankName,
      branchName: acc.branchName,
      accountNumber: acc.accountNumber,
      ifscCode: acc.ifscCode,
      swiftCode: acc.swiftCode || '',
      iban: acc.iban || '',
      currency: acc.currency,
      isPrimary: acc.isPrimary,
    }));

    // 4. Map dispatch locations
    const mappedDispatchLocations = data.step4.locations.map((loc: DispatchLocationEntry) => ({
      locationName: loc.locationName,
      addressLine1: loc.addressLine1,
      addressLine2: loc.addressLine2 || '',
      city: loc.city,
      state: loc.state,
      country: loc.country,
      pinCode: loc.pinCode,
      contactPerson: loc.contactPerson || '',
      contactEmail: loc.contactEmail || '',
      contactPhone: loc.contactPhone || '',
      isDefault: loc.isDefault,
    }));

    // 5. Construct payload
    const payload = {
      organizationId: orgId,
      businessProfile: {
        organizationName: orgName,
        email: orgEmail,
        phone: orgPhone,
        emailVerified: true,
        country: orgCountry,
        addressLine1: orgAddress1,
        addressLine2: orgAddress2,
        city: orgCity,
        state: orgState,
        pinCode: orgPin,
        industry: data.step1.industry,
        businessType: data.step1.businessType,
        employeeCount: parseInt(data.step1.employeeCount, 10) || 0,
        annualTurnover: parseFloat(data.step1.annualTurnover) || 0,
        currency: data.step1.currency,
        yearEstablished: parseInt(data.step1.yearEstablished, 10) || 0,
        website: data.step1.website || '',
        description: data.step1.companyDescription || '',
      },
      registrations: mappedRegistrations,
      bankAccounts: mappedBankAccounts,
      dispatchLocations: mappedDispatchLocations,
    };

    // 6. Post profile to server via api helper
    const response = await createSupplierProfile(payload);

    if (response && response.status === 200) {
      // Save organization name
      if (payload.businessProfile.organizationName) {
        sessionStorage.setItem('vosox_organization_name', payload.businessProfile.organizationName);
      }
      // 7. Update profileComplete status
      sessionStorage.setItem('vosox_profile_complete', 'true');
      onCompleteSuccess();
      navigate('../dashboard', { replace: true });
    }
  };

  return <SupplierOnboardingForm onComplete={handleOnboardingComplete} />;
};

const SupplierApp: React.FC = () => {
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      // First check sessionStorage
      const isComplete = readIsProfileComplete();
      if (isComplete) {
        setProfileComplete(true);
        return;
      }

      try {
        const profile = await getSupplierProfile();
        if (!profile) {
          setProfileComplete(false);
          return;
        }
        // Save organization name
        if (profile?.businessProfile?.organizationName) {
          sessionStorage.setItem('vosox_organization_name', profile.businessProfile.organizationName);
        }
        // If the profile is retrieved successfully, it exists and is complete
        sessionStorage.setItem('vosox_profile_complete', 'true');
        setProfileComplete(true);
      } catch (error: any) {
        // If we get a 404 error (profile not found), show the onboarding form
        if (error.response?.status === 404) {
          setProfileComplete(false);
        } else {
          // On other errors, log and also fallback to showing the onboarding form
          console.error('Error checking supplier profile existence:', error);
          setProfileComplete(false);
        }
      }
    };

    checkProfile();
  }, []);

  if (profileComplete === null) {
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
      {/* RELATIVE paths - because this is mounted under /supplier/* */}
      <Route
        path="onboarding"
        element={<OnboardingRoute onCompleteSuccess={() => setProfileComplete(true)} />}
      />
      <Route
        path="dashboard"
        element={profileComplete ? <SupplierDashboard /> : <Navigate to="onboarding" replace />}
      />
      <Route
        path="invitations"
        element={profileComplete ? <Invitations /> : <Navigate to="onboarding" replace />}
      />
      <Route path="*" element={<Navigate to={profileComplete ? 'dashboard' : 'onboarding'} replace />} />
    </Routes>
  );
};

export default SupplierApp;