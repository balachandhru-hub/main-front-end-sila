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

const ContractTable: React.FC<ContractTableProps> = ({ records, loading, error }) => {
  return (
    <div className="bad-table">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 className="bad-title">Contract Approvals</h1>
            <div className="bad-subtitle">
              Contract requests raised across your organization.
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '15rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem' }}>
              <div className="bad-spinner" />
              <span>Loading contract approvals...</span>
            </div>
          </div>
        ) : error && records.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No contract approvals found.</div>
        ) : (
          <div className="bad-rfq-table-container">
            <table className="bad-rfq-items-table bad-allrfqs-table">
              <thead>
                <tr>
                  <th style={{ width: '3rem' }}>S.No</th>
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
    </div>
  );
};

export default ContractTable;
