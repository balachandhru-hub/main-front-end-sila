import React, { useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { EmptyState, KpiCard, StatusBadge, Dropdown } from '@vosox/shared-ui';
import type { DropdownValue } from '@vosox/shared-ui';
import type { ContractRecord } from './contractApi';
import './ContractTable.css';

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

const STATUS_FILTERS: { label: string; value: '' | ContractRecord['status'] }[] = [
  { label: 'All Status', value: '' },
  { label: statusLabel.PENDING, value: 'PENDING' },
  { label: statusLabel.APPROVED, value: 'APPROVED' },
  { label: statusLabel.REJECTED, value: 'REJECTED' },
];

const STATUS_FILTER_OPTIONS = STATUS_FILTERS.map((opt) => ({ name: opt.label, value: opt.value }));

const ContractTable: React.FC<ContractTableProps> = ({ records, loading, error }) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DropdownValue | null>(STATUS_FILTER_OPTIONS[0]);
  const statusFilter = (selectedStatus?.value || '') as '' | ContractRecord['status'];

  const counts = useMemo(
    () => ({
      total: records.length,
      pending: records.filter((r) => r.status === 'PENDING').length,
      approved: records.filter((r) => r.status === 'APPROVED').length,
      rejected: records.filter((r) => r.status === 'REJECTED').length,
    }),
    [records]
  );

  const query = search.trim().toLowerCase();
  const visible = records.filter(
    (r) =>
      (!statusFilter || r.status === statusFilter) &&
      (!query ||
        r.referenceNumber.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.requestedBy.toLowerCase().includes(query))
  );

  return (
    <div className="bad-table ctr-panel">
      <div className="ctr-stack">
        <div className="ctr-header">
          <div>
            <h1 className="bad-title ctr-title">Contract Approvals</h1>
            <div className="bad-subtitle ctr-subtitle">
              Contract requests raised across your organization.
            </div>
          </div>
        </div>

        {!loading && !(error && records.length === 0) && records.length > 0 && (
          <>
            <div className="ctr-kpi-grid">
              <KpiCard label="Total" value={counts.total} />
              <KpiCard label="Pending" value={counts.pending} tone={counts.pending > 0 ? 'warning' : 'neutral'} />
              <KpiCard label="Approved" value={counts.approved} />
              <KpiCard label="Rejected" value={counts.rejected} />
            </div>

            <div className="ctr-toolbar" role="search">
              <div className="ctr-search sila-search">
                <FaSearch className="sila-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="sila-input"
                  placeholder="Search by reference, title or requester"
                  aria-label="Search contracts"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Dropdown
                placeholder="All Status"
                options={STATUS_FILTER_OPTIONS}
                value={selectedStatus}
                onChange={setSelectedStatus}
                className="ctr-status-select"
              />
            </div>
          </>
        )}

        {loading ? (
          <div className="ctr-state">
            <div className="bad-spinner sila-spinner sila-spinner--md" />
            <span>Loading contract approvals...</span>
          </div>
        ) : error && records.length === 0 ? (
          <EmptyState variant="error" title={error} />
        ) : records.length === 0 ? (
          <EmptyState title="No contract approvals found." />
        ) : visible.length === 0 ? (
          <EmptyState title="No contract approvals match your filters." />
        ) : (
          <div className="bad-rfq-table-container sila-table-wrap ctr-table-wrap">
            <table className="bad-rfq-items-table sila-table ctr-table">
              <thead>
                <tr>
                  <th className="ctr-col-sno sila-num">S.No</th>
                  <th>Reference No.</th>
                  <th>Title</th>
                  <th>Requested By</th>
                  <th>Raised Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record, idx) => (
                  <tr key={record.id}>
                    <td className="ctr-sno sila-num">{idx + 1}</td>
                    <td><span className="bad-code-badge sila-ref">{record.referenceNumber}</span></td>
                    <td className="ctr-title-cell">{record.title}</td>
                    <td>{record.requestedBy}</td>
                    <td className="ctr-date">
                      {new Date(record.raisedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <StatusBadge status={record.status} label={statusLabel[record.status]} />
                    </td>
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
