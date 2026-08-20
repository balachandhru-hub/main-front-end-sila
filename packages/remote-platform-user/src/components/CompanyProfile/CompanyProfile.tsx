import React, { useEffect, useState } from 'react';
import {
  FaArrowLeft,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFileContract,
  FaUniversity,
  FaTruck,
  FaThLarge,
  FaInfoCircle,
  FaChevronUp,
  FaChevronDown,
  FaCheck,
  FaTimes,
  FaFilePdf,
  FaEye,
  FaEyeSlash,
  FaUsers,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaIndustry,
  FaBriefcase,
  FaTags,
  FaUserCircle,
  FaCog,
  FaEdit,
  FaSpinner,
  FaTrash
} from 'react-icons/fa';
import { useNetworkAdminAuthStore } from '../../store/useAuthStore';
import { getNetworkAdminProfile } from '../../api/networkAdminApi';
import {
  createDeliveryLocation,
  updateDeliveryLocation,
  deleteDeliveryLocation,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from '../../api/networkAdminApi';
import type { NetworkAdminRole } from '../../api/networkAdminApi';
import { useAuth } from '../../../../host-app/src/AuthContext';
import type {
  CreateDeliveryLocationDto,
  UpdateDeliveryLocationDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../../api/networkAdminApi';
import type { NetworkAdminProfileResponse } from '../../dto/networkAdminDto';
import type {
  CategoryDto,
  RegistrationDto,
  BankAccountDto,
  DispatchLocationDto,
} from '../../dto/platformDto';
import { isErrorResponse } from '@vosox/shared-ui';
import './CompanyProfile.css';
import { FaPlus } from 'react-icons/fa6';

interface CompanyProfileProps {
  mode?: 'admin-review' | 'network-admin';
  showHeader?: boolean;
  entityLabel?: 'Buyer' | 'Supplier';
  fetchProfile?: () => Promise<any>;
  onBack?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  isStatusLoading?: boolean;
  statusError?: string | null;
  onViewDocument?: (assetId: string, fileName?: string) => void;
  onSettingsClick?: () => void;
}

type DispatchLocationWithId = DispatchLocationDto & { id?: string };
type BankAccountWithId = BankAccountDto & { id?: string };

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'bank' | 'location' | null;
  item: BankAccountWithId | DispatchLocationWithId | null;
  isLoading: boolean;
}

const emptyDispatchForm: DispatchLocationWithId = {
  locationName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  pinCode: '',
  contactPerson: '',
  contactPhone: '',
  isDefault: false,
};

const emptyBankForm: BankAccountWithId = {
  accountHolderName: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  ifscCode: '',
  swiftCode: '',
  currency: '',
  isPrimary: false,
  isVerified: false,
};

const formatCurrency = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null) return '-';
  const symbol = currency === 'INR' ? '₹' : currency ? `${currency} ` : '';
  return `${symbol}${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusClassMap: Record<string, string> = {
  PENDING_VERIFICATION: 'cp-status-pending',
  PENDING: 'cp-status-pending',
  VERIFIED: 'cp-status-verified',
  APPROVED: 'cp-status-verified',
  REJECTED: 'cp-status-rejected',
};

const statusLabelMap: Record<string, string> = {
  PENDING_VERIFICATION: 'Pending Verification',
  PENDING: 'Pending Verification',
  VERIFIED: 'Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}> = ({ icon, title, isOpen, onToggle, extra }) => (
  <div className="cp-card-title" onClick={onToggle} role="button" tabIndex={0}>
    <span className="cp-card-icon">{icon}</span>
    <span className="cp-card-title-text">{title}</span>
    {extra}
    <span className="cp-card-chevron">{isOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
  </div>
);

const MaskedAccountNumber: React.FC<{ accountNumber?: string }> = ({ accountNumber }) => {
  const [revealed, setRevealed] = useState(false);
  if (!accountNumber) return <span className="cp-field-value">-</span>;
  const masked =
    accountNumber.length >= 4
      ? '********' + accountNumber.slice(-4)
      : accountNumber;
  return (
    <span className="cp-field-value cp-field-masked">
      {revealed ? accountNumber : masked}
      <button
        type="button"
        className="cp-icon-toggle"
        onClick={() => setRevealed((v) => !v)}
        aria-label="Toggle account number visibility"
        title={revealed ? 'Hide' : 'Show'}
      >
        {revealed ? <FaEyeSlash /> : <FaEye />}
      </button>
    </span>
  );
};

// Confirmation Modal Component
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, isLoading, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="cp-confirmation-overlay" onClick={onCancel}>
      <div className="cp-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-confirmation-header">
          <h3 className="cp-confirmation-title">{title}</h3>
          <button
            type="button"
            className="cp-confirmation-close"
            onClick={onCancel}
            aria-label="Close"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>

        <div className="cp-confirmation-body">
          <p className="cp-confirmation-message">{message}</p>
        </div>

        <div className="cp-confirmation-footer">
          <button
            type="button"
            className="cp-confirmation-btn cp-confirmation-btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            No, Cancel
          </button>
          <button
            type="button"
            className="cp-confirmation-btn cp-confirmation-btn-delete"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className="cp-confirmation-spinner" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrash />
                Yes, Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const CompanyProfile: React.FC<CompanyProfileProps> = ({
  mode = 'admin-review',
  showHeader = true,
  entityLabel: propsEntityLabel,
  fetchProfile,
  onBack,
  onVerify,
  onReject,
  isStatusLoading = false,
  statusError = null,
  onViewDocument,
  onSettingsClick,
}) => {
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const { auth } = useAuth();
React.useEffect(() => {
  console.log('auth context value:', auth);
}, [auth]);
  const [profile, setProfile] = useState<NetworkAdminProfileResponse | any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState({
    profile: true,
    registrations: true,
    bank: true,
    dispatch: true,
    categories: true,
  });

  // ---- Dispatch Location Modal State ----
  const [dispatchLocations, setDispatchLocations] = useState<DispatchLocationWithId[]>([]);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchModalView, setDispatchModalView] = useState<'list' | 'form'>('list');
  const [editingLocation, setEditingLocation] = useState<DispatchLocationWithId | null>(null);
  const [dispatchForm, setDispatchForm] = useState<DispatchLocationWithId>(emptyDispatchForm);
  const [isDispatchSubmitting, setIsDispatchSubmitting] = useState(false);
  const [dispatchFormError, setDispatchFormError] = useState<string | null>(null);
  const [, setDeletingLocationId] = useState<string | null>(null);
  const [dispatchListError, setDispatchListError] = useState<string | null>(null);

  // ---- Bank Account Modal State ----
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithId[]>([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankModalView, setBankModalView] = useState<'list' | 'form'>('list');
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccountWithId | null>(null);
  const [bankForm, setBankForm] = useState<BankAccountWithId>(emptyBankForm);
  const [isBankSubmitting, setIsBankSubmitting] = useState(false);
  const [bankFormError, setBankFormError] = useState<string | null>(null);
  const [, setDeletingBankAccountId] = useState<string | null>(null);
  const [bankListError, setBankListError] = useState<string | null>(null);

  // ---- Confirmation Modal State ----
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: null,
    item: null,
    isLoading: false,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isBuyer =
    currentUser?.userRole === 'BUYER_NETWORK_ADMIN' ||
    currentUser?.userRole === 'BUYER_ADMINISTRATOR' ||
    currentUser?.userRole === 'BUYER_USER';

  // ✅ FIXED: Helper function to get buyerId from multiple sources
  const getBuyerId = (): string => {
    // Priority 1: Try from auth context
    if (auth?.buyerId && auth.buyerId.trim()) return auth.buyerId;
    
    // Priority 2: Try from profile business profile
    if (profile?.businessProfile?.id) return profile.businessProfile.id;
    
    // Priority 3: Try from current user organization
    if (currentUser?.organizationId) return currentUser.organizationId;
    
    // Fallback
    return '';
  };

  // ---- Validation helpers: only one primary bank account / one default location ----
  const hasOtherPrimaryBank = (excludeId?: string) =>
    bankAccounts.some((a) => a.isPrimary && a.id !== excludeId);

  const hasOtherDefaultLocation = (excludeId?: string) =>
    dispatchLocations.some((l) => l.isDefault && l.id !== excludeId);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (fetchProfile) {
          const data = await fetchProfile();
          if (!cancelled) setProfile(data);
        } else {
          const userRole = currentUser?.userRole;
          const role: NetworkAdminRole = userRole
            ? userRole.includes('BUYER') ? 'BUYER_NETWORK_ADMIN' : 'SUPPLIER_NETWORK_ADMIN'
            : 'SUPPLIER_NETWORK_ADMIN';
          const data = await getNetworkAdminProfile(role);
          if (!cancelled) setProfile(data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load company profile');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [fetchProfile, currentUser]);

  // Keep local dispatch-locations state in sync whenever profile loads/reloads
  useEffect(() => {
    if (profile?.dispatchLocations) {
      setDispatchLocations(profile.dispatchLocations);
    }
  }, [profile]);

  // Keep local bank-accounts state in sync whenever profile loads/reloads
  useEffect(() => {
    if (profile?.bankAccounts) {
      setBankAccounts(profile.bankAccounts);
    }
  }, [profile]);

  const entityLabel = propsEntityLabel || (isBuyer ? 'Buyer' : 'Supplier');

  // ---- Dispatch Location Handlers ----
  const openDispatchModal = () => {
    setDispatchModalView('list');
    setEditingLocation(null);
    setDispatchFormError(null);
    setDispatchListError(null);
    setIsDispatchModalOpen(true);
  };

  const closeDispatchModal = () => {
    setIsDispatchModalOpen(false);
    setDispatchModalView('list');
    setEditingLocation(null);
    setDispatchForm(emptyDispatchForm);
    setDispatchFormError(null);
  };

  const openAddLocationForm = () => {
    setEditingLocation(null);
    setDispatchForm(emptyDispatchForm);
    setDispatchFormError(null);
    setDispatchModalView('form');
  };

  const openEditLocationForm = (loc: DispatchLocationWithId) => {
    setEditingLocation(loc);
    setDispatchForm({ ...loc });
    setDispatchFormError(null);
    setDispatchModalView('form');
  };

  const handleDispatchFormChange = (
    field: keyof DispatchLocationWithId,
    value: string | boolean
  ) => {
    setDispatchForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDispatchFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchFormError(null);

    if (!dispatchForm.locationName || !dispatchForm.addressLine1 || !dispatchForm.city) {
      setDispatchFormError('Please fill in the required fields.');
      return;
    }

    if (dispatchForm.isDefault && hasOtherDefaultLocation(editingLocation?.id)) {
      setDispatchFormError(
        'You already have a default dispatch location. Please unset it before setting a new one as default.'
      );
      return;
    }

    setIsDispatchSubmitting(true);

    const basePayload: CreateDeliveryLocationDto = {
      locationName: dispatchForm.locationName || '',
      addressLine1: dispatchForm.addressLine1 || '',
      addressLine2: dispatchForm.addressLine2 || '',
      city: dispatchForm.city || '',
      state: dispatchForm.state || '',
      country: dispatchForm.country || '',
      pinCode: dispatchForm.pinCode || '',
      contactPerson: dispatchForm.contactPerson || '',
      contactPhone: dispatchForm.contactPhone || '',
      isDefault: !!dispatchForm.isDefault,
    };

    try {
      if (editingLocation?.id) {
        // ✅ FIXED: Get buyerId from helper function
        const buyerId = getBuyerId();
        
        if (!buyerId) {
          setDispatchFormError('Unable to identify buyer. Please refresh the page and try again.');
          setIsDispatchSubmitting(false);
          return;
        }

        const updatePayload: UpdateDeliveryLocationDto = {
          ...basePayload,
          buyerId: buyerId, // ✅ Now has actual value
        };
        const result = await updateDeliveryLocation(editingLocation.id, updatePayload);

        if (isErrorResponse(result)) {
          setDispatchFormError(result.message || 'Failed to update location');
          return;
        }

        setDispatchLocations((prev) =>
          prev.map((loc) =>
            loc.id === editingLocation.id ? { ...basePayload, id: editingLocation.id } : loc
          )
        );
      } else {
        const result = await createDeliveryLocation(basePayload);

        if (!('id' in result)) {
          setDispatchFormError(result.message || 'Failed to create location');
          return;
        }

        setDispatchLocations((prev) => [
          ...prev,
          {
            ...basePayload,
            id: result.id,
          },
        ]);
      }

      setDispatchModalView('list');
      setEditingLocation(null);
      setDispatchForm(emptyDispatchForm);
    } catch (err: any) {
      setDispatchFormError(err.message || 'Something went wrong');
    } finally {
      setIsDispatchSubmitting(false);
    }
  };

  const openDeleteLocationConfirmation = (loc: DispatchLocationWithId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Dispatch Location',
      message: `Are you sure you want to delete "${loc.locationName || 'this location'}"? This action cannot be undone.`,
      type: 'location',
      item: loc,
      isLoading: false,
    });
  };

  const handleConfirmDeleteLocation = async () => {
    const loc = confirmationModal.item as DispatchLocationWithId;
    if (!loc?.id) return;

    setConfirmationModal((prev) => ({ ...prev, isLoading: true }));
    setDispatchListError(null);
    setDeletingLocationId(loc.id);

    try {
      const result = await deleteDeliveryLocation(loc.id);
      if (isErrorResponse(result)) {
        setDispatchListError(result.message || 'Failed to delete location');
        setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      setDispatchLocations((prev) => prev.filter((l) => l.id !== loc.id));
      setConfirmationModal({ isOpen: false, title: '', message: '', type: null, item: null, isLoading: false });
    } catch (err: any) {
      setDispatchListError(err.message || 'Something went wrong while deleting');
      setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
    } finally {
      setDeletingLocationId(null);
    }
  };

  // ---- Bank Account Handlers ----
  const openBankModal = () => {
    setBankModalView('list');
    setEditingBankAccount(null);
    setBankFormError(null);
    setBankListError(null);
    setIsBankModalOpen(true);
  };

  const closeBankModal = () => {
    setIsBankModalOpen(false);
    setBankModalView('list');
    setEditingBankAccount(null);
    setBankForm(emptyBankForm);
    setBankFormError(null);
  };

  const openAddBankForm = () => {
    setEditingBankAccount(null);
    setBankForm(emptyBankForm);
    setBankFormError(null);
    setBankModalView('form');
  };

  const openEditBankForm = (acc: BankAccountWithId) => {
    setEditingBankAccount(acc);
    setBankForm({ ...acc });
    setBankFormError(null);
    setBankModalView('form');
  };

  const handleBankFormChange = (
    field: keyof BankAccountWithId,
    value: string | boolean
  ) => {
    setBankForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBankFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankFormError(null);

    if (
      !bankForm.accountHolderName ||
      !bankForm.bankName ||
      !bankForm.accountNumber ||
      !bankForm.ifscCode
    ) {
      setBankFormError('Please fill in the required fields.');
      return;
    }

    if (bankForm.isPrimary && hasOtherPrimaryBank(editingBankAccount?.id)) {
      setBankFormError(
        'You already have a primary bank account. Please unset it before setting a new one as primary.'
      );
      return;
    }

    setIsBankSubmitting(true);

    const basePayload: CreateBankAccountDto = {
      accountHolderName: bankForm.accountHolderName || '',
      bankName: bankForm.bankName || '',
      branchName: bankForm.branchName || '',
      accountNumber: bankForm.accountNumber || '',
      ifscCode: bankForm.ifscCode || '',
      swiftCode: bankForm.swiftCode || '',
      currency: bankForm.currency || '',
      isPrimary: !!bankForm.isPrimary,
    };

    try {
      if (editingBankAccount?.id) {
        // ✅ FIXED: Get buyerId from helper function
        const buyerId = getBuyerId();
        
        if (!buyerId) {
          setBankFormError('Unable to identify buyer. Please refresh the page and try again.');
          setIsBankSubmitting(false);
          return;
        }

        const updatePayload: UpdateBankAccountDto = {
          ...basePayload,
          buyerId: buyerId, // ✅ Now has actual value
          isVerified: editingBankAccount.isVerified || false,
        };
        const result = await updateBankAccount(editingBankAccount.id, updatePayload);

        if (isErrorResponse(result)) {
          setBankFormError(result.message || 'Failed to update bank account');
          return;
        }

        setBankAccounts((prev) =>
          prev.map((acc) =>
            acc.id === editingBankAccount.id
              ? { ...basePayload, id: editingBankAccount.id, isVerified: editingBankAccount.isVerified }
              : acc
          )
        );
      } else {
        const result = await createBankAccount(basePayload);

        if (!('id' in result)) {
          setBankFormError(result.message || 'Failed to create bank account');
          return;
        }

        setBankAccounts((prev) => [
          ...prev,
          {
            ...basePayload,
            id: result.id,
            isVerified: false,
          },
        ]);
      }

      setBankModalView('list');
      setEditingBankAccount(null);
      setBankForm(emptyBankForm);
    } catch (err: any) {
      setBankFormError(err.message || 'Something went wrong');
    } finally {
      setIsBankSubmitting(false);
    }
  };

  const openDeleteBankAccountConfirmation = (acc: BankAccountWithId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Bank Account',
      message: `Are you sure you want to delete the bank account "${acc.bankName || 'this account'}"? This action cannot be undone.`,
      type: 'bank',
      item: acc,
      isLoading: false,
    });
  };

  const handleConfirmDeleteBankAccount = async () => {
    const acc = confirmationModal.item as BankAccountWithId;
    if (!acc?.id) return;

    setConfirmationModal((prev) => ({ ...prev, isLoading: true }));
    setBankListError(null);
    setDeletingBankAccountId(acc.id);

    try {
      const result = await deleteBankAccount(acc.id);
      if (isErrorResponse(result)) {
        setBankListError(result.message || 'Failed to delete bank account');
        setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      setBankAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      setConfirmationModal({ isOpen: false, title: '', message: '', type: null, item: null, isLoading: false });
    } catch (err: any) {
      setBankListError(err.message || 'Something went wrong while deleting');
      setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
    } finally {
      setDeletingBankAccountId(null);
    }
  };

  const handleConfirmationCancel = () => {
    setConfirmationModal({
      isOpen: false,
      title: '',
      message: '',
      type: null,
      item: null,
      isLoading: false,
    });
  };

  const handleConfirmationConfirm = () => {
    if (confirmationModal.type === 'bank') {
      handleConfirmDeleteBankAccount();
    } else if (confirmationModal.type === 'location') {
      handleConfirmDeleteLocation();
    }
  };

  if (isLoading) {
    return (
      <div className="cp-loading-container">
        <div className="cp-spinner"></div>
        <p>Loading company profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cp-error-container">
        <FaInfoCircle className="cp-error-icon" />
        <p>{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="cp-empty-container">
        <FaBuilding className="cp-empty-icon" />
        <p>No company profile found.</p>
      </div>
    );
  }

  const bp = profile.businessProfile || {};
  const registrations: RegistrationDto[] = profile.registrations || [];
  const categories: CategoryDto[] =
    (profile as any).categories ||
    (profile as any).buyerCategories ||
    (profile as any).supplierCategories ||
    [];

  const statusKey = bp.status || '';
  const statusUpper = statusKey.toUpperCase();
  const isPending = statusUpper === 'PENDING_VERIFICATION' || statusUpper === 'PENDING' || statusUpper === '' || statusUpper === 'PENDING_REVIEW';
  const statusClass = statusClassMap[statusKey] || statusClassMap[statusUpper] || 'cp-status-pending';
  const statusLabel = statusLabelMap[statusKey] || statusLabelMap[statusUpper] || statusKey || '-';

  return (
    <div className="cp-page">
      {showHeader && (
        <div className="cp-page-header cp-page-header-flex">
          <div className="cp-page-header-left">
            {onBack && (
              <button
                onClick={onBack}
                title="Back to Dashboard"
                className="cp-back-btn"
              >
                <FaArrowLeft className="cp-back-btn-icon" /> Back
              </button>
            )}
            <div>
              <h1 className="cp-page-title">Company Details</h1>
              <p className="cp-page-subtitle">View and manage {entityLabel.toLowerCase()} information</p>
            </div>
          </div>

          {onSettingsClick && (
            <button
              className="plat-icon-btn cp-settings-btn"
              onClick={onSettingsClick}
              title="Settings"
            >
              <FaCog />
            </button>
          )}
        </div>
      )}

      {statusError && (
        <div className="cp-status-error-banner">
          {statusError}
        </div>
      )}

      <div className="cp-container">
        <div className="cp-header-card">
          {onBack && !showHeader && (
            <div className="cp-back-btn-wrapper">
              <button
                onClick={onBack}
                title="Back to Dashboard"
                className="cp-back-btn cp-back-btn-sm"
              >
                <FaArrowLeft className="cp-back-btn-icon" /> Back
              </button>
            </div>
          )}
          <div className="cp-header-top">
            <div className="cp-header-left">
              <div className="cp-org-icon">
                <FaBuilding />
              </div>
              <div className="cp-org-info">
                <h2 className="cp-org-name">{bp.organizationName || '-'}</h2>
                <div className="cp-org-contact">
                  {bp.email && (
                    <span className="cp-contact-item">
                      <FaEnvelope />
                      {bp.email}
                    </span>
                  )}
                  {bp.phone && (
                    <span className="cp-contact-item">
                      <FaPhone />
                      +91 {bp.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {mode === 'admin-review' && isPending && (
              <div className="cp-header-actions">
                {onVerify && (
                  <button
                    className="cp-btn cp-btn-verify"
                    title="Verify this company"
                    onClick={onVerify}
                    disabled={isStatusLoading}
                  >
                    <FaCheck />
                    Verify
                  </button>
                )}
                {onReject && (
                  <button
                    className="cp-btn cp-btn-reject"
                    title="Reject this company"
                    onClick={onReject}
                    disabled={isStatusLoading}
                  >
                    <FaTimes />
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="cp-org-badges">
            <span className={`cp-badge ${statusClass}`}>
              <span className="cp-status-dot"></span>
              {statusLabel}
            </span>
            {bp.businessType && <span className="cp-badge cp-badge-outline">{bp.businessType}</span>}
            {bp.industry && <span className="cp-badge cp-badge-outline">{bp.industry}</span>}
          </div>
        </div>

        <div className="cp-body">
          <div className="cp-main-col">
            {/* BUSINESS PROFILE SECTION */}
            <section className="cp-card">
              <SectionHeader
                icon={<FaBuilding />}
                title="1. Business Profile"
                isOpen={openSections.profile}
                onToggle={() => toggleSection('profile')}
              />
              {openSections.profile && (
                <div className="cp-section-box">
                  <div className="cp-grid cp-grid-profile">
                    <div className="cp-grid-column">
                      <div className="cp-field">
                        <span className="cp-field-label">Organization Name</span>
                        <span className="cp-field-value">{bp.organizationName || '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Email</span>
                        <span className="cp-field-value cp-field-link">{bp.email || '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Phone</span>
                        <span className="cp-field-value">{bp.phone ? `+91 ${bp.phone}` : '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Website</span>
                        {bp.website ? (
                          <a
                            href={bp.website}
                            target="_blank"
                            rel="noreferrer"
                            className="cp-field-value cp-field-link"
                          >
                            {bp.website}
                          </a>
                        ) : (
                          <span className="cp-field-value">-</span>
                        )}
                      </div>
                    </div>

                    <div className="cp-grid-column cp-address-box">
                      <div className="cp-field">
                        <span className="cp-field-label">Industry</span>
                        <span className="cp-field-value">{bp.industry || '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Business Type</span>
                        <span className="cp-field-value">{bp.businessType || '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Employee Count</span>
                        <span className="cp-field-value">{bp.employeeCount ?? '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Annual Turnover</span>
                        <span className="cp-field-value">{formatCurrency(bp.annualTurnover, bp.currency)}</span>
                      </div>
                    </div>

                    <div className="cp-grid-column cp-address-box">
                      <div className="cp-field">
                        <span className="cp-field-label">Year Established</span>
                        <span className="cp-field-value">{bp.yearEstablished ?? '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label">Currency</span>
                        <span className="cp-field-value">{bp.currency || '-'}</span>
                      </div>
                      <div className="cp-field">
                        <span className="cp-field-label ">Description</span>
                        <span className="cp-field-value">{bp.description || '-'}</span>
                      </div>
                    </div>

                    <div className="cp-grid-column cp-address-box">
                      <span className="cp-field-label cp-field-label-icon">
                        <FaMapMarkerAlt />
                        Address
                      </span>
                      <span className="cp-field-value">
                        {bp.addressLine1 || '-'}
                        <br />
                        {bp.city || '-'}, {bp.state || '-'}
                        <br />
                        {bp.pinCode || '-'}, {bp.country || '-'}
                      </span>
                      <div className="cp-sub-grid">
                        <div className="cp-field">
                          <span className="cp-field-label">Country</span>
                          <span className="cp-field-value">{bp.country || '-'}</span>
                        </div>
                        <div className="cp-field">
                          <span className="cp-field-label">State</span>
                          <span className="cp-field-value">{bp.state || '-'}</span>
                        </div>
                        <div className="cp-field">
                          <span className="cp-field-label">City</span>
                          <span className="cp-field-value">{bp.city || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* BUSINESS REGISTRATIONS SECTION */}
            <section className="cp-card">
              <SectionHeader
                icon={<FaFileContract />}
                title="2. Business Registrations"
                isOpen={openSections.registrations}
                onToggle={() => toggleSection('registrations')}
              />
              {openSections.registrations && (
                <div className="cp-section-box">
                  {registrations.length === 0 ? (
                    <p className="cp-empty-inline">No registrations added</p>
                  ) : (
                    <div className="cp-table-wrapper">
                      <table className="cp-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Number</th>
                            <th>Name</th>
                            <th>Expiry Date</th>
                            <th>Document</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, idx) => (
                            <tr key={idx}>
                              <td>{reg.registrationType || '-'}</td>
                              <td>{reg.registrationNumber || '-'}</td>
                              <td>{reg.registrationName || '-'}</td>
                              <td>{formatDate(reg.expiryDate)}</td>
                              <td>
                                {reg.asset?.fileName || (reg.asset as any)?.id ? (
                                  <div className="cp-doc-link-wrapper">
                                    <span className="cp-doc-link" title={reg.asset?.fileName}>
                                      <FaFilePdf className="cp-pdf-icon" />
                                      {reg.asset?.fileName || 'Document'}
                                    </span>
                                    <span
                                      className={`cp-doc-actions ${onViewDocument ? 'cp-doc-actions-clickable' : 'cp-doc-actions-default'}`}
                                      onClick={() => {
                                        const assetId = reg.asset?.id || (reg.asset as any)?.id;
                                        if (assetId && onViewDocument) {
                                          onViewDocument(assetId, reg.asset?.fileName);
                                        }
                                      }}
                                      title="View Document"
                                    >
                                      <FaEye className="cp-eye-icon" />
                                    </span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* BANK ACCOUNTS SECTION */}
            <section className="cp-card">
              <div className="cp-card-header-flex">
                <SectionHeader
                  icon={<FaUniversity />}
                  title="3. Bank Accounts"
                  isOpen={openSections.bank}
                  onToggle={() => toggleSection('bank')}
                  extra={
                    bankAccounts.some((a) => a.isPrimary) ? (
                      <span className="cp-pill cp-pill-yes">
                        <FaCheck /> Primary Account
                      </span>
                    ) : undefined
                  }
                />
                {isBuyer && (
                  <button
                    type="button"
                    className="cp-manage-btn"
                    title="Manage Bank Accounts"
                    onClick={openBankModal}
                  >
                    <FaCog />
                  </button>
                )}
              </div>
              {openSections.bank && (
                <div className="cp-section-box">
                  {bankAccounts.length === 0 ? (
                    <p className="cp-empty-inline">No bank accounts added</p>
                  ) : (
                    bankAccounts.map((acc, idx) => (
                      <React.Fragment key={acc.id || idx}>
                        {idx > 0 && <div className="cp-divider" />}
                        <div className="cp-grid cp-grid-3">
                          <div className="cp-field">
                            <span className="cp-field-label">Account Holder Name</span>
                            <span className="cp-field-value">{acc.accountHolderName || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Account Number</span>
                            <MaskedAccountNumber accountNumber={acc.accountNumber} />
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Currency</span>
                            <span className="cp-field-value">{acc.currency || '-'}</span>
                          </div>

                          <div className="cp-field">
                            <span className="cp-field-label">Bank Name</span>
                            <span className="cp-field-value">{acc.bankName || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">IFSC Code</span>
                            <span className="cp-field-value">{acc.ifscCode || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Primary Account</span>
                            <span className={`cp-status-pill ${acc.isPrimary ? 'cp-pill-green' : 'cp-pill-red'}`}>
                              {acc.isPrimary ? 'Yes' : 'No'}
                            </span>
                          </div>

                          <div className="cp-field">
                            <span className="cp-field-label">Branch Name</span>
                            <span className="cp-field-value">{acc.branchName || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">SWIFT Code</span>
                            <span className="cp-field-value">{acc.swiftCode || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Verified</span>
                            <span className={`cp-status-pill ${acc.isVerified ? 'cp-pill-green' : 'cp-pill-red'}`}>
                              {acc.isVerified ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* DISPATCH LOCATIONS SECTION */}
            <section className="cp-card">
              <div className="cp-card-header-flex">
                <SectionHeader
                  icon={<FaTruck />}
                  title="4. Dispatch Locations"
                  isOpen={openSections.dispatch}
                  onToggle={() => toggleSection('dispatch')}
                />
                {isBuyer && (
                  <button
                    type="button"
                    className="cp-manage-btn"
                    title="Manage Dispatch Locations"
                    onClick={openDispatchModal}
                  >
                    <FaCog />
                  </button>
                )}
              </div>
              {openSections.dispatch && (
                <div className="cp-section-box">
                  {dispatchLocations.length === 0 ? (
                    <p className="cp-empty-inline">No dispatch locations added</p>
                  ) : (
                    dispatchLocations.map((loc, idx) => (
                      <React.Fragment key={loc.id || idx}>
                        {idx > 0 && <div className="cp-divider" />}
                        <div className="cp-grid cp-grid-3">
                          <div className="cp-field">
                            <span className="cp-field-label">Location Name</span>
                            <span className="cp-field-value">{loc.locationName || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Address</span>
                            <span className="cp-field-value">
                              {loc.addressLine1 || '-'}
                              <br />
                              {loc.city && <>{loc.city}, </>}
                              {loc.state && <>{loc.state} - </>}
                              {loc.country}
                            </span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Default Location</span>
                            <span className={`cp-status-pill ${loc.isDefault ? 'cp-pill-green' : 'cp-pill-red'}`}>
                              {loc.isDefault ? 'Yes' : 'No'}
                            </span>
                          </div>

                          <div className="cp-field">
                            <span className="cp-field-label">Contact Person</span>
                            <span className="cp-field-value">{loc.contactPerson || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Contact Email</span>
                            <span className="cp-field-value">{loc.contactEmail || '-'}</span>
                          </div>
                          <div className="cp-field">
                            <span className="cp-field-label">Contact Phone</span>
                            <span className="cp-field-value">
                              {loc.contactPhone ? `+91 ${loc.contactPhone}` : '-'}
                            </span>
                          </div>
                          <div className="cp-field"></div>
                          <div className="cp-field"></div>
                        </div>
                      </React.Fragment>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* PRODUCT CATEGORIES SECTION */}
            <section className="cp-card">
              <SectionHeader
                icon={<FaThLarge />}
                title="5. Product Categories"
                isOpen={openSections.categories}
                onToggle={() => toggleSection('categories')}
              />
              {openSections.categories && (
                <div className="cp-section-box">
                  {categories.length === 0 ? (
                    <p className="cp-empty-inline">No categories added</p>
                  ) : (
                    categories.map((cat, idx) => (
                      <div className="cp-category-chain" key={idx}>
                        <div className="cp-category-step">
                          <span className="cp-category-label cp-category-label-segment">Segment</span>
                          <span className="cp-field-value">{cat.segment ?? '-'}</span>
                          <span className="cp-category-sub">{cat.segmentTitle || '-'}</span>
                        </div>
                        <span className="cp-category-arrow">→</span>
                        <div className="cp-category-step">
                          <span className="cp-category-label cp-category-label-family">Family</span>
                          <span className="cp-field-value">{cat.family ?? '-'}</span>
                          <span className="cp-category-sub">{cat.familyTitle || '-'}</span>
                        </div>
                        <span className="cp-category-arrow">→</span>
                        <div className="cp-category-step">
                          <span className="cp-category-label cp-category-label-class">Class</span>
                          <span className="cp-field-value">{cat.class ?? '-'}</span>
                          <span className="cp-category-sub">{cat.classTitle || '-'}</span>
                        </div>
                        <span className="cp-category-arrow">→</span>
                        <div className="cp-category-step">
                          <span className="cp-category-label cp-category-label-commodity">Commodity</span>
                          <span className="cp-field-value">{cat.commodity ?? '-'}</span>
                          <span className="cp-category-sub">{cat.commodityTitle || '-'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR SUMMARY CARD */}
          <aside className="cp-side-col">
            <div className="cp-card cp-summary-card">
              <div className="cp-card-title cp-card-title-static">
                <span className="cp-card-icon">
                  <FaInfoCircle />
                </span>
                <span className="cp-card-title-text">{entityLabel} Summary</span>
              </div>

              <div className="cp-summary-content">
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaBuilding className="cp-summary-icon" /> Organization Name
                  </span>
                  <span className="cp-summary-value">{bp.organizationName || '-'}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaInfoCircle className="cp-summary-icon" /> Status
                  </span>
                  <span className={`cp-status-dot-inline ${statusClass}`}>
                    <span className="cp-status-dot"></span>
                    {statusLabel}
                  </span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaIndustry className="cp-summary-icon" /> Industry
                  </span>
                  <span className="cp-summary-value">{bp.industry || '-'}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaBriefcase className="cp-summary-icon" /> Business Type
                  </span>
                  <span className="cp-summary-value">{bp.businessType || '-'}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaUsers className="cp-summary-icon" /> Employees
                  </span>
                  <span className="cp-summary-value">{bp.employeeCount ?? '-'}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaMoneyBillWave className="cp-summary-icon" /> Annual Turnover
                  </span>
                  <span className="cp-summary-value">{formatCurrency(bp.annualTurnover, bp.currency)}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaCalendarAlt className="cp-summary-icon" /> Year Established
                  </span>
                  <span className="cp-summary-value">{bp.yearEstablished ?? '-'}</span>
                </div>

                <div className="cp-divider" />

                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaFileContract className="cp-summary-icon" /> Registrations
                  </span>
                  <span className="cp-summary-value">{registrations.length}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaUniversity className="cp-summary-icon" /> Bank Accounts
                  </span>
                  <span className="cp-summary-value">{bankAccounts.length}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaMapMarkerAlt className="cp-summary-icon" /> Dispatch Locations
                  </span>
                  <span className="cp-summary-value">{dispatchLocations.length}</span>
                </div>
                <div className="cp-summary-row">
                  <span className="cp-summary-label">
                    <FaTags className="cp-summary-icon" /> Product Categories
                  </span>
                  <span className="cp-summary-value">{categories.length}</span>
                </div>

                <div className="cp-divider" />

                <div className="cp-summary-row cp-summary-row-stacked">
                  <span className="cp-summary-label">
                    <FaUserCircle className="cp-summary-icon" /> Created By
                  </span>
                  <span className="cp-summary-value cp-summary-value-link">{bp.email || '-'}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* BANK ACCOUNT MODAL */}
      {isBankModalOpen && (
        <div className="cp-modal-overlay" onClick={closeBankModal}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3 className="cp-modal-title">
                {bankModalView === 'list'
                  ? 'Bank Accounts'
                  : editingBankAccount
                    ? 'Edit Bank Account'
                    : 'Add Bank Account'}
              </h3>
              <button
                type="button"
                className="cp-modal-close"
                onClick={closeBankModal}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="cp-modal-body">
              {bankModalView === 'list' ? (
                <>
                  {bankListError && (
                    <div className="cp-modal-error">{bankListError}</div>
                  )}

                  <button
                    type="button"
                    className="cp-btn cp-btn-add-location"
                    onClick={openAddBankForm}
                  >
                    <FaPlus /> Add New Bank Account
                  </button>

                  {bankAccounts.length === 0 ? (
                    <p className="cp-empty-inline" style={{ marginTop: '12px' }}>
                      No bank accounts added yet
                    </p>
                  ) : (
                    <div className="cp-location-list">
                      {bankAccounts.map((acc, idx) => (
                        <div className="cp-location-list-item" key={acc.id || idx}>
                          <div className="cp-location-list-info">
                            <div className="cp-location-list-name">
                              {acc.bankName || '-'}
                              {acc.isPrimary && (
                                <span className="cp-pill cp-pill-yes cp-location-default-tag">
                                  <FaCheck /> Primary
                                </span>
                              )}
                            </div>
                            <div className="cp-location-list-address">
                              {acc.accountHolderName}
                              {acc.accountNumber ? ` • ****${acc.accountNumber.slice(-4)}` : ''}
                            </div>
                          </div>
                          <div className="cp-location-list-actions">
                            <button
                              type="button"
                              className="cp-icon-action-btn"
                              title="Edit"
                              onClick={() => openEditBankForm(acc)}
                              disabled={!acc.id}
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className="cp-icon-action-btn cp-icon-action-btn-danger"
                              title="Delete"
                              onClick={() => openDeleteBankAccountConfirmation(acc)}
                              disabled={!acc.id}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form className="cp-dispatch-form" onSubmit={handleBankFormSubmit}>
                  {bankFormError && (
                    <div className="cp-modal-error">{bankFormError}</div>
                  )}

                  <div className="cp-form-grid">
                    <div className="cp-form-field">
                      <label>Account Holder Name *</label>
                      <input
                        type="text"
                        value={bankForm.accountHolderName || ''}
                        onChange={(e) => handleBankFormChange('accountHolderName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Bank Name *</label>
                      <input
                        type="text"
                        value={bankForm.bankName || ''}
                        onChange={(e) => handleBankFormChange('bankName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Branch Name</label>
                      <input
                        type="text"
                        value={bankForm.branchName || ''}
                        onChange={(e) => handleBankFormChange('branchName', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Account Number *</label>
                      <input
                        type="text"
                        value={bankForm.accountNumber || ''}
                        onChange={(e) => handleBankFormChange('accountNumber', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>IFSC Code *</label>
                      <input
                        type="text"
                        value={bankForm.ifscCode || ''}
                        onChange={(e) => handleBankFormChange('ifscCode', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>SWIFT Code</label>
                      <input
                        type="text"
                        value={bankForm.swiftCode || ''}
                        onChange={(e) => handleBankFormChange('swiftCode', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Currency</label>
                      <input
                        type="text"
                        value={bankForm.currency || ''}
                        onChange={(e) => handleBankFormChange('currency', e.target.value)}
                        placeholder="e.g. INR, USD"
                      />
                    </div>
                    <div className="cp-form-field cp-form-field-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={!!bankForm.isPrimary}
                          disabled={hasOtherPrimaryBank(editingBankAccount?.id)}
                          onChange={(e) => handleBankFormChange('isPrimary', e.target.checked)}
                        />
                        Set as Primary Account
                      </label>
                      {hasOtherPrimaryBank(editingBankAccount?.id) && (
                        <span className="cp-form-hint">You already have a primary account</span>
                      )}
                    </div>
                  </div>

                  <div className="cp-form-actions">
                    <button
                      type="button"
                      className="cp-btn cp-btn-cancel"
                      onClick={() => setBankModalView('list')}
                      disabled={isBankSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cp-btn cp-btn-verify"
                      disabled={isBankSubmitting}
                    >
                      {isBankSubmitting
                        ? 'Saving...'
                        : editingBankAccount
                          ? 'Update Account'
                          : 'Save Account'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH LOCATION MODAL */}
      {isDispatchModalOpen && (
        <div className="cp-modal-overlay" onClick={closeDispatchModal}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3 className="cp-modal-title">
                {dispatchModalView === 'list'
                  ? 'Dispatch Locations'
                  : editingLocation
                    ? 'Edit Dispatch Location'
                    : 'Add Dispatch Location'}
              </h3>
              <button
                type="button"
                className="cp-modal-close"
                onClick={closeDispatchModal}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="cp-modal-body">
              {dispatchModalView === 'list' ? (
                <>
                  {dispatchListError && (
                    <div className="cp-modal-error">{dispatchListError}</div>
                  )}

                  <button
                    type="button"
                    className="cp-btn cp-btn-add-location"
                    onClick={openAddLocationForm}
                  >
                    <FaPlus /> Add New Location
                  </button>

                  {dispatchLocations.length === 0 ? (
                    <p className="cp-empty-inline" style={{ marginTop: '12px' }}>
                      No dispatch locations added yet
                    </p>
                  ) : (
                    <div className="cp-location-list">
                      {dispatchLocations.map((loc, idx) => (
                        <div className="cp-location-list-item" key={loc.id || idx}>
                          <div className="cp-location-list-info">
                            <div className="cp-location-list-name">
                              {loc.locationName || '-'}
                              {loc.isDefault && (
                                <span className="cp-pill cp-pill-yes cp-location-default-tag">
                                  <FaCheck /> Default
                                </span>
                              )}
                            </div>
                            <div className="cp-location-list-address">
                              {loc.addressLine1}
                              {loc.city ? `, ${loc.city}` : ''}
                              {loc.state ? `, ${loc.state}` : ''}
                              {loc.country ? `, ${loc.country}` : ''}
                            </div>
                          </div>
                          <div className="cp-location-list-actions">
                            <button
                              type="button"
                              className="cp-icon-action-btn"
                              title="Edit"
                              onClick={() => openEditLocationForm(loc)}
                              disabled={!loc.id}
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className="cp-icon-action-btn cp-icon-action-btn-danger"
                              title="Delete"
                              onClick={() => openDeleteLocationConfirmation(loc)}
                              disabled={!loc.id}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form className="cp-dispatch-form" onSubmit={handleDispatchFormSubmit}>
                  {dispatchFormError && (
                    <div className="cp-modal-error">{dispatchFormError}</div>
                  )}

                  <div className="cp-form-grid">
                    <div className="cp-form-field">
                      <label>Location Name *</label>
                      <input
                        type="text"
                        value={dispatchForm.locationName || ''}
                        onChange={(e) => handleDispatchFormChange('locationName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Address Line 1 *</label>
                      <input
                        type="text"
                        value={dispatchForm.addressLine1 || ''}
                        onChange={(e) => handleDispatchFormChange('addressLine1', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Address Line 2</label>
                      <input
                        type="text"
                        value={dispatchForm.addressLine2 || ''}
                        onChange={(e) => handleDispatchFormChange('addressLine2', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>City *</label>
                      <input
                        type="text"
                        value={dispatchForm.city || ''}
                        onChange={(e) => handleDispatchFormChange('city', e.target.value)}
                        required
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>State</label>
                      <input
                        type="text"
                        value={dispatchForm.state || ''}
                        onChange={(e) => handleDispatchFormChange('state', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Country</label>
                      <input
                        type="text"
                        value={dispatchForm.country || ''}
                        onChange={(e) => handleDispatchFormChange('country', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Pin Code</label>
                      <input
                        type="text"
                        value={dispatchForm.pinCode || ''}
                        onChange={(e) => handleDispatchFormChange('pinCode', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Contact Person</label>
                      <input
                        type="text"
                        value={dispatchForm.contactPerson || ''}
                        onChange={(e) => handleDispatchFormChange('contactPerson', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field">
                      <label>Contact Phone</label>
                      <input
                        type="text"
                        value={dispatchForm.contactPhone || ''}
                        onChange={(e) => handleDispatchFormChange('contactPhone', e.target.value)}
                      />
                    </div>
                    <div className="cp-form-field cp-form-field-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={!!dispatchForm.isDefault}
                          disabled={hasOtherDefaultLocation(editingLocation?.id)}
                          onChange={(e) => handleDispatchFormChange('isDefault', e.target.checked)}
                        />
                        Set as Default Location
                      </label>
                      {hasOtherDefaultLocation(editingLocation?.id) && (
                        <span className="cp-form-hint">You already have a default location</span>
                      )}
                    </div>
                  </div>

                  <div className="cp-form-actions">
                    <button
                      type="button"
                      className="cp-btn cp-btn-cancel"
                      onClick={() => setDispatchModalView('list')}
                      disabled={isDispatchSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cp-btn cp-btn-verify"
                      disabled={isDispatchSubmitting}
                    >
                      {isDispatchSubmitting
                        ? 'Saving...'
                        : editingLocation
                          ? 'Update Location'
                          : 'Save Location'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        isLoading={confirmationModal.isLoading}
        onConfirm={handleConfirmationConfirm}
        onCancel={handleConfirmationCancel}
      />
    </div>
  );
};

export default CompanyProfile;