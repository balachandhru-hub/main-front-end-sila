import React, { useState, useEffect } from 'react';
import {
  downloadBuyerAsset,
  downloadSupplierAsset,
  updateBuyerStatus,
  updateSupplierStatus,
  getSupplierProfileByOrgId,
  getBuyerProfileByOrgId,
} from '../api/platformApi';
import type {
  BusinessProfileDto,
  RegistrationDto,
  BankAccountDto,
  DispatchLocationDto,
  CategoryDto,
  PlatformEntityType,
  PlatformRecordDto,
} from '../dto/platformDto';
import {
  FaArrowLeft,
  FaDownload,
  FaCheck,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBuilding,
  FaInfoCircle,
  FaFileAlt,
  FaUniversity,
  FaWarehouse,
  FaBoxOpen,
  FaUser,
  FaTag,
  FaEye,
  FaArrowRight,
  FaSpinner,
  FaEllipsisV,
} from 'react-icons/fa';
import './PlatformUserDetailView.css';

interface PlatformUserDetailViewProps {
  type: PlatformEntityType;
  record: PlatformRecordDto;
  onBack: () => void;
  onStatusUpdated?: () => void;
}

const formatCurrency = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null || amount === 0) return 'Not specified';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency || ''}`.trim();
  }
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Not specified';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const base64ToBlob = (base64: string, contentType: string): Blob => {
  let cleanBase64 = base64;
  if (base64.includes(',')) {
    cleanBase64 = base64.split(',')[1];
  }
  try {
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    let mimeType = contentType || 'application/pdf';
    if (mimeType === 'pdf') {
      mimeType = 'application/pdf';
    }
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error('Error converting base64 to blob:', error);
    throw new Error('Failed to process file data');
  }
};

export const PlatformUserDetailView: React.FC<PlatformUserDetailViewProps> = ({
  type,
  record,
  onBack,
  onStatusUpdated,
}) => {
  const [profileRecord, setProfileRecord] = useState<PlatformRecordDto>(record);
  const [fetchingProfile, setFetchingProfile] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      const rawObj = record as any;
      const targetOrgId = record.organizationId || rawObj.organizationId || record.id || rawObj.id;
      if (!targetOrgId) return;

      setFetchingProfile(true);
      try {
        const result =
          type === 'buyers'
            ? await getBuyerProfileByOrgId(targetOrgId)
            : await getSupplierProfileByOrgId(targetOrgId);
        if (isMounted && result) {
          setProfileRecord(result);
        }
      } catch (err) {
        console.warn('API profile fetch error, using initial card record data:', err);
      } finally {
        if (isMounted) setFetchingProfile(false);
      }
    };

    setProfileRecord(record);
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [record, type]);

  const currentRecord = profileRecord || record;
  const raw = currentRecord as any;
  const profile: BusinessProfileDto = {
    organizationName: currentRecord.businessProfile?.organizationName || raw.organizationName || raw.name || 'Unnamed Business',
    email: currentRecord.businessProfile?.email || raw.email,
    phone: currentRecord.businessProfile?.phone || raw.phone,
    country: currentRecord.businessProfile?.country || raw.country,
    city: currentRecord.businessProfile?.city || raw.city,
    state: currentRecord.businessProfile?.state || raw.state,
    industry: currentRecord.businessProfile?.industry || raw.industry,
    businessType: currentRecord.businessProfile?.businessType || raw.businessType,
    employeeCount: currentRecord.businessProfile?.employeeCount || raw.employeeCount,
    annualTurnover: currentRecord.businessProfile?.annualTurnover || raw.annualTurnover,
    currency: currentRecord.businessProfile?.currency || raw.currency,
    yearEstablished: currentRecord.businessProfile?.yearEstablished || raw.yearEstablished,
    website: currentRecord.businessProfile?.website || raw.website,
    description: currentRecord.businessProfile?.description || raw.description,
    status: currentRecord.businessProfile?.status || raw.status,
    isActive: currentRecord.isActive ?? currentRecord.businessProfile?.isActive ?? true,
    ...currentRecord.businessProfile,
  };

  const registrations: RegistrationDto[] = currentRecord.registrations || raw.registrations || [];
  const bankAccounts: BankAccountDto[] = currentRecord.bankAccounts || raw.bankAccounts || [];
  const dispatchLocations: DispatchLocationDto[] = currentRecord.dispatchLocations || raw.dispatchLocations || [];
  const categories: CategoryDto[] = currentRecord.categories || raw.buyerCategories || raw.supplierCategories || [];

  const orgId = currentRecord.organizationId || raw.organizationId || currentRecord.id || raw.id || '';
  const entityId = currentRecord.id || raw.id || orgId;

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    profile: true,
    registrations: true,
    bankAccounts: true,
    dispatchLocations: true,
    categories: true,
  });

  const toggleSection = (sec: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Status & action states
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  const currentStatus = (profile.status || '').toUpperCase();
  const isApproved = currentStatus === 'APPROVED' || currentStatus === 'APPROVED_VERIFICATION';
  const isRejected = currentStatus === 'REJECTED';
  const isFinalized = isApproved || isRejected;

  const entityTitle = type === 'buyers' ? 'Buyer Details' : 'Supplier Details';
  const entitySingular = type === 'buyers' ? 'Buyer' : 'Supplier';

  const handleVerify = async () => {
    if (statusLoading) return;
    setStatusError(null);
    setStatusLoading(true);
    try {
      if (type === 'buyers') {
        await updateBuyerStatus(entityId, 'APPROVED');
      } else {
        await updateSupplierStatus(entityId, 'APPROVED');
      }
      setProfileRecord((prev: any) => ({
        ...prev,
        businessProfile: { ...(prev?.businessProfile || {}), status: 'APPROVED' },
        status: 'APPROVED',
      }));
      onStatusUpdated?.();
    } catch (err: any) {
      console.error('Failed to approve:', err);
      setStatusError(err.message || 'Failed to verify organization.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReject = async () => {
    if (statusLoading) return;
    if (!rejectComments.trim()) {
      setStatusError('Comments are required for rejection.');
      return;
    }
    setStatusError(null);
    setStatusLoading(true);
    try {
      if (type === 'buyers') {
        await updateBuyerStatus(entityId, 'REJECTED', rejectComments);
      } else {
        await updateSupplierStatus(entityId, 'REJECTED', rejectComments);
      }
      setProfileRecord((prev: any) => ({
        ...prev,
        businessProfile: { ...(prev?.businessProfile || {}), status: 'REJECTED' },
        status: 'REJECTED',
      }));
      setShowRejectModal(false);
      onStatusUpdated?.();
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setStatusError(err.message || 'Failed to reject registration.');
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchAsset = async (assetId: string) => {
    return type === 'buyers' ? downloadBuyerAsset(assetId) : downloadSupplierAsset(assetId);
  };

  const handleViewDoc = async (assetId: string, _key: string) => {
    setActionError(null);
    try {
      const data = await fetchAsset(assetId);
      const fileBytes = typeof data === 'string' ? data : data.fileBytes;
      let contentType = data.contentType || 'application/pdf';
      if (contentType === 'pdf') contentType = 'application/pdf';
      if (!fileBytes) throw new Error('No file data received');
      const blob = base64ToBlob(fileBytes, contentType);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      console.error('Failed to view document:', err);
      setActionError(err.message || 'Failed to open document.');
    }
  };

  const setActionError = (msg: string | null) => setStatusError(msg);

  const fullAddress = [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.pinCode, profile.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="pudv-container">
      {/* 1. TOP TITLE BAR */}
      <div className="pudv-top-bar">
        <div className="pudv-top-left">
          <button className="pudv-back-btn" onClick={onBack} title="Back to Dashboard">
            <FaArrowLeft />
          </button>
          <h2 className="pudv-top-title">
            {entityTitle} {fetchingProfile && <FaSpinner className="pudv-spin" style={{ fontSize: '14px', marginLeft: '8px', color: '#2563eb' }} />}
          </h2>
        </div>
        <div className="pudv-top-actions">
          <button className="pudv-btn-secondary" title="Download All Documents">
            <FaDownload style={{ marginRight: '6px' }} /> Download All Documents
          </button>
          <button className="pudv-btn-icon" title="More Options">
            <FaEllipsisV />
          </button>
        </div>
      </div>

      {statusError && <div className="pudv-error-banner">{statusError}</div>}

      {/* 2. HERO HERO BANNER CARD */}
      <div className="pudv-hero-card">
        <div className="pudv-hero-left">
          <div className="pudv-hero-avatar">
            <FaBuilding />
          </div>
          <div className="pudv-hero-info">
            <h1 className="pudv-hero-title">{profile.organizationName}</h1>
            <div className="pudv-hero-contacts">
              {profile.email && (
                <span className="pudv-hero-contact-item">
                  <FaEnvelope /> {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="pudv-hero-contact-item">
                  <FaPhone /> {profile.phone}
                </span>
              )}
            </div>
            <div className="pudv-hero-chips">
              <span className={`pudv-chip pudv-chip-status ${profile.status?.toLowerCase().replace(/_/g, '-')}`}>
                {profile.status ? profile.status.replace(/_/g, ' ') : 'PENDING VERIFICATION'}
              </span>
              {profile.businessType && <span className="pudv-chip pudv-chip-type">{profile.businessType}</span>}
              {profile.industry && <span className="pudv-chip pudv-chip-industry">{profile.industry}</span>}
            </div>
          </div>
        </div>

        <div className="pudv-hero-actions">
          {!isFinalized && (
            <button className="pudv-btn-verify" onClick={handleVerify} disabled={statusLoading}>
              {statusLoading ? <FaSpinner className="pudv-spin" /> : <FaCheck />} Verify
            </button>
          )}
          {!isFinalized && (
            <button className="pudv-btn-reject" onClick={() => setShowRejectModal(true)} disabled={statusLoading}>
              <FaTimes style={{ marginRight: '6px' }} /> Reject
            </button>
          )}
        </div>
      </div>

      {/* 3. TWO-COLUMN LAYOUT */}
      <div className="pudv-grid-layout">
        {/* LEFT COLUMN: SECTIONS 1 TO 5 */}
        <div className="pudv-main-col">
          {/* SECTION 1: Business Profile */}
          <div className="pudv-section-card">
            <div className="pudv-section-header" onClick={() => toggleSection('profile')}>
              <div className="pudv-section-title">
                <span className="pudv-sec-num">1</span>
                <h3>Business Profile</h3>
              </div>
              <button className="pudv-chevron-btn">
                {openSections.profile ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {openSections.profile && (
              <div className="pudv-section-body">
                <div className="pudv-details-grid">
                  <div className="pudv-field">
                    <span className="pudv-label">Organization Name</span>
                    <span className="pudv-val-bold">{profile.organizationName || '-'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Industry</span>
                    <span className="pudv-val">{profile.industry || '-'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Year Established</span>
                    <span className="pudv-val">{profile.yearEstablished || '-'}</span>
                  </div>

                  <div className="pudv-field pudv-address-field">
                    <span className="pudv-label">
                      <FaMapMarkerAlt style={{ marginRight: '4px', color: '#64748b' }} /> Address
                    </span>
                    <div className="pudv-address-box">
                      <div>{fullAddress || 'Not specified'}</div>
                    </div>
                  </div>

                  <div className="pudv-field">
                    <span className="pudv-label">Email</span>
                    <span className="pudv-val">{profile.email || '-'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Business Type</span>
                    <span className="pudv-val">{profile.businessType || '-'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Currency</span>
                    <span className="pudv-val">{profile.currency || 'INR'}</span>
                  </div>

                  <div className="pudv-field">
                    <span className="pudv-label">Country</span>
                    <span className="pudv-val">{profile.country || 'India'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">State</span>
                    <span className="pudv-val">{profile.state || '-'}</span>
                  </div>

                  <div className="pudv-field">
                    <span className="pudv-label">Phone</span>
                    <span className="pudv-val">{profile.phone || '-'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Employee Count</span>
                    <span className="pudv-val">{profile.employeeCount ?? '-'}</span>
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Description</span>
                    <span className="pudv-val">{profile.description || '-'}</span>
                  </div>

                  <div className="pudv-field">
                    <span className="pudv-label">City</span>
                    <span className="pudv-val">{profile.city || '-'}</span>
                  </div>

                  <div className="pudv-field">
                    <span className="pudv-label">Website</span>
                    {profile.website ? (
                      <a
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pudv-link"
                      >
                        {profile.website}
                      </a>
                    ) : (
                      <span className="pudv-val">-</span>
                    )}
                  </div>
                  <div className="pudv-field">
                    <span className="pudv-label">Annual Turnover</span>
                    <span className="pudv-val">{formatCurrency(profile.annualTurnover, profile.currency)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Business Registrations */}
          <div className="pudv-section-card">
            <div className="pudv-section-header" onClick={() => toggleSection('registrations')}>
              <div className="pudv-section-title">
                <span className="pudv-sec-num">2</span>
                <h3>Business Registrations</h3>
              </div>
              <button className="pudv-chevron-btn">
                {openSections.registrations ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {openSections.registrations && (
              <div className="pudv-section-body">
                {registrations.length === 0 ? (
                  <div className="pudv-empty-msg">No business registrations submitted.</div>
                ) : (
                  <table className="pudv-table">
                    <thead>
                      <tr>
                        <th>Registration Type</th>
                        <th>Registration Number</th>
                        <th>Registration Name</th>
                        <th>Expiry Date</th>
                        <th>Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{reg.registrationType || '-'}</strong>
                          </td>
                          <td>{reg.registrationNumber || '-'}</td>
                          <td>{reg.registrationName || '-'}</td>
                          <td>{formatDate(reg.expiryDate)}</td>
                          <td>
                            {reg.asset?.id ? (
                              <button
                                className="pudv-doc-btn"
                                onClick={() => handleViewDoc(reg.asset!.id!, `reg-${idx}`)}
                              >
                                <FaFileAlt style={{ color: '#ef4444', marginRight: '6px' }} />
                                <span>{reg.asset.fileName || reg.asset.assetName || 'content.pdf'}</span>
                                <FaEye style={{ marginLeft: '8px', color: '#2563eb' }} />
                              </button>
                            ) : (
                              <span className="pudv-val-muted">No document</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: Bank Accounts */}
          <div className="pudv-section-card">
            <div className="pudv-section-header" onClick={() => toggleSection('bankAccounts')}>
              <div className="pudv-section-title">
                <span className="pudv-sec-num">3</span>
                <h3>Bank Accounts</h3>
              </div>
              <span className="pudv-tag-primary">✓ Primary Account</span>
              <button className="pudv-chevron-btn">
                {openSections.bankAccounts ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {openSections.bankAccounts && (
              <div className="pudv-section-body">
                {bankAccounts.length === 0 ? (
                  <div className="pudv-empty-msg">No bank account details provided.</div>
                ) : (
                  bankAccounts.map((bank, idx) => (
                    <div key={idx} className="pudv-bank-card">
                      <div className="pudv-details-grid pudv-3col">
                        <div className="pudv-field">
                          <span className="pudv-label">Account Holder Name</span>
                          <span className="pudv-val-bold">{bank.accountHolderName || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Account Number</span>
                          <span className="pudv-val">{bank.accountNumber ? `*******${bank.accountNumber.slice(-4)}` : '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Currency</span>
                          <span className="pudv-val">{bank.currency || 'INR'}</span>
                        </div>

                        <div className="pudv-field">
                          <span className="pudv-label">Bank Name</span>
                          <span className="pudv-val">{bank.bankName || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">IFSC Code</span>
                          <span className="pudv-val">{bank.ifscCode || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Primary Account</span>
                          <span className="pudv-pill-yes">{bank.isPrimary ? 'Yes' : 'No'}</span>
                        </div>

                        <div className="pudv-field">
                          <span className="pudv-label">Branch Name</span>
                          <span className="pudv-val">{bank.branchName || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">SWIFT Code</span>
                          <span className="pudv-val">{bank.swiftCode || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Verified</span>
                          <span className={bank.isVerified ? 'pudv-pill-yes' : 'pudv-pill-no'}>
                            {bank.isVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: Dispatch Locations */}
          <div className="pudv-section-card">
            <div className="pudv-section-header" onClick={() => toggleSection('dispatchLocations')}>
              <div className="pudv-section-title">
                <span className="pudv-sec-num">4</span>
                <h3>Dispatch Locations</h3>
              </div>
              <button className="pudv-chevron-btn">
                {openSections.dispatchLocations ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {openSections.dispatchLocations && (
              <div className="pudv-section-body">
                {dispatchLocations.length === 0 ? (
                  <div className="pudv-empty-msg">No dispatch locations configured.</div>
                ) : (
                  dispatchLocations.map((loc, idx) => (
                    <div key={idx} className="pudv-location-card">
                      <div className="pudv-details-grid pudv-3col">
                        <div className="pudv-field">
                          <span className="pudv-label">Location Name</span>
                          <span className="pudv-val-bold">{loc.locationName || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Address</span>
                          <span className="pudv-val">
                            {[loc.addressLine1, loc.city, loc.state, loc.country].filter(Boolean).join(', ') || '-'}
                          </span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Default Location</span>
                          <span className="pudv-pill-yes">{loc.isDefault ? 'Yes' : 'No'}</span>
                        </div>

                        <div className="pudv-field">
                          <span className="pudv-label">Contact Person</span>
                          <span className="pudv-val">{loc.contactPerson || '-'}</span>
                        </div>
                        <div className="pudv-field">
                          <span className="pudv-label">Contact Phone</span>
                          <span className="pudv-val">{loc.contactPhone || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SECTION 5: Product Categories */}
          <div className="pudv-section-card">
            <div className="pudv-section-header" onClick={() => toggleSection('categories')}>
              <div className="pudv-section-title">
                <span className="pudv-sec-num">5</span>
                <h3>Product Categories</h3>
              </div>
              <button className="pudv-chevron-btn">
                {openSections.categories ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {openSections.categories && (
              <div className="pudv-section-body">
                {categories.length === 0 ? (
                  <div className="pudv-empty-msg">No category mappings defined.</div>
                ) : (
                  <div className="pudv-categories-flow">
                    {categories.map((cat, idx) => (
                      <div key={idx} className="pudv-flow-row">
                        <div className="pudv-flow-box">
                          <span className="pudv-flow-label">Segment</span>
                          <span className="pudv-flow-code">{cat.segment || '10000000'}</span>
                          <span className="pudv-flow-title">{cat.segmentTitle || 'General Segment'}</span>
                        </div>
                        <FaArrowRight className="pudv-flow-arrow" />
                        <div className="pudv-flow-box pudv-flow-family">
                          <span className="pudv-flow-label">Family</span>
                          <span className="pudv-flow-code">{cat.family || '10300000'}</span>
                          <span className="pudv-flow-title">{cat.familyTitle || 'Category Family'}</span>
                        </div>
                        <FaArrowRight className="pudv-flow-arrow" />
                        <div className="pudv-flow-box pudv-flow-class">
                          <span className="pudv-flow-label">Class</span>
                          <span className="pudv-flow-code">{cat.class || '10301600'}</span>
                          <span className="pudv-flow-title">{cat.classTitle || 'Category Class'}</span>
                        </div>
                        <FaArrowRight className="pudv-flow-arrow" />
                        <div className="pudv-flow-box pudv-flow-commodity">
                          <span className="pudv-flow-label">Commodity</span>
                          <span className="pudv-flow-code">{cat.commodity || '10301602'}</span>
                          <span className="pudv-flow-title">{cat.commodityTitle || 'Category Commodity'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY SIDEBAR */}
        <div className="pudv-side-col">
          <div className="pudv-summary-card">
            <div className="pudv-summary-header">
              <FaInfoCircle className="pudv-summary-icon" />
              <h3>{entitySingular} Summary</h3>
            </div>

            <div className="pudv-summary-list">
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaBuilding className="pudv-sum-ic" /> Organization Name
                </span>
                <span className="pudv-sum-val">{profile.organizationName}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaTag className="pudv-sum-ic" /> Status
                </span>
                <span className="pudv-sum-status-dot">
                  <span className="pudv-dot"></span> {profile.status || 'Pending Verification'}
                </span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaBuilding className="pudv-sum-ic" /> Industry
                </span>
                <span className="pudv-sum-val">{profile.industry || '-'}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaBuilding className="pudv-sum-ic" /> Business Type
                </span>
                <span className="pudv-sum-val">{profile.businessType || '-'}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaUser className="pudv-sum-ic" /> Employees
                </span>
                <span className="pudv-sum-val">{profile.employeeCount ?? '-'}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaBuilding className="pudv-sum-ic" /> Annual Turnover
                </span>
                <span className="pudv-sum-val">{formatCurrency(profile.annualTurnover, profile.currency)}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaBuilding className="pudv-sum-ic" /> Year Established
                </span>
                <span className="pudv-sum-val">{profile.yearEstablished || '-'}</span>
              </div>

              <div className="pudv-sum-divider" />

              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaFileAlt className="pudv-sum-ic" /> Registrations
                </span>
                <span className="pudv-sum-val">{registrations.length}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaUniversity className="pudv-sum-ic" /> Bank Accounts
                </span>
                <span className="pudv-sum-val">{bankAccounts.length}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaWarehouse className="pudv-sum-ic" /> Dispatch Locations
                </span>
                <span className="pudv-sum-val">{dispatchLocations.length}</span>
              </div>
              <div className="pudv-sum-row">
                <span className="pudv-sum-label">
                  <FaBoxOpen className="pudv-sum-ic" /> Product Categories
                </span>
                <span className="pudv-sum-val">{categories.length}</span>
              </div>

              <div className="pudv-sum-divider" />
            </div>
          </div>
        </div>
      </div>

      {/* REJECT COMMENT MODAL */}
      {showRejectModal && (
        <div className="pudv-modal-overlay">
          <div className="pudv-reject-dialog">
            <h3>Reject Organization Registration</h3>
            <p>Please specify a reason for rejecting {profile.organizationName}:</p>
            <textarea
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Type rejection comments here..."
              rows={4}
              className="pudv-textarea"
            />
            <div className="pudv-dialog-actions">
              <button className="pudv-btn-cancel" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="pudv-btn-confirm-reject" onClick={handleReject} disabled={statusLoading}>
                {statusLoading ? <FaSpinner className="pudv-spin" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformUserDetailView;
