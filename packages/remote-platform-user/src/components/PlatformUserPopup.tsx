import React, { useEffect, useState } from 'react';
import { downloadBuyerAsset, downloadSupplierAsset, updateBuyerStatus, updateSupplierStatus } from '../api/platformApi';
import type {
  BusinessProfileDto,
  RegistrationDto,
  BankAccountDto,
  DispatchLocationDto,
  PlatformEntityType,
  PlatformRecordDto,
} from '../dto/platformDto';
import {
  FaTimes,
  FaBuilding,
  FaMapMarkerAlt,
  FaFileAlt,
  FaUniversity,
  FaWarehouse,
  FaIdBadge,
  FaCheckCircle,
  FaEye,
  FaDownload,
  FaSpinner,
  FaFileDownload,
} from 'react-icons/fa';
import './PlatformUserPopup.css';

interface PlatformUserPopupProps {
  type: PlatformEntityType;
  record: PlatformRecordDto;
  onClose: () => void;
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

const initialsOf = (name?: string) => {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
};

const base64ToBlob = (base64: string, contentType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType || 'application/octet-stream' });
};

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="pup-detail-row">
    <span className="pup-detail-row-label">{label}</span>
    <span className="pup-detail-row-value">{value || value === 0 ? value : 'Not specified'}</span>
  </div>
);

interface AttachmentEntry {
  key: string;
  assetId: string;
  fileName: string;
  registrationName?: string;
  registrationType?: string;
}

