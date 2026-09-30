import React, { useEffect, useState } from 'react';
import type { PendingMaterialApproval, MaterialApprovalKpi, MaterialUploadType } from './materialApi';
import {
  classifyStatusText,
  fetchMaterialApprovalKpi,
  fetchPendingMaterialApprovals,
  formatMaterialStatus,
  MATERIAL_STATUS_FILTER_OPTIONS,
} from './materialApi';
import { fetchBuyerAsset } from '../../api/platformApi';
import { resolveMimeType } from '../ContractCreation/contractFormatters';
import { toastService } from '@vosox/shared-ui';
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
  onRowClick: (record: PendingMaterialApproval) => void;
}

const PAGE_SIZE = 10;

const MATERIAL_TABS: { type: MaterialUploadType; label: string }[] = [
  { type: 'MANUAL', label: 'Single Material Approval' },
  { type: 'EXCEL', label: 'Bulk Material Approval' },
];

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

const MaterialTable: React.FC<MaterialTableProps> = ({ onRowClick }) => {
  const pageSize = PAGE_SIZE;
  const [materialType, setMaterialType] = useState<MaterialUploadType>('MANUAL');
  const [records, setRecords] = useState<PendingMaterialApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<MaterialApprovalKpi | null>(null);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  // searchTerm is the debounced value that drives the API call.
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const isBulk = materialType === 'EXCEL';
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Any filter change starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [materialType, statusFilter, searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPendingMaterialApprovals({
      type: materialType,
      status: statusFilter,
      searchTerm,
      index: (page - 1) * pageSize,
      limit: pageSize,
    })
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load material approvals.');
        setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [materialType, statusFilter, searchTerm, page, pageSize]);

  // Loaded once so tab/search/status changes don't refetch KPI.
  useEffect(() => {
    setLoadingKpi(true);
    fetchMaterialApprovalKpi()
      .then(setKpi)
      .catch((err: Error) => toastService.error(err.message || 'Failed to load approval summary counts.'))
      .finally(() => setLoadingKpi(false));
  }, []);

  const handleDownload = async (record: PendingMaterialApproval) => {
    const asset = record.asset;
    if (!asset) return;
    setDownloadingAssetId(asset.id);
    try {
      const res = await fetchBuyerAsset(asset.id);
      if (!('fileBytes' in res) || !res.fileBytes) {
        toastService.error('Document file content not available for download.');
        return;
      }
      const fileName = res.fileName || asset.fileName || asset.assetName || 'ItemMaster.xlsx';
      const mime = resolveMimeType(res.contentType || res.fileType, fileName);
      const base64Str = res.fileBytes.includes(',') ? res.fileBytes.split(',')[1] : res.fileBytes;
      const bytes = Uint8Array.from(atob(base64Str), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toastService.error('Unable to download document.');
    } finally {
      setDownloadingAssetId(null);
    }
  };

  const showError = Boolean(error) && records.length === 0;
  const matchedStatusOption = STATUS_DROPDOWN_OPTIONS.find((opt) => opt.value === statusFilter);
  const selectedStatusOption: DropdownValue | null = matchedStatusOption
    ? { name: matchedStatusOption.name, value: matchedStatusOption.value ?? matchedStatusOption.name }
    : null;
  // The API has no total count; a full page means there's likely another one.
  const hasNextPage = records.length === pageSize;

  const snoColumn: TableColumn<PendingMaterialApproval> = {
    id: 'sno',
    header: 'S.No',
    headerClassName: 'matap-col-sno',
    align: 'right',
    className: 'matap-cell-sno',
    cell: ({ rowIndex }) => (page - 1) * pageSize + rowIndex + 1,
  };
  const orderColumn: TableColumn<PendingMaterialApproval> = {
    id: 'order',
    header: 'Order',
    align: 'right',
    cell: ({ row }) => <span className="matap-order-chip">{row.order}</span>,
  };
  const approvalStatusColumn: TableColumn<PendingMaterialApproval> = {
    id: 'approvalStatus',
    header: 'Approval Status',
    cell: ({ row }) => <MaterialStatusBadge value={row.approvalStatus} />,
  };
  const statusColumn: TableColumn<PendingMaterialApproval> = {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <MaterialStatusBadge value={row.status} />,
  };

  const bulkColumns: TableColumn<PendingMaterialApproval>[] = [
    snoColumn,
    { ...orderColumn, width: '5rem' },
    // No width on Title so it takes the remaining space.
    { id: 'title', header: 'Title', accessorKey: 'title', className: 'matap-cell-strong' },
    { ...approvalStatusColumn, width: '11rem' },
    { ...statusColumn, width: '10rem' },
    {
      id: 'download',
      header: 'Download',
      width: '9rem',
      cell: ({ row }) => (
        <button
          type="button"
          className="sila-btn sila-btn--secondary"
          disabled={!row.asset || downloadingAssetId === row.asset.id}
          aria-label={`Download ${row.asset?.fileName ?? row.title ?? 'file'}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleDownload(row);
          }}
        >
          {downloadingAssetId === row.asset?.id ? 'Downloading…' : 'Download'}
        </button>
      ),
    },
  ];

  const singleColumns: TableColumn<PendingMaterialApproval>[] = [
    snoColumn,
    { ...orderColumn, width: '5rem' },
    {
      id: 'materialCode',
      header: 'Material Code',
      width: '10rem',
      cell: ({ row }) => <span className="sila-ref matap-code">{row.materialCode}</span>,
    },
    {
      // No width on Description so it takes the remaining space.
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      className: 'matap-cell-strong',
    },
    {
      id: 'productType',
      header: 'Product Type',
      width: '11rem',
      accessorKey: 'productType',
      className: 'matap-cell-muted',
    },
    {
      id: 'materialGroup',
      header: 'Material Group',
      width: '11rem',
      accessorKey: 'materialGroup',
      className: 'matap-cell-muted',
    },
    { ...approvalStatusColumn, width: '11rem' },
    { ...statusColumn, width: '9rem' },
    {
      id: 'chevron',
      width: '3rem',
      header: <span className="sila-visually-hidden">Open</span>,
      className: 'matap-cell-chevron',
      cell: () => <IconChevronRight />,
    },
  ];

  const columns = isBulk ? bulkColumns : singleColumns;

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

      <div className="matap-tabs" role="tablist" aria-label="Material approval type">
        {MATERIAL_TABS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            role="tab"
            id={`matap-tab-${type}`}
            aria-selected={materialType === type}
            aria-controls="matap-tabpanel"
            className={`matap-tab${materialType === type ? ' matap-tab--active' : ''}`}
            onClick={() => setMaterialType(type)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="matap-table-card" role="tabpanel" id="matap-tabpanel" aria-labelledby={`matap-tab-${materialType}`}>
        <div className="matap-filter-bar" role="search">
          <div className="matap-search-wrap">
            <span className="matap-search-icon" aria-hidden="true"><IconSearch /></span>
            <input
              type="text"
              className="sila-input matap-search-input"
              placeholder="Search by material code or material group..."
              aria-label="Search material approvals"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSearchTerm(searchInput); }}
            />
            {searchInput && (
              <button type="button" className="matap-search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">
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
            onChange={(value) => setStatusFilter(value?.value ?? '')}
          />
        </div>

        <Table<PendingMaterialApproval>
          columns={columns}
          data={records}
          getRowId={(record) => record.predefinedMaterialId}
          loading={loading}
          loadingRows={pageSize}
          loadingLabel="Loading material approvals…"
          error={showError ? error : undefined}
          alwaysShowHeader
          emptyState={{ title: 'No material approvals found.', description: 'Try a different status or search term.' }}
          onRowClick={onRowClick}
          rowClassName={(record) => (classifyStatusText(record.approvalStatus) === 'pending' ? 'matap-row-pending' : '')}
          className="matap-table"
          pagination={
            records.length > 0
              ? {
                  page,
                  hasNext: hasNextPage,
                  onPrevious: () => setPage((p) => Math.max(1, p - 1)),
                  onNext: () => setPage((p) => p + 1),
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
