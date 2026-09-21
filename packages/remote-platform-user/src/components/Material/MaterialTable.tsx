import React from 'react';
import type { PendingMaterialApproval, MaterialApprovalKpi } from './materialApi';
import { classifyStatusText, formatMaterialStatus, MATERIAL_STATUS_FILTER_OPTIONS } from './materialApi';
import { EmptyState, KpiCard, StatusBadge, TableSkeleton } from '@vosox/shared-ui';
import './MaterialApproval.css';

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconStack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconXCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
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

const TONE_BY_STATUS = {
  approved: 'success',
  rejected: 'danger',
  pending: 'warning',
  neutral: 'neutral',
} as const;

/** Status code from the API shown as a readable, colour-coded badge (APPROVE → Approved). */
export const MaterialStatusBadge: React.FC<{ value: string }> = ({ value }) => (
  <StatusBadge
    status={value || '—'}
    label={formatMaterialStatus(value)}
    tone={TONE_BY_STATUS[classifyStatusText(value)]}
    size="sm"
    dot
  />
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
    <div className="matap-panel">
      <div className="matap-header-row">
        <h1 className="matap-title">Material Approvals</h1>
        <p className="matap-subtitle">Material requests awaiting your approval across your organization.</p>
      </div>

      <div className="matap-kpi-grid">
        <KpiCard label="Total" value={kpi?.totalCount ?? 0} loading={loadingKpi} icon={<IconStack />} tone="primary" />
        <KpiCard
          label="Pending"
          value={kpi?.pendingCount ?? 0}
          loading={loadingKpi}
          icon={<IconClock />}
          tone={(kpi?.pendingCount ?? 0) > 0 ? 'warning' : 'neutral'}
        />
        <KpiCard label="Approved" value={kpi?.approvedCount ?? 0} loading={loadingKpi} icon={<IconCheckCircle />} tone="success" />
        <KpiCard label="Rejected" value={kpi?.rejectedCount ?? 0} loading={loadingKpi} icon={<IconXCircle />} tone="danger" />
      </div>

      <div className="matap-table-card">
        <div className="matap-filter-bar" role="search">
          <div className="matap-search-wrap">
            <span className="matap-search-icon" aria-hidden="true"><IconSearch /></span>
            <input
              type="text"
              className="sila-input matap-search-input"
              placeholder="Search by material code or material group..."
              aria-label="Search material approvals"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearchSubmit(); }}
            />
            {searchInput && (
              <button type="button" className="matap-search-clear" onClick={() => onSearchInputChange('')} aria-label="Clear search">
                <IconX />
              </button>
            )}
          </div>

          <select
            className="sila-select matap-status-select"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {MATERIAL_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {!loading && records.length > 0 && (
            <span className="matap-result-count">{records.length} request{records.length === 1 ? '' : 's'}</span>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={7} label="Loading material approvals…" />
        ) : error && records.length === 0 ? (
          <EmptyState variant="error" title="Couldn't load material approvals" description={error} />
        ) : records.length === 0 ? (
          <EmptyState title="No material approvals found." description="Try a different status or search term." />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table matap-table">
              <thead>
                <tr>
                  <th className="matap-col-sno sila-num">S.No</th>
                  <th className="sila-num">Order</th>
                  <th>Material Code</th>
                  <th>Description</th>
                  <th>Product Type</th>
                  <th>Material Group</th>
                  <th>Approval Status</th>
                  <th>Status</th>
                  <th><span className="sila-visually-hidden">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr
                    key={record.predefinedMaterialId}
                    className={`sila-row-clickable${classifyStatusText(record.approvalStatus) === 'pending' ? ' matap-row-pending' : ''}`}
                    tabIndex={0}
                    onClick={() => onRowClick(record)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onRowClick(record); }}
                  >
                    <td className="matap-cell-sno sila-num">{idx + 1}</td>
                    <td className="sila-num"><span className="matap-order-chip">{record.order}</span></td>
                    <td><span className="sila-ref matap-code">{record.materialCode}</span></td>
                    <td className="matap-cell-strong">{record.description}</td>
                    <td className="matap-cell-muted">{record.productType}</td>
                    <td className="matap-cell-muted">{record.materialGroup}</td>
                    <td><MaterialStatusBadge value={record.approvalStatus} /></td>
                    <td><MaterialStatusBadge value={record.status} /></td>
                    <td className="matap-cell-chevron"><IconChevronRight /></td>
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

export default MaterialTable;
