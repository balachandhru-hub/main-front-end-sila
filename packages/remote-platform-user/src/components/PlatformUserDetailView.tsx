import React, { useState, useCallback } from 'react';
import CompanyProfile from './CompanyProfile/CompanyProfile';
import type { CompanyProfileData } from '@vosox/shared-ui';
import {
  downloadBuyerAsset,
  downloadSupplierAsset,
  updateBuyerStatus,
  updateSupplierStatus,
  getSupplierProfileByOrgId,
  getBuyerProfileByOrgId,
} from '../api/platformApi';
import type {
  PlatformEntityType,
  PlatformRecordDto,
} from '../dto/platformDto';
import { FaSpinner } from 'react-icons/fa';
import './PlatformUserDetailView.css';

interface PlatformUserDetailViewProps {
  type: PlatformEntityType;
  record: PlatformRecordDto;
  onBack: () => void;
  onStatusUpdated?: () => void;
  onSettingsClick?: () => void;
}

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
   onSettingsClick,
}) => {
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [currentProfile, setCurrentProfile] = useState<CompanyProfileData | null>(null);

  const rawObj = record as any;
  const targetOrgId = record.organizationId || rawObj.organizationId || record.id || rawObj.id || '';

  const fetchProfileData = useCallback(async (): Promise<CompanyProfileData | null> => {
    let fetched: any = null;
    try {
      if (targetOrgId) {
        fetched =
          type === 'buyers'
            ? await getBuyerProfileByOrgId(targetOrgId)
            : await getSupplierProfileByOrgId(targetOrgId);
      }
    } catch (err) {
      console.warn('API profile fetch error, fallback to record:', err);
    }

    const baseRecord = fetched || record;
    const raw = baseRecord as any;

    const data: CompanyProfileData = {
      id: baseRecord.id || raw.id || targetOrgId,
      organizationId: targetOrgId,
      isActive: baseRecord.isActive ?? raw.isActive ?? true,
      businessProfile: {
        organizationName: baseRecord.businessProfile?.organizationName || raw.organizationName || raw.name || 'Unnamed Business',
        email: baseRecord.businessProfile?.email || raw.email,
        phone: baseRecord.businessProfile?.phone || raw.phone,
        country: baseRecord.businessProfile?.country || raw.country,
        addressLine1: baseRecord.businessProfile?.addressLine1 || raw.addressLine1,
        addressLine2: baseRecord.businessProfile?.addressLine2 || raw.addressLine2,
        city: baseRecord.businessProfile?.city || raw.city,
        state: baseRecord.businessProfile?.state || raw.state,
        pinCode: baseRecord.businessProfile?.pinCode || raw.pinCode,
        industry: baseRecord.businessProfile?.industry || raw.industry,
        businessType: baseRecord.businessProfile?.businessType || raw.businessType,
        employeeCount: baseRecord.businessProfile?.employeeCount || raw.employeeCount,
        annualTurnover: baseRecord.businessProfile?.annualTurnover || raw.annualTurnover,
        currency: baseRecord.businessProfile?.currency || raw.currency,
        yearEstablished: baseRecord.businessProfile?.yearEstablished || raw.yearEstablished,
        website: baseRecord.businessProfile?.website || raw.website,
        description: baseRecord.businessProfile?.description || raw.description,
        status: baseRecord.businessProfile?.status || raw.status || 'PENDING_VERIFICATION',
        isActive: baseRecord.businessProfile?.isActive ?? raw.isActive ?? true,
      },
      categories: baseRecord.categories || raw.categories || raw.buyerCategories || raw.supplierCategories || [],
      registrations: baseRecord.registrations || raw.registrations || [],
      bankAccounts: baseRecord.bankAccounts || raw.bankAccounts || [],
      dispatchLocations: baseRecord.dispatchLocations || raw.dispatchLocations || [],
      models: baseRecord.models || raw.models || [], 
    };

    setCurrentProfile(data);
    return data;
  }, [record, targetOrgId, type]);

  const handleVerify = async () => {
    if (statusLoading) return;
    setStatusError(null);
    setStatusLoading(true);
    const targetEntityId = currentProfile?.id || record.id || rawObj.id || targetOrgId;
    try {
      if (type === 'buyers') {
        await updateBuyerStatus(targetEntityId, 'APPROVED');
      } else {
        await updateSupplierStatus(targetEntityId, 'APPROVED');
      }
      await fetchProfileData();
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
    const targetEntityId = currentProfile?.id || record.id || rawObj.id || targetOrgId;
    try {
      if (type === 'buyers') {
        await updateBuyerStatus(targetEntityId, 'REJECTED', rejectComments);
      } else {
        await updateSupplierStatus(targetEntityId, 'REJECTED', rejectComments);
      }
      setShowRejectModal(false);
      setRejectComments('');
      await fetchProfileData();
      onStatusUpdated?.();
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setStatusError(err.message || 'Failed to reject registration.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleViewDoc = async (assetId: string) => {
    setStatusError(null);
    try {
      const data = type === 'buyers' ? await downloadBuyerAsset(assetId) : await downloadSupplierAsset(assetId);
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
      setStatusError(err.message || 'Failed to open document.');
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <CompanyProfile
        mode="admin-review"
        showHeader={true}
        entityLabel={type === 'buyers' ? 'Buyer' : 'Supplier'}
        fetchProfile={fetchProfileData}
        onBack={onBack}
        onVerify={handleVerify}
        onReject={() => setShowRejectModal(true)}
        isStatusLoading={statusLoading}
        statusError={statusError}
        onViewDocument={handleViewDoc}
        onSettingsClick={onSettingsClick}
      />

      {showRejectModal && (
        <div className="pudv-modal-overlay">
          <div className="pudv-reject-dialog">
            <h3>Reject Organization Registration</h3>
            <p>Please specify a reason for rejecting {currentProfile?.businessProfile?.organizationName || 'this organization'}:</p>
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
