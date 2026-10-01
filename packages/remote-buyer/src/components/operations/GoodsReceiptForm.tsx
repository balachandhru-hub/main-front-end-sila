import React, { useEffect, useRef, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  getInvoice,
  getInvoices,
  getOrganizationUnits,
  getPurchaseOrder,
  postGoodsReceipt,
  validateGoodsReceipt,
  type GoodsReceipt,
  type GrnInput,
  type GrnValidation,
  type Invoice,
  type OperationsPurchaseOrder,
  type OrganizationUnit,
  type PurchaseOrderItem,
} from "../../api/operationsApi";
import { blank, errorMessage, formatNumber, toNumberOrNull } from "./operationsFormat";
import "./Operations.css";

interface GoodsReceiptFormProps {
  /** Receive against this invoice. When omitted the user picks an invoice that is matched to a purchase order. */
  invoiceId?: string;
  /** Limits the invoice choice to the ones matched to this purchase order. */
  purchaseOrderId?: string;
  onCancel: () => void;
  onPosted: (receipt: GoodsReceipt) => void;
}

interface LineForm {
  received: string;
  accepted: string;
  damaged: string;
  rejected: string;
  batchNumber: string;
  expiryDate: string;
}

const isReceivable = (item: PurchaseOrderItem): boolean =>
  item.openQuantity > 0 && !item.deletionIndicator && item.status !== "CLOSED" && item.status !== "CANCELLED";

const canReceive = (invoice: Invoice): boolean =>
  Boolean(invoice.purchaseOrderId) && invoice.invoiceType !== "SERVICE" && invoice.status !== "GRN_POSTED";

const nowLocal = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const quantity = (value: string): number => toNumberOrNull(value) ?? 0;