export const PlatformUserPopup: React.FC<PlatformUserPopupProps> = ({ type, record, onClose, onStatusUpdated }) => {
  const profile: BusinessProfileDto = record.businessProfile || {};
  const registrations: RegistrationDto[] = record.registrations || [];
  const bankAccounts: BankAccountDto[] = record.bankAccounts || [];
  const dispatchLocations: DispatchLocationDto[] = record.dispatchLocations || [];

  const [actionState, setActionState] = useState<Record<string, 'view' | 'download' | null>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectComments, setRejectComments] = useState<string>('');

  const handleApprove = async () => {
    if (statusLoading) return;
    setStatusError(null);
    setStatusLoading(true);
    try {
      if (type === 'buyers') {
        await updateBuyerStatus(record.id, 'APPROVED');
      } else {
        await updateSupplierStatus(record.id, 'APPROVED');
      }
      onStatusUpdated?.();
    } catch (err: any) {
      console.error('Failed to approve:', err);
      setStatusError(err.message || 'Failed to approve registration.');
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
        await updateBuyerStatus(record.id, 'REJECTED', rejectComments);
      } else {
        await updateSupplierStatus(record.id, 'REJECTED', rejectComments);
      }
      setShowRejectModal(false);
      onStatusUpdated?.();
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setStatusError(err.message || 'Failed to reject registration.');
    } finally {
      setStatusLoading(false);
    }
  };

  const name = profile.organizationName || 'Unnamed Business';
  const accentClass = type === 'buyers' ? 'pup-accent-buyer' : 'pup-accent-supplier';
  const currentStatus = (profile.status || '').toUpperCase();
  const isFinalized = currentStatus === 'APPROVED' || currentStatus === 'REJECTED';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const attachments: AttachmentEntry[] = registrations
    .filter((reg) => reg.asset?.id)
    .map((reg, idx) => ({
      key: `${reg.asset!.id}-${idx}`,
      assetId: reg.asset!.id as string,
      fileName: reg.asset?.fileName || reg.asset?.assetName || 'Document',
      registrationName: reg.registrationName,
      registrationType: reg.registrationType,
    }));

  const fetchAsset = async (assetId: string) => {
    return type === 'buyers' ? downloadBuyerAsset(assetId) : downloadSupplierAsset(assetId);
  };

  const handleView = async (entry: AttachmentEntry) => {
    setActionError(null);
    setActionState((prev) => ({ ...prev, [entry.key]: 'view' }));
    try {
      const data = await fetchAsset(entry.assetId);
      const blob = base64ToBlob(data.fileBytes, data.contentType);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      console.error('Failed to view document:', err);
      setActionError(err.message || 'Failed to open document.');
    } finally {
      setActionState((prev) => ({ ...prev, [entry.key]: null }));
    }
  };

  const handleDownload = async (entry: AttachmentEntry) => {
    setActionError(null);
    setActionState((prev) => ({ ...prev, [entry.key]: 'download' }));
    try {
      const data = await fetchAsset(entry.assetId);
      const blob = base64ToBlob(data.fileBytes, data.contentType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.fileName || entry.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download document:', err);
      setActionError(err.message || 'Failed to download document.');
    } finally {
      setActionState((prev) => ({ ...prev, [entry.key]: null }));
    }
  };

  return (
    <div className="pup-overlay" onClick={onClose}>
      <div className="pup-panel" onClick={(e) => e.stopPropagation()}>
        <button className="pup-close" onClick={onClose} aria-label="Close details">
          <FaTimes />
        </button>

        {/* Header */}
        <div className={`pup-header ${accentClass}`}>
          <div className="pup-avatar">{initialsOf(name)}</div>
          <div className="pup-header-info">
            <h2 className="pup-title">{name}</h2>
            <div className="pup-header-badges">
              <span className="pup-badge pup-badge-role">
                {type === 'buyers' ? 'Registered Buyer' : 'Registered Supplier'}
              </span>
              {profile.businessType && <span className="pup-badge">{profile.businessType}</span>}
              {profile.industry && <span className="pup-badge">{profile.industry}</span>}
              {profile.emailVerified !== undefined && (
                <span className={`pup-badge ${profile.emailVerified ? 'pup-badge-verified' : 'pup-badge-unverified'}`}>
                  <FaCheckCircle style={{ marginRight: '4px' }} />
                  {profile.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                </span>
              )}
              {profile.status && (
                <span className={`pup-badge pup-badge-status-${profile.status.toLowerCase()}`}>
                  {profile.status === 'PENDING_VERIFICATION' ? 'PENDING' : profile.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pup-body">
          {currentStatus === 'REJECTED' && profile.comments && (
            <div className="pup-rejection-comments-box">
              <strong>Rejection Reason:</strong> {profile.comments}
            </div>
          )}
          {profile.description && <p className="pup-description">{profile.description}</p>}

          {/* Company Overview */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaBuilding className="pup-section-icon" />
              Company Overview
            </h3>
            <div className="pup-grid">
              <DetailRow label="Industry" value={profile.industry} />
              <DetailRow label="Business Type" value={profile.businessType} />
              <DetailRow
                label="Employees"
                value={profile.employeeCount ? profile.employeeCount.toLocaleString('en-IN') : undefined}
              />
              <DetailRow label="Annual Turnover" value={formatCurrency(profile.annualTurnover, profile.currency)} />
              <DetailRow label="Year Established" value={profile.yearEstablished || undefined} />
              <DetailRow
                label="Website"
                value={
                  profile.website ? (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pup-link"
                    >
                      {profile.website}
                    </a>
                  ) : undefined
                }
              />
            </div>
          </section>

          {/* Contact & Address */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaMapMarkerAlt className="pup-section-icon" />
              Contact &amp; Registered Address
            </h3>
            <div className="pup-grid">
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Phone" value={profile.phone} />
              <DetailRow
                label="Address"
                value={[profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ') || undefined}
              />
              <DetailRow label="City / State" value={[profile.city, profile.state].filter(Boolean).join(', ') || undefined} />
              <DetailRow label="Country" value={profile.country} />
              <DetailRow label="PIN / ZIP Code" value={profile.pinCode} />
            </div>
          </section>

          {/* Registrations */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaFileAlt className="pup-section-icon" />
              Registrations &amp; Compliance
              <span className="pup-count-badge">{registrations.length}</span>
            </h3>
            {registrations.length === 0 ? (
              <p className="pup-empty-note">No registration documents on file.</p>
            ) : (
              <div className="pup-subcards">
                {registrations.map((reg, idx) => (
                  <div className="pup-subcard" key={idx}>
                    <div className="pup-subcard-top">
                      <span className="pup-subcard-title">{reg.registrationType || 'Registration'}</span>
                      <span className="pup-subcard-tag">Expires: {formatDate(reg.expiryDate)}</span>
                    </div>
                    <div className="pup-grid">
                      <DetailRow label="Registration Name" value={reg.registrationName} />
                      <DetailRow label="Registration Number" value={reg.registrationNumber} />
                      <DetailRow label="Document File" value={reg.asset?.fileName} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bank Accounts */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaUniversity className="pup-section-icon" />
              Bank Accounts
              <span className="pup-count-badge">{bankAccounts.length}</span>
            </h3>
            {bankAccounts.length === 0 ? (
              <p className="pup-empty-note">No bank accounts on file.</p>
            ) : (
              <div className="pup-subcards">
                {bankAccounts.map((acct, idx) => (
                  <div className="pup-subcard" key={idx}>
                    <div className="pup-subcard-top">
                      <span className="pup-subcard-title">{acct.bankName || 'Bank Account'}</span>
                      <div className="pup-subcard-tags">
                        {acct.isPrimary && <span className="pup-badge pup-badge-primary">Primary</span>}
                        {acct.isVerified !== undefined && (
                          <span className={`pup-badge ${acct.isVerified ? 'pup-badge-verified' : 'pup-badge-unverified'}`}>
                            <FaCheckCircle style={{ marginRight: '4px' }} />
                            {acct.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pup-grid">
                      <DetailRow label="Account Holder" value={acct.accountHolderName} />
                      <DetailRow label="Branch" value={acct.branchName} />
                      <DetailRow label="Account Number" value={acct.accountNumber} />
                      <DetailRow label="IFSC Code" value={acct.ifscCode} />
                      <DetailRow label="SWIFT Code" value={acct.swiftCode} />
                      {acct.iban && <DetailRow label="IBAN" value={acct.iban} />}
                      <DetailRow label="Currency" value={acct.currency} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Dispatch / Delivery Locations */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaWarehouse className="pup-section-icon" />
              {type === 'buyers' ? 'Delivery Locations' : 'Dispatch Locations'}
              <span className="pup-count-badge">{dispatchLocations.length}</span>
            </h3>
            {dispatchLocations.length === 0 ? (
              <p className="pup-empty-note">No locations on file.</p>
            ) : (
              <div className="pup-subcards">
                {dispatchLocations.map((loc, idx) => (
                  <div className="pup-subcard" key={idx}>
                    <div className="pup-subcard-top">
                      <span className="pup-subcard-title">{loc.locationName || 'Location'}</span>
                      {loc.isDefault && <span className="pup-badge pup-badge-primary">Default</span>}
                    </div>
                    <div className="pup-grid">
                      <DetailRow
                        label="Address"
                        value={[loc.addressLine1, loc.addressLine2].filter(Boolean).join(', ') || undefined}
                      />
                      <DetailRow label="City / State" value={[loc.city, loc.state].filter(Boolean).join(', ') || undefined} />
                      <DetailRow label="Country" value={loc.country} />
                      <DetailRow label="PIN / ZIP Code" value={loc.pinCode} />
                      <DetailRow label="Contact Person" value={loc.contactPerson} />
                      <DetailRow label="Contact Phone" value={loc.contactPhone} />
                      {loc.contactEmail && <DetailRow label="Contact Email" value={loc.contactEmail} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Identifiers */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaIdBadge className="pup-section-icon" />
              Platform Identifiers
            </h3>
            <div className="pup-grid">
              <DetailRow label="Record ID" value={<span className="pup-mono">{record.id}</span>} />
              <DetailRow label="Organization ID" value={<span className="pup-mono">{record.organizationId}</span>} />
            </div>
          </section>

          {/* Attachments - View & Download */}
          <section className="pup-section">
            <h3 className="pup-section-title">
              <FaFileDownload className="pup-section-icon" />
              Attachments
              <span className="pup-count-badge">{attachments.length}</span>
            </h3>
            {actionError && <div className="pup-action-error">{actionError}</div>}
            {attachments.length === 0 ? (
              <p className="pup-empty-note">No attachments available for this record.</p>
            ) : (
              <div className="pup-attachments-list">
                {attachments.map((entry) => (
                  <div className="pup-attachment-row" key={entry.key}>
                    <div className="pup-attachment-info">
                      <FaFileAlt className="pup-attachment-icon" />
                      <div>
                        <div className="pup-attachment-name">{entry.fileName}</div>
                        {entry.registrationName && (
                          <div className="pup-attachment-sub">{entry.registrationName}</div>
                        )}
                      </div>
                    </div>
                    <div className="pup-attachment-actions">
                      <button
                        className="pup-attachment-btn"
                        onClick={() => handleView(entry)}
                        disabled={actionState[entry.key] !== undefined && actionState[entry.key] !== null}
                      >
                        {actionState[entry.key] === 'view' ? <FaSpinner className="pup-spin" /> : <FaEye />}
                        View
                      </button>
                      <button
                        className="pup-attachment-btn pup-attachment-btn-primary"
                        onClick={() => handleDownload(entry)}
                        disabled={actionState[entry.key] !== undefined && actionState[entry.key] !== null}
                      >
                        {actionState[entry.key] === 'download' ? <FaSpinner className="pup-spin" /> : <FaDownload />}
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Admin Approval Actions */}
          <section className="pup-section pup-section-last pup-admin-actions-section">
            <h3 className="pup-section-title">
              <FaCheckCircle className="pup-section-icon" />
              Platform Administrator Actions
            </h3>
            {statusError && <div className="pup-action-error">{statusError}</div>}
            {isFinalized ? (
              <div className="pup-admin-status-display">
                Registration has been finalized. Status: 
                <span className={`pup-badge pup-badge-status-${currentStatus.toLowerCase()}`} style={{ marginLeft: '8px' }}>
                  {currentStatus}
                </span>
              </div>
            ) : (
              <div className="pup-admin-actions">
                <button
                  className="pup-btn-approve"
                  onClick={handleApprove}
                  disabled={statusLoading}
                >
                  {statusLoading ? <FaSpinner className="pup-spin" /> : <FaCheckCircle style={{ marginRight: '6px' }} />}
                  Approve Registration
                </button>
                <button
                  className="pup-btn-reject"
                  onClick={() => {
                    setStatusError(null);
                    setShowRejectModal(true);
                  }}
                  disabled={statusLoading}
                >
                  <FaTimes style={{ marginRight: '6px' }} />
                  Reject Registration
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Rejection Comments Modal */}
      {showRejectModal && (
        <div className="pup-reject-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="pup-reject-panel" onClick={(e) => e.stopPropagation()}>
            <button className="pup-close" onClick={() => setShowRejectModal(false)} aria-label="Close comment panel">
              <FaTimes />
            </button>
            <h4 className="pup-reject-title">Rejection Comments</h4>
            <p className="pup-reject-subtitle">Please enter comments detailing the reason for rejecting this registration.</p>
            <textarea
              className="pup-reject-textarea"
              placeholder="Enter rejection comments here..."
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              rows={4}
            />
            <div className="pup-reject-actions">
              <button
                className="pup-reject-btn pup-reject-btn-cancel"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComments('');
                }}
                disabled={statusLoading}
              >
                Cancel
              </button>
              <button
                className="pup-reject-btn pup-reject-btn-submit"
                onClick={handleReject}
                disabled={statusLoading || !rejectComments.trim()}
              >
                {statusLoading ? <FaSpinner className="pup-spin" /> : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformUserPopup;