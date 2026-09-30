import React from 'react';
import type { PendingMaterialApproval, MaterialApprovalKpi } from './materialApi';
import { classifyStatusText, formatMaterialStatus, MATERIAL_STATUS_FILTER_OPTIONS } from './materialApi';
import { Dropdown, KpiCard, StatusBadge, Table } from '@vosox/shared-ui';
import type { DropdownOption, DropdownValue, TableColumn } from '@vosox/shared-ui';
import './MaterialApproval.css';

const STATUS_DROPDOWN_OPTIONS: DropdownOption[] = MATERIAL_STATUS_FILTER_OPTIONS.map((opt) => ({
  name: opt.label,
  value: opt.value,
}));

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
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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
  page,
  pageSize,
  onPageChange,
}) => {
  const showError = Boolean(error) && records.length === 0;
  const matchedStatusOption = STATUS_DROPDOWN_OPTIONS.find((opt) => opt.value === statusFilter);
  const selectedStatusOption: DropdownValue | null = matchedStatusOption
    ? { name: matchedStatusOption.name, value: matchedStatusOption.value ?? matchedStatusOption.name }
    : null;
  // The API has no total count; a full page means there's likely another one.
  const hasNextPage = records.length === pageSize;

  const columns: TableColumn<PendingMaterialApproval>[] = [
    {
      id: 'sno',
      header: 'S.No',
      headerClassName: 'matap-col-sno',
      align: 'right',
      className: 'matap-cell-sno',
      cell: ({ rowIndex }) => (page - 1) * pageSize + rowIndex + 1,
    },
    {
      id: 'order',
      header: 'Order',
      align: 'right',
      cell: ({ row }) => <span className="matap-order-chip">{row.order}</span>,
    },
    {
      id: 'materialCode',
      header: 'Material Code',
      cell: ({ row }) => <span className="sila-ref matap-code">{row.materialCode}</span>,
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      className: 'matap-cell-strong',
    },
    {
      id: 'productType',
      header: 'Product Type',
      accessorKey: 'productType',
      className: 'matap-cell-muted',
    },
    {
      id: 'materialGroup',
      header: 'Material Group',
      accessorKey: 'materialGroup',
      className: 'matap-cell-muted',
    },
    {
      id: 'approvalStatus',
      header: 'Approval Status',
      cell: ({ row }) => <MaterialStatusBadge value={row.approvalStatus} />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <MaterialStatusBadge value={row.status} />,
    },
    {
      id: 'chevron',
      header: <span className="sila-visually-hidden">Open</span>,
      className: 'matap-cell-chevron',
      cell: () => <IconChevronRight />,
    },
  ];

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

          <Dropdown
            className="matap-status-select"
            label="Status"
            hideLabel
            placeholder="All Status"
            options={STATUS_DROPDOWN_OPTIONS}
            value={selectedStatusOption}
            onChange={(value) => onStatusFilterChange(value?.value ?? '')}
          />
        </div>

        <Table<PendingMaterialApproval>
          columns={columns}
          data={records}
          getRowId={(record) => record.predefinedMaterialId}
          loading={loading}
          loadingRows={pageSize}
          loadingLabel="Loading material approvals…"
          error={showError ? "Couldn't load material approvals" : undefined}
          errorDescription={showError ? error : undefined}
          emptyState={{ title: 'No material approvals found.', description: 'Try a different status or search term.' }}
          onRowClick={onRowClick}
          rowClassName={(record) => (classifyStatusText(record.approvalStatus) === 'pending' ? 'matap-row-pending' : '')}
          className="matap-table"
          pagination={
            records.length > 0
              ? {
                  page,
                  hasNext: hasNextPage,
                  onPrevious: () => onPageChange(Math.max(1, page - 1)),
                  onNext: () => onPageChange(page + 1),
                  disabled: loading,
                  summary: `Page ${page}`,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default MaterialTable;
