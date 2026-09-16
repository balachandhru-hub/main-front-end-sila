import React from 'react';
import type { PendingMaterialApproval, MaterialApprovalKpi } from './materialApi';
import { classifyStatusText, MATERIAL_STATUS_FILTER_OPTIONS } from './materialApi';
import './MaterialApproval.css';

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconStack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconXCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

interface MaterialTableProps {
  records: PendingMaterialApproval[];
  loading: boolean;
  error: string | null;
  onRowClick: (record: PendingMaterialApproval) => void;
  kpi: MaterialApprovalKpi | null;
  loadingKpi: boolean;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
}

const StatusBadge: React.FC<{ value: string }> = ({ value }) => (
  <span className={`matap-overall-badge matap-status-${classifyStatusText(value)}`}>
    {value || '—'}
  </span>
);

const MaterialTable: React.FC<MaterialTableProps> = ({
  records,
  loading,
  error,
  onRowClick,
  kpi,
  loadingKpi,
  statusFilter,
  onStatusFilterChange,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
}) => {
  return (
    <div className="bad-table">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="bad-title">Material Approvals</h1>
          <p className="bad-subtitle" style={{ marginBottom: 0 }}>
            Material requests awaiting your approval across your organization.
          </p>
        </div>
      </div>

      <div className="matap-kpi-grid">
        <div className="bad-stat-card bad-stat-icon-blue">
          <div className="bad-stat-icon bad-stat-icon-blue"><IconStack /></div>
          <div className="bad-stat-label">TOTAL</div>
          <div className="bad-stat-value">{loadingKpi ? '—' : kpi?.totalCount ?? 0}</div>
        </div>
        <div className="bad-stat-card bad-stat-icon-orange">
          <div className="bad-stat-icon bad-stat-icon-orange"><IconClock /></div>
          <div className="bad-stat-label">PENDING</div>
          <div className="bad-stat-value">{loadingKpi ? '—' : kpi?.pendingCount ?? 0}</div>
        </div>
        <div className="bad-stat-card bad-stat-icon-green">
          <div className="bad-stat-icon bad-stat-icon-green"><IconCheckCircle /></div>
          <div className="bad-stat-label">APPROVED</div>
          <div className="bad-stat-value">{loadingKpi ? '—' : kpi?.approvedCount ?? 0}</div>
        </div>
        <div className="bad-stat-card matap-stat-icon-red">
          <div className="bad-stat-icon matap-stat-icon-red"><IconXCircle /></div>
          <div className="bad-stat-label">REJECTED</div>
          <div className="bad-stat-value">{loadingKpi ? '—' : kpi?.rejectedCount ?? 0}</div>
        </div>
      </div>

      <div className="matap-filter-bar">
        <div className="matap-search-wrap">
          <span className="matap-search-icon"><IconSearch /></span>
          <input
            type="text"
            className="matap-search-input"
            placeholder="Search by material code or material group..."
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearchSubmit(); }}
          />
          {searchInput && (
            <button
              type="button"
              className="matap-search-clear"
              onClick={() => onSearchInputChange('')}
              aria-label="Clear search"
            >
              <IconX />
            </button>
          )}
        </div>

        <select
          className="matap-status-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          {MATERIAL_STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div className="bad-spinner" />
            <span>Loading material approvals...</span>
          </div>
        </div>
      ) : error && records.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      ) : records.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No material approvals found.</div>
      ) : (
        <div className="bad-rfq-table-container">
          <table className="bad-rfq-items-table bad-allrfqs-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>S.No</th>
                <th>Order</th>
                <th>Material Code</th>
                <th>Description</th>
                <th>Product Type</th>
                <th>Material Group</th>
                <th>Approval Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={record.predefinedMaterialId} onClick={() => onRowClick(record)}>
                  <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                  <td>{record.order}</td>
                  <td><span className="bad-code-badge">{record.materialCode}</span></td>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>{record.description}</td>
                  <td>{record.productType}</td>
                  <td>{record.materialGroup}</td>
                  <td><StatusBadge value={record.approvalStatus} /></td>
                  <td><StatusBadge value={record.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MaterialTable;
