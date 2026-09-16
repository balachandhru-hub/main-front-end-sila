import React from 'react';
import type { ContractRecord } from './contractApi';

interface ContractTableProps {
  records: ContractRecord[];
  loading: boolean;
  error: string | null;
}

const statusLabel: Record<ContractRecord['status'], string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Table only for now — no row click / approval-detail workflow yet. That
// lands once the Contract requirement and API are defined (see Material for
// the pattern this will follow).
const ContractTable: React.FC<ContractTableProps> = ({ records, loading, error }) => {
  return (
    <div className="bad-table">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="bad-title">Contract Approvals</h1>
          <p className="bad-subtitle" style={{ marginBottom: 0 }}>
            Contract requests raised across your organization.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div className="bad-spinner" />
            <span>Loading contract approvals...</span>
          </div>
        </div>
      ) : error && records.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      ) : records.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No contract approvals found.</div>
      ) : (
        <div className="bad-rfq-table-container">
          <table className="bad-rfq-items-table bad-allrfqs-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>S.No</th>
                <th>Reference No.</th>
                <th>Title</th>
                <th>Requested By</th>
                <th>Raised Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={record.id}>
                  <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                  <td><span className="bad-code-badge">{record.referenceNumber}</span></td>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>{record.title}</td>
                  <td>{record.requestedBy}</td>
                  <td>
                    {new Date(record.raisedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td>{statusLabel[record.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContractTable;
