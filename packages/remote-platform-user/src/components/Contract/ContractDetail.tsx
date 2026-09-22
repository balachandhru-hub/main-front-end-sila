import React, { useEffect, useState } from 'react';
import { EmptyState, Loader, toastService } from '@vosox/shared-ui';
import { downloadBuyerAsset } from '../../api/platformApi';
import type { ContractRecord } from './contractApi';
import { fetchContractById, formatContractAmount, formatContractDate } from './contractApi';
import './ContractDetail.css';

const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
  </svg>
);

interface ContractDetailProps {
  /** The row the buyer clicked; used to render the header immediately while the full detail loads. */
  contract: ContractRecord;
  onBack: () => void;
}

const InfoField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="ctrd-info-field">
    <dt className="ctrd-info-label">{label}</dt>
    <dd className="ctrd-info-value">{value || '—'}</dd>
  </div>
);

const ContractDetail: React.FC<ContractDetailProps> = ({ contract, onBack }) => {
  const [detail, setDetail] = useState<ContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    fetchContractById(contract.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load the contract.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [contract.id]);

  // Show the row's summary immediately; once the detail call resolves, use the fresher data.
  const shown = detail || contract;

  const handleDownload = async (attachment: { id: string; assetId: string; fileName: string }) => {
    if (downloadingId) return;
    setDownloadingId(attachment.id);
    try {
      const asset = await downloadBuyerAsset(attachment.assetId);
      if ('statusCode' in asset) {
        throw new Error((asset as any).message || 'Failed to download the attachment.');
      }
      const byteCharacters = atob(asset.fileBytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: asset.contentType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = asset.fileName || attachment.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toastService.error(err.message || 'Failed to download the attachment.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="ctrd-detail">
      <div className="ctrd-detail-header">
        <button
          type="button"
          className="sila-btn sila-btn--secondary sila-btn--icon ctrd-detail-close"
          onClick={onBack}
          aria-label="Back to list"
          title="Back to list"
        >
          <IconBack />
        </button>
        <div className="ctrd-detail-heading">
          <span className="sila-ref ctrd-detail-ref-badge">{shown.contractNumber}</span>
          <h2 className="ctrd-detail-title">{shown.contractName}</h2>
          <div className="ctrd-detail-meta">
            <span>RFQ {shown.rfqNumber}</span>
            {shown.rfqTitle && (
              <>
                <span className="ctrd-detail-dot" aria-hidden="true">•</span>
                <span>{shown.rfqTitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="ctrd-detail-body">
        {loading && !detail ? (
          <Loader size={28} message="Loading contract details..." />
        ) : error && !detail ? (
          <EmptyState variant="error" title="Couldn't load this contract" description={error} />
        ) : (
          <div className="ctrd-detail-stack">
            <section>
              <h3 className="ctrd-section-title">Contract Information</h3>
              <dl className="ctrd-info-grid">
                <InfoField label="Contract Number" value={shown.contractNumber} />
                <InfoField label="Contract Name" value={shown.contractName} />
                <InfoField label="RFQ Number" value={shown.rfqNumber} />
                <InfoField label="RFQ Title" value={shown.rfqTitle} />
                <InfoField label="Start Date" value={formatContractDate(shown.startDate)} />
                <InfoField label="End Date" value={formatContractDate(shown.endDate)} />
                <InfoField label="Amount" value={formatContractAmount(shown.amount)} />
                <InfoField label="Date Created" value={formatContractDate(shown.dateCreated, true)} />
              </dl>
            </section>

            <section>
              <h3 className="ctrd-section-title">
                Attachments
                {shown.attachments.length > 0 && (
                  <span className="ctrd-section-count">{shown.attachments.length}</span>
                )}
              </h3>
              {shown.attachments.length === 0 ? (
                <EmptyState title="No attachments for this contract." />
              ) : (
                <ul className="ctrd-attachment-list">
                  {shown.attachments.map((attachment) => (
                    <li key={attachment.id} className="ctrd-attachment-row">
                      <span className="ctrd-attachment-icon" aria-hidden="true"><IconFile /></span>
                      <span className="ctrd-attachment-name">{attachment.fileName}</span>
                      <button
                        type="button"
                        className="sila-btn sila-btn--secondary ctrd-attachment-download"
                        onClick={() => handleDownload(attachment)}
                        disabled={downloadingId === attachment.id}
                      >
                        <IconDownload />
                        {downloadingId === attachment.id ? 'Downloading…' : 'Download'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="ctrd-section-title">
                Approval Flows
                {shown.approvalFlows.length > 0 && (
                  <span className="ctrd-section-count">{shown.approvalFlows.length}</span>
                )}
              </h3>
              {shown.approvalFlows.length === 0 ? (
                <EmptyState title="No approval flows linked to this contract." />
              ) : (
                <div className="ctrd-flow-grid">
                  {shown.approvalFlows.map((flow) => (
                    <div key={flow.id} className="ctrd-flow-card">
                      <div className="ctrd-flow-card-head">
                        <span className="ctrd-flow-code">{flow.approvalCode}</span>
                        <span className="ctrd-flow-type">{flow.type}</span>
                      </div>
                      <div className="ctrd-flow-name">{flow.approvalName}</div>
                      <div className="ctrd-flow-amount">{formatContractAmount(flow.totalAmount, flow.currency)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="ctrd-detail-footer">
        <button type="button" className="sila-btn sila-btn--secondary" onClick={onBack}>
          Back to list
        </button>
      </div>
    </div>
  );
};

export default ContractDetail;
