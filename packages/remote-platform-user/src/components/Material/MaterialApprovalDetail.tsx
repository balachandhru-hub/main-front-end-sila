import React, { useEffect, useState } from 'react';
import { toastService } from '@vosox/shared-ui';
import type {
  PendingMaterialApproval,
  MaterialApprovalDetail as MaterialApprovalDetailDto,
  MaterialApprovalFlowUser,
} from './materialApi';
import {
  fetchMaterialApprovalDetail,
  fetchMaterialApprovalFlowUsers,
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

const infoLabelStyle: React.CSSProperties = { fontSize: '11px', color: '#64748b', fontWeight: 500 };
const infoValueStyle: React.CSSProperties = { fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' };

const InfoField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <div style={infoLabelStyle}>{label}</div>
    <div style={infoValueStyle}>{value || '—'}</div>
  </div>
);

const MaterialApprovalDetail: React.FC<MaterialApprovalDetailProps> = ({
  material,
  currentUserId,
  onBack,
  onApprovalSubmitted,
}) => {
  const [detail, setDetail] = useState<MaterialApprovalDetailDto | null>(null);
  const [flowUsers, setFlowUsers] = useState<MaterialApprovalFlowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    setFlowUsers([]);

    Promise.allSettled([
      fetchMaterialApprovalDetail(material.predefinedMaterialId),
      fetchMaterialApprovalFlowUsers(material.approvalId),
    ]).then(([detailResult, flowResult]) => {
      if (cancelled) return;

      if (detailResult.status === 'fulfilled') {
        setDetail(detailResult.value);
      } else {
        setError(detailResult.reason?.message || 'Failed to load material approval details.');
      }

      if (flowResult.status === 'fulfilled') {
        setFlowUsers(flowResult.value);
      } else {
        toastService.error(flowResult.reason?.message || 'Failed to load the approval flow.');
      }

      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [material.predefinedMaterialId, material.approvalId]);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
            <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div className="bad-spinner" />
              <span>Loading material approval details...</span>
            </div>
          </div>
        ) : error && !detail ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : detail ? (
          <>
            <div className="bad-modal-section-title">Material Information</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                background: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.5rem',
              }}
            >
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

            {flowUsers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No approvers assigned to this material yet.
              </div>
            ) : (
              <div className="matap-strip">
                {flowUsers.map((approver, idx) => (
                  <React.Fragment key={approver.id}>
                    <MaterialApprovalCard
                      approverName={approver.name}
                      approverEmail={approver.email}
                      position={approver.order}
                      isCurrentUser={!!currentUserId && approver.userId === currentUserId}
                      canAct={!!currentUserId && approver.userId === currentUserId && !isDecided}
                      submitting={submitting}
                      onDecision={handleDecision}
                    />
                    {idx < flowUsers.length - 1 && (
                      <span className="matap-connector" aria-hidden="true" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </>
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
