import React, { useEffect, useState } from 'react';
import {
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
  FaPen,
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
  FaUserCircle
} from 'react-icons/fa';
import { useNetworkAdminAuthStore } from '../../store/useAuthStore';
import { getNetworkAdminProfile } from '../../api/networkAdminApi';
import type { NetworkAdminRole } from '../../api/networkAdminApi';
import type { NetworkAdminProfileResponse } from '../../dto/networkAdminDto';
import type {
  CategoryDto,
  RegistrationDto,
  BankAccountDto,
  DispatchLocationDto,
} from '../../dto/platformDto';
import './CompanyProfile.css';

interface CompanyProfileProps {
  mode?: 'admin-review' | 'network-admin';
  showHeader?: boolean;
}

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
  VERIFIED: 'cp-status-verified',
  REJECTED: 'cp-status-rejected',
};

const statusLabelMap: Record<string, string> = {
  PENDING_VERIFICATION: 'Pending Verification',
  VERIFIED: 'Verified',
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

const CompanyProfile: React.FC<CompanyProfileProps> = ({
  mode = 'admin-review',
  showHeader = true,
}) => {
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);

  const [profile, setProfile] = useState<NetworkAdminProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState({
    profile: true,
    registrations: true,
    bank: true,
    dispatch: true,
    categories: true,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isBuyer =
    currentUser?.userRole === 'BUYER_NETWORK_ADMIN' ||
    currentUser?.userRole === 'BUYER_ADMINISTRATOR' ||
    currentUser?.userRole === 'BUYER_USER';

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userRole = currentUser?.userRole;
        const role: NetworkAdminRole = userRole
          ? userRole.includes('BUYER') ? 'BUYER_NETWORK_ADMIN' : 'SUPPLIER_NETWORK_ADMIN'
          : 'SUPPLIER_NETWORK_ADMIN';
        const data = await getNetworkAdminProfile(role);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load company profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const entityLabel = isBuyer ? 'Buyer' : 'Supplier';

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
  const bankAccounts: BankAccountDto[] = profile.bankAccounts || [];
  const dispatchLocations: DispatchLocationDto[] = profile.dispatchLocations || [];
  const categories: CategoryDto[] =
    (profile as any).categories ||
    (profile as any).buyerCategories ||
    (profile as any).supplierCategories ||
    [];

  const statusKey = bp.status || '';
  const statusClass = statusClassMap[statusKey] || 'cp-status-pending';
  const statusLabel = statusLabelMap[statusKey] || statusKey || '-';

  return (
    <div className="cp-page">
      {showHeader && (
        <div className="cp-page-header">
          <h1 className="cp-page-title">Company Details</h1>
          <p className="cp-page-subtitle">View and manage {entityLabel.toLowerCase()} information</p>
        </div>
      )}

      <div className="cp-container">
        <div className="cp-header-card">
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

            {mode === 'admin-review' && (
              <div className="cp-header-actions">
                <button className="cp-btn cp-btn-verify" title="Verify this company">
                  <FaCheck />
                  Verify
                </button>
                <button className="cp-btn cp-btn-edit" title="Edit company details">
                  <FaPen />
                  Edit
                </button>
                <button className="cp-btn cp-btn-reject" title="Reject this company">
                  <FaTimes />
                  Reject
                </button>
                <button className="cp-btn cp-btn-more" title="More actions">
                  More
                  <FaChevronDown className="cp-btn-chevron" />
                </button>
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
                                {reg.asset?.fileName ? (
                                 <div className="cp-doc-link-wrapper">
                                  <span className="cp-doc-link" title={reg.asset.fileName}>
                                    <FaFilePdf className="cp-pdf-icon" />
                                    {reg.asset.fileName}
                                  </span>
                                  <span className="cp-doc-actions">
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
              </div>
              {openSections.bank && (
                <div className="cp-section-box">
                  {bankAccounts.length === 0 ? (
                    <p className="cp-empty-inline">No bank accounts added</p>
                  ) : (
                    bankAccounts.map((acc, idx) => (
                      <React.Fragment key={idx}>
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
              <SectionHeader
                icon={<FaTruck />}
                title="4. Dispatch Locations"
                isOpen={openSections.dispatch}
                onToggle={() => toggleSection('dispatch')}
              />
              {openSections.dispatch && (
                <div className="cp-section-box">
                  {dispatchLocations.length === 0 ? (
                    <p className="cp-empty-inline">No dispatch locations added</p>
                  ) : (
                    dispatchLocations.map((loc, idx) => (
                      <React.Fragment key={idx}>
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
                  <span className="cp-status-dot-inline">
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
    </div>
  );
};

export default CompanyProfile;