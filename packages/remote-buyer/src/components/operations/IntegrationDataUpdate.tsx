import React, { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, Loader, Pagination, toastService } from "@vosox/shared-ui";
import {
  commitIntegrationImport,
  downloadIntegrationCorrectionReport,
  downloadIntegrationTemplate,
  exportIntegrationData,
  getIntegrationDataUpdate,
  previewIntegrationImport,
  saveBlob,
  type IntegrationConfiguration,
  type IntegrationDataRow,
  type IntegrationDataUpdate as IntegrationDataState,
  type IntegrationImportKind,
  type IntegrationImportPreview,
} from "../../api/operationsApi";
import { errorMessage, formatDate, formatDateTime, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface IntegrationDataUpdateProps {
  configuration: IntegrationConfiguration;
  /** Called after an import was committed, so the run history can reload. */
  onImported: () => void;
}

interface Column {
  key: string;
  label: string;
}

const COLUMNS: Record<IntegrationImportKind, Column[]> = {
  PURCHASE_ORDERS: [
    { key: "poNumber", label: "PO number" },
    { key: "supplierName", label: "Supplier" },
    { key: "status", label: "Status" },
    { key: "currency", label: "Currency" },
    { key: "poDate", label: "PO date" },
    { key: "lastSyncedAt", label: "Last synced" },
  ],
  SUPPLIERS: [
    { key: "supplierCode", label: "Supplier code" },
    { key: "name", label: "Supplier name" },
    { key: "taxNumber", label: "Tax number" },
    { key: "status", label: "Status" },
    { key: "updatedAt", label: "Updated" },
  ],
};

const STATUSES: Record<IntegrationImportKind, string[]> = {
  PURCHASE_ORDERS: ["OPEN", "PARTIALLY_RECEIVED", "CLOSED", "CANCELLED"],
  SUPPLIERS: ["ACTIVE", "INACTIVE"],
};

const DEFAULT_SORT: Record<IntegrationImportKind, string> = { PURCHASE_ORDERS: "lastSyncedAt", SUPPLIERS: "updatedAt" };
const KIND_LABEL: Record<IntegrationImportKind, string> = { PURCHASE_ORDERS: "Purchase orders", SUPPLIERS: "Suppliers" };
/** The spreadsheet column that identifies a row, per kind. */
const PREVIEW_KEY: Record<IntegrationImportKind, string> = { PURCHASE_ORDERS: "PO_NUMBER", SUPPLIERS: "SUPPLIER_CODE" };

const PAGE_SIZE = 25;
const PREVIEW_ROWS = 100;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

const renderCell = (row: IntegrationDataRow, key: string): React.ReactNode => {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "—";
  if (key === "status") return <span className={statusBadgeClass(String(value))}>{statusLabel(String(value))}</span>;
  if (key === "poDate") return formatDate(String(value));
  if (key.endsWith("At")) return formatDateTime(String(value));
  return String(value);
};

/** Imported data of an integration, with spreadsheet template, export and import (preview, corrections, commit). */
const IntegrationDataUpdate: React.FC<IntegrationDataUpdateProps> = ({ configuration, onImported }) => {
  const [kind, setKind] = useState<IntegrationImportKind>(
    configuration.processType.includes("SUPPLIER") ? "SUPPLIERS" : "PURCHASE_ORDERS",
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT[kind]);
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<IntegrationDataState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"template" | "export" | "preview" | "commit" | "report" | null>(null);
  const [preview, setPreview] = useState<IntegrationImportPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getIntegrationDataUpdate(configuration.id, { kind, search, status, sortBy, descending, page, pageSize: PAGE_SIZE }));
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the imported data."));
    } finally {
      setLoading(false);
    }
  }, [configuration.id, kind, search, status, sortBy, descending, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeKind = (next: IntegrationImportKind) => {
    if (next === kind) return;
    setKind(next);
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSortBy(DEFAULT_SORT[next]);
    setDescending(true);
    setPage(1);
    setPreview(null);
  };

  const handleTemplate = async () => {
    setBusy("template");
    try {
      const file = await downloadIntegrationTemplate(configuration.id, kind);
      saveBlob(file.blob, file.fileName);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not download the template."));
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setBusy("export");
    try {
      const file = await exportIntegrationData(configuration.id, { kind, search, status, sortBy, descending });
      saveBlob(file.blob, file.fileName);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not export the data."));
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toastService.error("The file is larger than 10 MB.");
      return;
    }
    setBusy("preview");
    try {
      const result = await previewIntegrationImport(configuration.id, kind, file);
      setPreview(result);
      if (result.invalidRows > 0) {
        toastService.warning(`${result.invalidRows} row(s) need correction. Nothing has been changed.`);
      } else {
        toastService.success(`${result.validRows} row(s) are ready to commit.`);
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "The spreadsheet could not be previewed."));
    } finally {
      setBusy(null);
    }
  };

  const handleCorrectionReport = async () => {
    if (!preview) return;
    setBusy("report");
    try {
      const file = await downloadIntegrationCorrectionReport(configuration.id, preview.kind, preview.rows);
      saveBlob(file.blob, file.fileName);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not download the correction report."));
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setBusy("commit");
    try {
      const result = await commitIntegrationImport(
        configuration.id,
        preview.kind,
        preview.rows.filter((row) => row.isValid).map((row) => row.values),
      );
      toastService.success(`${result.recordsCommitted} record(s) committed. The import is recorded in the run history.`);
      setPreview(null);
      onImported();
      if (page === 1) {
        await load();
      } else {
        setPage(1);
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "The import was not committed. No records were changed."));
    } finally {
      setBusy(null);
    }
  };

  const columns = COLUMNS[kind];
  const rows = data ? (kind === "PURCHASE_ORDERS" ? data.purchaseOrderRows : data.supplierRows) : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.totalRows / (data.pageSize || PAGE_SIZE))) : 1;

  return (
    <>
      <section className="sila-card">
        <div className="sila-card-header">
          <div className="sila-tabs" role="tablist" aria-label="Data kind">
            {(Object.keys(KIND_LABEL) as IntegrationImportKind[]).map((value) => (
              <button key={value} type="button" role="tab" className="sila-tab" aria-selected={kind === value} onClick={() => changeKind(value)}>
                {KIND_LABEL[value]}
              </button>
            ))}
          </div>
          <div className="sila-btn-group">
            <input ref={fileInput} type="file" accept=".xlsx,.csv" hidden onChange={handleFile} aria-label={`Spreadsheet of ${KIND_LABEL[kind].toLowerCase()} to import`} />
            <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={handleTemplate} disabled={busy !== null}>
              {busy === "template" ? "Downloading..." : "Download template"}
            </button>
            <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={handleExport} disabled={busy !== null || loading}>
              {busy === "export" ? "Exporting..." : "Export"}
            </button>
            <button type="button" className="sila-btn sila-btn--primary sila-btn--sm" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
              {busy === "preview" ? "Reading file..." : "Import spreadsheet"}
            </button>
          </div>
        </div>
        <div className="sila-card-body ops-stack">
          <dl className="sila-meta-grid">
            <div className="sila-meta-item"><dt className="sila-meta-label">Purchase orders held</dt><dd className="sila-meta-value">{data ? data.purchaseOrders : "—"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Suppliers held</dt><dd className="sila-meta-value">{data?.suppliers ?? "—"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Last synced</dt><dd className="sila-meta-value">{formatDateTime(data?.lastSyncedAt)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Watermark</dt><dd className="sila-meta-value">{formatDateTime(data?.lastWatermark)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Pull</dt><dd className="sila-meta-value">{data?.isRunning ? "Running now" : "Idle"}</dd></div>
          </dl>
          {data?.lastErrorSafe && (
            <div className="sila-alert sila-alert--warning" role="status">
              <div>
                <div className="sila-alert-title">Last run reported a problem</div>
                <div className="ops-break">{data.lastErrorSafe}</div>
              </div>
            </div>
          )}
          <span className="sila-help">
            The export contains every record matching the search, status and sort below. An import is validated first; nothing changes until it is committed.
          </span>
        </div>
      </section>

      {preview && (
        <section className="sila-card">
          <div className="sila-card-header">
            <h2 className="sila-card-title">Import preview: {preview.fileName}</h2>
            <span className={preview.invalidRows > 0 ? "sila-badge sila-badge--warning" : "sila-badge sila-badge--success"}>
              {preview.validRows} valid · {preview.invalidRows} invalid
            </span>
          </div>
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Result</th>
                  <th scope="col">{PREVIEW_KEY[preview.kind].split("_").join(" ")}</th>
                  <th scope="col">Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, PREVIEW_ROWS).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <span className={row.isValid ? "sila-badge sila-badge--success" : "sila-badge sila-badge--danger"}>
                        {row.isValid ? "Valid" : "Invalid"}
                      </span>
                    </td>
                    <td className="sila-cell-strong">{row.values[PREVIEW_KEY[preview.kind]] ?? "—"}</td>
                    <td className="ops-break">{row.errors.length > 0 ? row.errors.join(" ") : "Ready to save"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sila-card-footer">
            <span className="sila-help">
              {preview.rows.length > PREVIEW_ROWS ? `Showing the first ${PREVIEW_ROWS} of ${preview.totalRows} rows. ` : ""}
              {preview.invalidRows > 0
                ? "Download the correction report, fix the rows in the spreadsheet and import it again."
                : "All rows are valid."}
            </span>
            <button type="button" className="sila-btn sila-btn--secondary" onClick={handleCorrectionReport} disabled={busy !== null || preview.invalidRows === 0}>
              {busy === "report" ? "Downloading..." : "Download correction report"}
            </button>
            <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setPreview(null)} disabled={busy !== null}>Discard</button>
            <button type="button" className="sila-btn sila-btn--primary" onClick={handleCommit} disabled={busy !== null || preview.invalidRows > 0 || preview.validRows === 0}>
              {busy === "commit" ? "Committing..." : `Commit ${preview.validRows} rows`}
            </button>
          </div>
        </section>
      )}

      <section className="sila-card">
        <form
          className="sila-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
        >
          <div className="sila-toolbar-group">
            <label className="sila-visually-hidden" htmlFor="integration-data-search">Search imported records</label>
            <input id="integration-data-search" className="sila-input" placeholder={kind === "PURCHASE_ORDERS" ? "PO number or supplier" : "Supplier code or name"} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            <label className="sila-visually-hidden" htmlFor="integration-data-status">Status</label>
            <select id="integration-data-status" className="sila-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {STATUSES[kind].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
            </select>
            <label className="sila-visually-hidden" htmlFor="integration-data-sort">Sort by</label>
            <select id="integration-data-sort" className="sila-select" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}>
              {columns.map((column) => <option key={column.key} value={column.key}>Sort: {column.label}</option>)}
            </select>
            <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => { setDescending((current) => !current); setPage(1); }}>
              {descending ? "Descending" : "Ascending"}
            </button>
          </div>
          <button type="submit" className="sila-btn sila-btn--primary sila-btn--sm" disabled={loading}>Search</button>
        </form>
        {loading ? (
          <Loader size={20} message="Loading imported records..." />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn't load the imported data"
            description={error}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={`No ${KIND_LABEL[kind].toLowerCase()} found`}
            description="Pull data from the source system or import a spreadsheet."
          />
        ) : (
          <>
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={String(row.id ?? index)}>
                      {columns.map((column, columnIndex) => (
                        <td key={column.key} className={columnIndex === 0 ? "sila-cell-strong" : undefined}>{renderCell(row, column.key)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => current + 1)}
              onPageChange={setPage}
              summary={`${data?.totalRows ?? 0} matching record(s)`}
              disabled={loading}
            />
          </>
        )}
      </section>
    </>
  );
};

export default IntegrationDataUpdate;
