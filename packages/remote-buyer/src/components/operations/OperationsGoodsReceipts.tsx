import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader } from "@vosox/shared-ui";
import { getGoodsReceipts, type GoodsReceipt } from "../../api/operationsApi";
import GoodsReceiptDetail from "./GoodsReceiptDetail";
import GoodsReceiptForm from "./GoodsReceiptForm";
import { errorMessage, formatDate, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

type View = { name: "list" } | { name: "create" } | { name: "detail"; id: string };

/** Goods receipts (GRN): list, create from an invoice, detail with validate / post / retry. */
const OperationsGoodsReceipts: React.FC = () => {
  const [view, setView] = useState<View>({ name: "list" });
  const [rows, setRows] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getGoodsReceipts());
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load goods receipts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view.name === "list") load();
  }, [view.name]);

  if (view.name === "create") {
    return (
      <GoodsReceiptForm
        onCancel={() => setView({ name: "list" })}
        onPosted={(receipt) => setView({ name: "detail", id: receipt.id })}
      />
    );
  }

  if (view.name === "detail") {
    return <GoodsReceiptDetail goodsReceiptId={view.id} onBack={() => setView({ name: "list" })} />;
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? rows.filter((row) =>
        `${row.grnNumber} ${row.supplierName} ${row.purchaseOrderNumber} ${row.invoiceNumber ?? ""} ${row.erpMaterialDocument ?? ""}`
          .toLowerCase()
          .includes(term))
    : rows;

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Goods receipts"
        description="What physically arrived against a purchase order, and whether it reached the ERP."
        actions={(
          <button type="button" className="sila-btn sila-btn--primary" onClick={() => setView({ name: "create" })}>
            New goods receipt
          </button>
        )}
      />
      <section className="sila-card">
        <div className="sila-toolbar">
          <div className="sila-toolbar-group">
            <label className="sila-visually-hidden" htmlFor="grn-search">Search goods receipts</label>
            <input id="grn-search" className="sila-input" placeholder="Search GRN, PO, supplier or ERP document" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={load} disabled={loading}>Refresh</button>
        </div>
        {loading ? (
          <Loader size={24} message="Loading goods receipts..." />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn't load goods receipts"
            description={error}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={term ? "No matching goods receipts" : "No goods receipts yet"}
            description={term ? "Try a different search." : "Create one from an invoice that is matched to a purchase order."}
          />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">GRN</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Purchase order</th>
                  <th scope="col">Invoice</th>
                  <th scope="col">ERP document</th>
                  <th scope="col">Received</th>
                  <th scope="col">Lines</th>
                  <th scope="col">Status</th>
                  <th scope="col">ERP posting</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className="sila-row-clickable"
                    tabIndex={0}
                    onClick={() => setView({ name: "detail", id: row.id })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setView({ name: "detail", id: row.id });
                      }
                    }}
                  >
                    <td>
                      <span className="sila-cell-strong">{row.grnNumber}</span>
                      <div className="sila-help">{row.operatingUnitName}</div>
                    </td>
                    <td>{row.supplierName}</td>
                    <td>{row.purchaseOrderNumber}</td>
                    <td>{row.invoiceNumber || "—"}</td>
                    <td>{row.erpMaterialDocument || "—"}</td>
                    <td>{formatDate(row.receiptDate)}</td>
                    <td>{row.lines.length}</td>
                    <td><span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span></td>
                    <td>
                      {row.erpPostingStatus
                        ? <span className={statusBadgeClass(row.erpPostingStatus)}>{statusLabel(row.erpPostingStatus)}</span>
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default OperationsGoodsReceipts;
