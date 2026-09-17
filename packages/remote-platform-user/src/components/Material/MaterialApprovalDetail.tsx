import React, { useEffect, useState } from 'react';
import { toastService } from '@vosox/shared-ui';
import type {
  PendingMaterialApproval,
  MaterialApprovalDetail as MaterialApprovalDetailDto,
} from './materialApi';
import {
  fetchMaterialApprovalDetail,
  submitMaterialApprovalAction,
  classifyStatusText,
  MATERIAL_APPROVAL_STATUS,
} from './materialApi';
import MaterialApprovalCard from './MaterialApprovalCard';
import './MaterialApproval.css';

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface MaterialApprovalDetailProps {
  material: PendingMaterialApproval;
  currentUserId: string | null;
  onBack: () => void;
  onApprovalSubmitted: () => void;
}

const InfoField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="matap-info-field">
    <div className="matap-info-label">{label}</div>
    <div className="matap-info-value">{value || '—'}</div>
  </div>
);

const MaterialApprovalDetail: React.FC<MaterialApprovalDetailProps> = ({
  material,
  currentUserId,
  onBack,
  onApprovalSubmitted,
}) => {
  const [detail, setDetail] = useState<MaterialApprovalDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    fetchMaterialApprovalDetail(material.predefinedMaterialId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load material approval details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [material.predefinedMaterialId]);

  const handleDecision = async (action: 'APPROVE' | 'REJECT', comment: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const status = action === 'APPROVE' ? MATERIAL_APPROVAL_STATUS.APPROVE : MATERIAL_APPROVAL_STATUS.REJECT;
      await submitMaterialApprovalAction(material.predefinedMaterialId, { status, comment });
      toastService.success(action === 'APPROVE' ? 'Material approved successfully.' : 'Material rejected.');
      onApprovalSubmitted();
    } catch (err: any) {
      toastService.error(err?.message || 'Failed to submit your decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const overallTone = detail ? classifyStatusText(detail.status) : 'neutral';
  const isDecided = overallTone === 'approved' || overallTone === 'rejected';

  const approvers = [...(detail?.approvalUsers || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="bad-modal bad-rfq-fullpage matap-detail">
      <div className="matap-detail-header">
        <button className="matap-detail-close" onClick={onBack} aria-label="Close">
          <IconClose />
        </button>
        <span className="matap-detail-ref-badge">{material.materialCode}</span>
        <h2 className="matap-detail-title">{material.description || 'Material Approval'}</h2>
        <div className="matap-detail-meta">
          <span>{material.productType}</span>
          <span className="matap-detail-dot">•</span>
          <span>{material.materialGroup}</span>
          {detail && (
            <span className={`matap-overall-badge matap-status-${overallTone}`}>
              {detail.status || '—'}
            </span>
          )}
        </div>
      </div>

      <div className="bad-modal-body">
        {loading ? (
          <div className="matap-state-box">
            <div className="matap-state-inner">
              <div className="bad-spinner" />
              <span>Loading material approval details...</span>
            </div>
          </div>
        ) : error && !detail ? (
          <div className="matap-state-message matap-state-message-error">{error}</div>
        ) : detail ? (
          <div className="matap-detail-stack">
            <div className="bad-modal-section-title">Material Information</div>
            <div className="matap-info-grid">
              <InfoField label="Base UoM" value={detail.baseUnitOfMeasure} />
              <InfoField label="Order UoM" value={detail.orderUnitOfMeasure} />
              <InfoField label="Alternate UoM" value={detail.alternateUnitOfMeasure} />
              <InfoField label="Valuation Class" value={detail.valuationClass} />
              <InfoField label="UoM Mapping" value={detail.unitOfMeasureMapping} />
              <InfoField label="Sub Unit" value={detail.subUnit} />
              <InfoField label="Micro Unit" value={detail.microUnit} />
              <InfoField label="Status" value={detail.status} />
            </div>

            <div className="bad-modal-section-title">Approval Chain</div>

            {approvers.length === 0 ? (
              <div className="matap-state-message">No approvers assigned to this material yet.</div>
            ) : (
              <div className="matap-strip">
                {approvers.map((approver, idx) => {
                  const cardTone = classifyStatusText(approver.status);
                  return (
                    <React.Fragment key={approver.userId}>
                      <MaterialApprovalCard
                        approverName={approver.userName}
                        approverEmail={approver.email}
                        position={approver.order}
                        isCurrentUser={!!currentUserId && approver.userId === currentUserId}
                        canAct={!!currentUserId && approver.userId === currentUserId && !isDecided && cardTone === 'pending'}
                        submitting={submitting}
                        onDecision={handleDecision}
                        statusTone={cardTone}
                      />
                      {idx < approvers.length - 1 && (
                        <span className="matap-connector" aria-hidden="true" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="bad-modal-footer">
        <button className="bad-btn bad-btn-outline" onClick={onBack}>
          Back to list
        </button>
      </div>
    </div>
  );
};

export default MaterialApprovalDetail;