/** Create a goods receipt for an invoice that is matched to a purchase order: enter quantities, validate, post. */
const GoodsReceiptForm: React.FC<GoodsReceiptFormProps> = ({ invoiceId, purchaseOrderId, onCancel, onPosted }) => {
  const [candidates, setCandidates] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoiceId ?? "");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<OperationsPurchaseOrder | null>(null);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [operatingUnitId, setOperatingUnitId] = useState("");
  const [receiptDate, setReceiptDate] = useState(nowLocal);
  const [lines, setLines] = useState<Record<string, LineForm>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<GrnValidation | null>(null);
  const [busy, setBusy] = useState<"validate" | "post" | null>(null);
  // The same key is reused while the receipt is unchanged, so a repeated post cannot create a second receipt.
  const idempotency = useRef<{ payload: string; key: string } | null>(null);

  // Invoices to choose from and the units, loaded once.
  useEffect(() => {
    let active = true;
    const loadChoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const [unitRows, invoiceRows] = await Promise.all([
          getOrganizationUnits().catch(() => [] as OrganizationUnit[]),
          invoiceId ? Promise.resolve([] as Invoice[]) : getInvoices(),
        ]);
        if (!active) return;
        setUnits(unitRows);
        setCandidates(
          invoiceRows.filter((row) => canReceive(row) && (!purchaseOrderId || row.purchaseOrderId === purchaseOrderId)),
        );
      } catch (err: unknown) {
        if (active) setError(errorMessage(err, "Could not load the invoices."));
      } finally {
        if (active && !invoiceId) setLoading(false);
      }
    };
    loadChoices();
    return () => {
      active = false;
    };
  }, [invoiceId, purchaseOrderId]);

  // The chosen invoice with its purchase order.
  useEffect(() => {
    if (!selectedInvoiceId) {
      setInvoice(null);
      setPurchaseOrder(null);
      return;
    }
    let active = true;
    const loadInvoice = async () => {
      setLoading(true);
      setError(null);
      setValidation(null);
      try {
        const invoiceRow = await getInvoice(selectedInvoiceId);
        if (!invoiceRow.purchaseOrderId || !invoiceRow.purchaseOrderNumber) {
          throw new Error("Match this invoice to a purchase order before creating a goods receipt.");
        }
        const order = await getPurchaseOrder(invoiceRow.purchaseOrderNumber);
        if (!active) return;
        const initial: Record<string, LineForm> = {};
        order.items.filter(isReceivable).forEach((item) => {
          const invoiced = invoiceRow.lines
            .filter((line) => line.purchaseOrderItemId === item.id)
            .reduce((total, line) => total + (line.quantity ?? 0), 0);
          const received = Math.min(invoiced, item.openQuantity);
          initial[item.id] = {
            received: received > 0 ? String(received) : "",
            accepted: received > 0 ? String(received) : "",
            damaged: "",
            rejected: "",
            batchNumber: "",
            expiryDate: "",
          };
        });
        setInvoice(invoiceRow);
        setPurchaseOrder(order);
        setLines(initial);
        setOperatingUnitId(invoiceRow.operatingUnitId ?? order.operatingUnitId ?? "");
      } catch (err: unknown) {
        if (active) {
          setInvoice(null);
          setPurchaseOrder(null);
          setError(errorMessage(err, "Could not load the invoice."));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInvoice();
    return () => {
      active = false;
    };
  }, [selectedInvoiceId]);

  const updateLine = (itemId: string, field: keyof LineForm, value: string) => {
    setValidation(null);
    setLines((current) => {
      const next: LineForm = { ...current[itemId], [field]: value };
      // Accepted follows received minus what was damaged or rejected, unless it is typed directly.
      if (field === "received" || field === "damaged" || field === "rejected") {
        const accepted = Math.max(0, quantity(next.received) - quantity(next.damaged) - quantity(next.rejected));
        next.accepted = next.received.trim() ? String(accepted) : "";
      }
      return { ...current, [itemId]: next };
    });
  };

  const buildPayload = (): GrnInput | null => {
    if (!invoice || !purchaseOrder) return null;
    if (!operatingUnitId) {
      toastService.error("Select the operating unit that received the goods.");
      return null;
    }
    const payloadLines = Object.entries(lines)
      .filter(([, line]) => quantity(line.received) > 0)
      .map(([purchaseOrderItemId, line]) => ({
        purchaseOrderItemId,
        receivedQuantity: quantity(line.received),
        acceptedQuantity: quantity(line.accepted),
        damagedQuantity: quantity(line.damaged),
        rejectedQuantity: quantity(line.rejected),
        batchNumber: blank(line.batchNumber),
        expiryDate: line.expiryDate || null,
      }));
    if (payloadLines.length === 0) {
      toastService.error("Enter a received quantity for at least one line.");
      return null;
    }
    const receipt = new Date(receiptDate);
    return {
      invoiceId: invoice.id,
      purchaseOrderId: purchaseOrder.id,
      operatingUnitId,
      receiptDate: Number.isNaN(receipt.getTime()) ? null : receipt.toISOString(),
      lines: payloadLines,
    };
  };

  const handleValidate = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy("validate");
    try {
      const result = await validateGoodsReceipt(payload);
      setValidation(result);
      if (result.valid) toastService.success("The goods receipt is valid.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not validate the goods receipt."));
    } finally {
      setBusy(null);
    }
  };

  const handlePost = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    const serialized = JSON.stringify(payload);
    if (!idempotency.current || idempotency.current.payload !== serialized) {
      idempotency.current = { payload: serialized, key: crypto.randomUUID() };
    }
    setBusy("post");
    try {
      const check = await validateGoodsReceipt(payload);
      setValidation(check);
      if (!check.valid) {
        toastService.error("Fix the validation errors before posting.");
        return;
      }
      const receipt = await postGoodsReceipt(payload, idempotency.current.key);
      toastService.success(`Goods receipt ${receipt.grnNumber} posted.`);
      onPosted(receipt);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not post the goods receipt."));
    } finally {
      setBusy(null);
    }
  };

  const receivableItems = purchaseOrder ? purchaseOrder.items.filter(isReceivable) : [];

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="New goods receipt"
        description="Record what physically arrived. Received quantities are entered, never copied from the invoice without checking."
        onBack={onCancel}
        backLabel="Back"
      />

      {!invoiceId && (
        <section className="sila-card">
          <div className="sila-card-body">
            <div className="sila-form-grid">
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="grn-invoice">Invoice<span className="sila-required">*</span></label>
                <select id="grn-invoice" className="sila-select" value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)}>
                  <option value="">Select an invoice</option>
                  {candidates.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.invoiceNumber} · {row.supplierName || "Supplier pending"} · PO {row.purchaseOrderNumber}
                    </option>
                  ))}
                </select>
                <span className="sila-help">
                  Only material invoices that are matched to a purchase order and not yet received are listed.
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <Loader size={24} message="Loading..." />
      ) : error ? (
        <EmptyState variant="error" title="Couldn't prepare the goods receipt" description={error} />
      ) : !invoice || !purchaseOrder ? (
        <section className="sila-card">
          <EmptyState
            title={candidates.length === 0 ? "No invoice is ready to receive" : "Select an invoice"}
            description={candidates.length === 0
              ? "Upload an invoice and match it to a purchase order first."
              : "The purchase order lines of the invoice open here."}
          />
        </section>
      ) : (
        <form className="sila-card" onSubmit={handlePost}>
          <div className="sila-card-body ops-stack">
            <dl className="sila-meta-grid">
              <div className="sila-meta-item">
                <dt className="sila-meta-label">Invoice</dt>
                <dd className="sila-meta-value">{invoice.invoiceNumber}</dd>
              </div>
              <div className="sila-meta-item">
                <dt className="sila-meta-label">Purchase order</dt>
                <dd className="sila-meta-value">{purchaseOrder.poNumber}</dd>
              </div>
              <div className="sila-meta-item">
                <dt className="sila-meta-label">Supplier</dt>
                <dd className="sila-meta-value">{purchaseOrder.supplierName}</dd>
              </div>
            </dl>

            <div className="sila-form-grid">
              <div className="sila-field">
                <label className="sila-label" htmlFor="grn-unit">Operating unit<span className="sila-required">*</span></label>
                <select id="grn-unit" className="sila-select" value={operatingUnitId} onChange={(event) => { setOperatingUnitId(event.target.value); setValidation(null); }}>
                  <option value="">Select a unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>
                  ))}
                  {operatingUnitId && !units.some((unit) => unit.id === operatingUnitId) && (
                    <option value={operatingUnitId}>{invoice.operatingUnitName || purchaseOrder.operatingUnitName || "Current unit"}</option>
                  )}
                </select>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="grn-date">Receipt date</label>
                <input id="grn-date" type="datetime-local" className="sila-input" value={receiptDate} onChange={(event) => { setReceiptDate(event.target.value); setValidation(null); }} />
              </div>
            </div>

            {receivableItems.length === 0 ? (
              <EmptyState title="Nothing left to receive" description="Every line of this purchase order is already received or closed." />
            ) : (
              <div className="sila-table-wrap">
                <table className="sila-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col" className="ops-num">Open</th>
                      <th scope="col" className="ops-num">Invoiced</th>
                      <th scope="col">Received</th>
                      <th scope="col">Accepted</th>
                      <th scope="col">Damaged</th>
                      <th scope="col">Rejected</th>
                      <th scope="col">Batch</th>
                      <th scope="col">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivableItems.map((item) => {
                      const line = lines[item.id];
                      if (!line) return null;
                      const invoiced = invoice.lines
                        .filter((invoiceLine) => invoiceLine.purchaseOrderItemId === item.id)
                        .reduce((total, invoiceLine) => total + (invoiceLine.quantity ?? 0), 0);
                      const label = `${item.materialCode} ${item.description}`;
                      return (
                        <tr key={item.id}>
                          <td>
                            <span className="sila-cell-strong">{item.itemNumber || item.materialCode}</span>
                            <div className="sila-help">{item.description}</div>
                          </td>
                          <td className="ops-num">{formatNumber(item.openQuantity)} {item.uom}</td>
                          <td className="ops-num">{invoiced > 0 ? `${formatNumber(invoiced)} ${item.uom}` : "—"}</td>
                          <td><input type="number" min="0" step="any" className="sila-input ops-cell-input" aria-label={`Received quantity for ${label}`} value={line.received} onChange={(event) => updateLine(item.id, "received", event.target.value)} /></td>
                          <td><input type="number" min="0" step="any" className="sila-input ops-cell-input" aria-label={`Accepted quantity for ${label}`} value={line.accepted} onChange={(event) => updateLine(item.id, "accepted", event.target.value)} /></td>
                          <td><input type="number" min="0" step="any" className="sila-input ops-cell-input" aria-label={`Damaged quantity for ${label}`} value={line.damaged} onChange={(event) => updateLine(item.id, "damaged", event.target.value)} /></td>
                          <td><input type="number" min="0" step="any" className="sila-input ops-cell-input" aria-label={`Rejected quantity for ${label}`} value={line.rejected} onChange={(event) => updateLine(item.id, "rejected", event.target.value)} /></td>
                          <td><input className="sila-input ops-cell-input" aria-label={`Batch number for ${label}`} value={line.batchNumber} onChange={(event) => updateLine(item.id, "batchNumber", event.target.value)} /></td>
                          <td><input type="date" className="sila-input ops-cell-input" aria-label={`Expiry date for ${label}`} value={line.expiryDate} onChange={(event) => updateLine(item.id, "expiryDate", event.target.value)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {validation && (
              <div className={`sila-alert ${validation.valid ? "sila-alert--success" : "sila-alert--danger"}`} role="status">
                <div>
                  <div className="sila-alert-title">{validation.valid ? "Validation passed" : "Validation failed"}</div>
                  {validation.errors.map((message) => <div key={`e-${message}`}>{message}</div>)}
                  {validation.warnings.map((message) => <div key={`w-${message}`}>Warning: {message}</div>)}
                </div>
              </div>
            )}
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={onCancel} disabled={busy !== null}>Cancel</button>
            <button type="button" className="sila-btn sila-btn--secondary" onClick={handleValidate} disabled={busy !== null || receivableItems.length === 0}>
              {busy === "validate" ? "Validating..." : "Validate"}
            </button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={busy !== null || receivableItems.length === 0}>
              {busy === "post" ? "Posting..." : "Post goods receipt"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GoodsReceiptForm;
