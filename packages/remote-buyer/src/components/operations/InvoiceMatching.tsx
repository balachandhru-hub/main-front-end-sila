import React, { useEffect, useState } from "react";
import { EmptyState, Loader, toastService } from "@vosox/shared-ui";
import {
  getInvoiceSupplierCandidates,
  getOperationsSuppliers,
  getPurchaseOrder,
  matchInvoiceLines,
  matchInvoicePurchaseOrder,
  matchInvoiceSupplier,
  searchPurchaseOrders,
  type Invoice,
  type OperationsPurchaseOrder,
  type OperationsSupplier,
  type SupplierMatchCandidate,
} from "../../api/operationsApi";
import { errorMessage, formatDate, formatMoney, formatNumber, formatPercent, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface InvoiceMatchingProps {
  invoice: Invoice;
  /** Called with the invoice as the backend returned it after a match. */
  onChanged: (invoice: Invoice) => void;
}

const MATCH_REASONS: Record<string, string> = { TRN: "Tax number", NAME: "Name", ALIAS: "Alias" };

/** Match an invoice to its supplier, its purchase order and the purchase order lines. */
const InvoiceMatching: React.FC<InvoiceMatchingProps> = ({ invoice, onChanged }) => {
  const [busy, setBusy] = useState(false);

  // Supplier
  const [candidates, setCandidates] = useState<SupplierMatchCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierResults, setSupplierResults] = useState<OperationsSupplier[] | null>(null);
  const [supplierSearching, setSupplierSearching] = useState(false);

  // Purchase order
  const [poQuery, setPoQuery] = useState(invoice.purchaseOrderNumber ?? "");
  const [poResults, setPoResults] = useState<OperationsPurchaseOrder[] | null>(null);
  const [poSearching, setPoSearching] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState<OperationsPurchaseOrder | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Lines: invoice line id -> purchase order item id ("" = not matched)
  const [lineMatches, setLineMatches] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setCandidatesLoading(true);
    setCandidatesError(null);
    getInvoiceSupplierCandidates(invoice.id)
      .then((result) => {
        if (active) setCandidates(result.candidates);
      })
      .catch((err: unknown) => {
        if (active) setCandidatesError(errorMessage(err, "Could not load supplier candidates."));
      })
      .finally(() => {
        if (active) setCandidatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invoice.id, invoice.supplierName, invoice.supplierTaxNumber]);

  // The matched purchase order supplies the lines the invoice lines are matched to.
  useEffect(() => {
    if (!invoice.purchaseOrderId || !invoice.purchaseOrderNumber) {
      setMatchedOrder(null);
      setOrderError(null);
      return;
    }
    let active = true;
    setOrderError(null);
    getPurchaseOrder(invoice.purchaseOrderNumber)
      .then((order) => {
        if (active) setMatchedOrder(order);
      })
      .catch((err: unknown) => {
        if (active) {
          setMatchedOrder(null);
          setOrderError(errorMessage(err, "Could not load the purchase order lines."));
        }
      });
    return () => {
      active = false;
    };
  }, [invoice.purchaseOrderId, invoice.purchaseOrderNumber]);

  useEffect(() => {
    const next: Record<string, string> = {};
    invoice.lines.forEach((line) => {
      next[line.id] = line.purchaseOrderItemId ?? "";
    });
    setLineMatches(next);
  }, [invoice]);

  const run = async (action: () => Promise<Invoice>, success: string, fallback: string) => {
    setBusy(true);
    try {
      onChanged(await action());
      toastService.success(success);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const selectSupplier = (supplierId: string | null) =>
    run(
      () => matchInvoiceSupplier(invoice.id, supplierId),
      supplierId ? "Supplier matched." : "Supplier matching was run again.",
      "Could not match the supplier.",
    );

  const searchSuppliers = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplierQuery.trim()) return;
    setSupplierSearching(true);
    try {
      const results = await getOperationsSuppliers({ query: supplierQuery, status: "ACTIVE" });
      setSupplierResults(results.filter((supplier) => !supplier.isBlocked && !supplier.isDeleted));
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not search suppliers."));
    } finally {
      setSupplierSearching(false);
    }
  };

  const searchOrders = async (event: React.FormEvent) => {
    event.preventDefault();
    setPoSearching(true);
    try {
      setPoResults(await searchPurchaseOrders({ query: poQuery, supplierId: invoice.supplierId ?? undefined, openOnly: true }));
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not search purchase orders."));
    } finally {
      setPoSearching(false);
    }
  };

  const selectOrder = (order: OperationsPurchaseOrder) =>
    run(
      () => matchInvoicePurchaseOrder(invoice.id, order.id, order.poNumber),
      `Matched to purchase order ${order.poNumber}.`,
      "Could not match the purchase order.",
    );

  const autoMatchOrder = () =>
    run(
      () => matchInvoicePurchaseOrder(invoice.id, null, poQuery.trim() || null),
      "Purchase order matching was run again.",
      "Could not match the purchase order.",
    );

  const saveLineMatches = () =>
    run(
      () => matchInvoiceLines(
        invoice.id,
        invoice.lines.map((line) => ({ invoiceLineId: line.id, purchaseOrderItemId: lineMatches[line.id] || null })),
      ),
      "Line matching saved.",
      "Could not match the invoice lines.",
    );

  const linesChanged = invoice.lines.some((line) => (line.purchaseOrderItemId ?? "") !== (lineMatches[line.id] ?? ""));

  return (
    <>
      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Supplier</h2>
          {invoice.supplierId
            ? <span className="sila-badge sila-badge--success">Matched{invoice.supplierCode ? ` · ${invoice.supplierCode}` : ""}</span>
            : <span className="sila-badge sila-badge--warning">Not matched</span>}
        </div>
        <div className="sila-card-body ops-stack">
          <div className="ops-inline">
            <span className="ops-muted">Name on the invoice: {invoice.supplierName || "not read"}{invoice.supplierTaxNumber ? ` · ${invoice.supplierTaxNumber}` : ""}</span>
            <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => selectSupplier(null)} disabled={busy}>
              Auto-match
            </button>
          </div>

          {candidatesLoading ? (
            <Loader size={20} message="Looking for matching suppliers..." />
          ) : candidatesError ? (
            <span className="sila-error-text">{candidatesError}</span>
          ) : candidates.length === 0 ? (
            <span className="sila-help">No supplier in the master matches the name or tax number on this invoice. Search below.</span>
          ) : (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Suggested supplier</th>
                    <th scope="col">Tax number</th>
                    <th scope="col">Matched on</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.supplierId}>
                      <td>
                        <span className="sila-cell-strong">{candidate.name}</span>
                        <div className="sila-help">{candidate.supplierCode}</div>
                      </td>
                      <td>{candidate.taxNumber || "—"}</td>
                      <td>{MATCH_REASONS[candidate.matchReason] ?? candidate.matchReason}</td>
                      <td>{formatPercent(candidate.confidence)}</td>
                      <td>
                        {candidate.supplierId === invoice.supplierId ? (
                          <span className="sila-badge sila-badge--success">Selected</span>
                        ) : (
                          <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => selectSupplier(candidate.supplierId)} disabled={busy}>
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form className="ops-inline" onSubmit={searchSuppliers}>
            <label className="sila-visually-hidden" htmlFor="invoice-supplier-search">Search the supplier master</label>
            <input id="invoice-supplier-search" className="sila-input" placeholder="Search the supplier master by code, name, TRN or alias" value={supplierQuery} onChange={(event) => setSupplierQuery(event.target.value)} />
            <button type="submit" className="sila-btn sila-btn--secondary" disabled={supplierSearching || !supplierQuery.trim()}>
              {supplierSearching ? "Searching..." : "Search"}
            </button>
          </form>
          {supplierResults && (supplierResults.length === 0 ? (
            <span className="sila-help">No active supplier matches that search.</span>
          ) : (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Supplier</th>
                    <th scope="col">Entity</th>
                    <th scope="col">Tax number</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierResults.slice(0, 20).map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <span className="sila-cell-strong">{supplier.name}</span>
                        <div className="sila-help">{supplier.supplierCode}</div>
                      </td>
                      <td>{supplier.entityCode}</td>
                      <td>{supplier.trn || supplier.taxNumber || "—"}</td>
                      <td>
                        <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => selectSupplier(supplier.id)} disabled={busy || supplier.id === invoice.supplierId}>
                          {supplier.id === invoice.supplierId ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Purchase order</h2>
          {invoice.purchaseOrderId
            ? <span className="sila-badge sila-badge--success">Matched · {invoice.purchaseOrderNumber}</span>
            : <span className="sila-badge sila-badge--warning">Not matched</span>}
        </div>
        <div className="sila-card-body ops-stack">
          <form className="ops-inline" onSubmit={searchOrders}>
            <label className="sila-visually-hidden" htmlFor="invoice-po-search">Purchase order number or supplier</label>
            <input id="invoice-po-search" className="sila-input" placeholder="PO number or supplier" value={poQuery} onChange={(event) => setPoQuery(event.target.value)} />
            <button type="submit" className="sila-btn sila-btn--secondary" disabled={poSearching}>
              {poSearching ? "Searching..." : "Find open orders"}
            </button>
            <button type="button" className="sila-btn sila-btn--secondary" onClick={autoMatchOrder} disabled={busy}>
              Match by number
            </button>
          </form>
          <span className="sila-help">
            {invoice.supplierId
              ? "The search is limited to open orders of the matched supplier."
              : "Match the supplier first to limit the search to that supplier's open orders."}
            {" "}For an invoice without a purchase order, tick "No purchase order" in the invoice fields above.
          </span>
          {poResults && (poResults.length === 0 ? (
            <span className="sila-help">No open purchase order matches that search.</span>
          ) : (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">PO number</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Order date</th>
                    <th scope="col" className="ops-num">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {poResults.map((order) => (
                    <tr key={order.id}>
                      <td className="sila-cell-strong">{order.poNumber}</td>
                      <td>{order.supplierName}</td>
                      <td>{formatDate(order.poDate)}</td>
                      <td className="ops-num">{formatMoney(order.totalAmount, order.currency)}</td>
                      <td><span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span></td>
                      <td>
                        <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => selectOrder(order)} disabled={busy || order.id === invoice.purchaseOrderId}>
                          {order.id === invoice.purchaseOrderId ? "Matched" : "Match"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Invoice lines</h2>
          <span className="ops-muted">{invoice.lines.length} lines</span>
        </div>
        {invoice.lines.length === 0 ? (
          <EmptyState title="No extracted lines" description="Lines appear after the extraction completes." />
        ) : (
          <>
            {orderError && <div className="sila-card-body"><span className="sila-error-text">{orderError}</span></div>}
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Description</th>
                    <th scope="col" className="ops-num">Quantity</th>
                    <th scope="col" className="ops-num">Unit price</th>
                    <th scope="col" className="ops-num">Tax</th>
                    <th scope="col" className="ops-num">Amount</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Match</th>
                    <th scope="col">Purchase order line</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.lineNumber}</td>
                      <td>
                        <span className="sila-cell-strong">{line.description}</span>
                        <div className="sila-help">{line.supplierMaterialCode || "No material code"}</div>
                      </td>
                      <td className="ops-num">{line.quantity == null ? "—" : `${formatNumber(line.quantity)} ${line.uom ?? ""}`}</td>
                      <td className="ops-num">{formatMoney(line.unitPrice, invoice.currency)}</td>
                      <td className="ops-num">{formatMoney(line.taxAmount, invoice.currency)}</td>
                      <td className="ops-num">{formatMoney(line.lineAmount, invoice.currency)}</td>
                      <td>{formatPercent(line.confidence)}</td>
                      <td><span className={statusBadgeClass(line.matchStatus)}>{statusLabel(line.matchStatus)}</span></td>
                      <td>
                        {matchedOrder ? (
                          <select
                            className="sila-select ops-cell-input ops-cell-input--wide"
                            aria-label={`Purchase order line for invoice line ${line.lineNumber}`}
                            value={lineMatches[line.id] ?? ""}
                            onChange={(event) => setLineMatches((current) => ({ ...current, [line.id]: event.target.value }))}
                          >
                            <option value="">Not matched</option>
                            {matchedOrder.items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.itemNumber || item.lineNumber} · {item.materialCode} · {item.description} ({formatNumber(item.openQuantity)} {item.uom} open)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="ops-muted">Match a purchase order first</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {matchedOrder && (
              <div className="sila-card-footer">
                <span className="sila-help">Every material line must be matched before a goods receipt can be posted.</span>
                <button type="button" className="sila-btn sila-btn--primary" onClick={saveLineMatches} disabled={busy || !linesChanged}>
                  Save line matching
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default InvoiceMatching;
