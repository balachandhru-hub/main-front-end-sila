import React, { useEffect, useRef, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  getGoodsReceipt,
  postGoodsReceipt,
  retryGoodsReceipt,
  validateGoodsReceipt,
  type GoodsReceipt,
  type GrnInput,
  type GrnValidation,
} from "../../api/operationsApi";
import { errorMessage, formatDate, formatDateTime, formatNumber, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface GoodsReceiptDetailProps {
  goodsReceiptId: string;
  onBack: () => void;
}

const RETRY_STATUSES = ["FAILED", "UNKNOWN"];
const POSTABLE_STATUSES = ["DRAFT", "READY_TO_POST"];

/** The receipt as the payload the validate and post calls expect. Needs the invoice it was created from. */
const toPayload = (receipt: GoodsReceipt): GrnInput | null => {
  if (!receipt.invoiceId) return null;
  return {
    invoiceId: receipt.invoiceId,
    purchaseOrderId: receipt.purchaseOrderId,
    operatingUnitId: receipt.operatingUnitId,
    receiptDate: receipt.receiptDate,
    lines: receipt.lines.map((line) => ({
      purchaseOrderItemId: line.purchaseOrderItemId,
      receivedQuantity: line.receivedQuantity,
      acceptedQuantity: line.acceptedQuantity,
      damagedQuantity: line.damagedQuantity,
      rejectedQuantity: line.rejectedQuantity,
      batchNumber: line.batchNumber ?? null,
      expiryDate: line.expiryDate ?? null,
    })),
  };
};

const GoodsReceiptDetail: React.FC<GoodsReceiptDetailProps> = ({ goodsReceiptId, onBack }) => {
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"validate" | "post" | "retry" | null>(null);
  const [validation, setValidation] = useState<GrnValidation | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReceipt(await getGoodsReceipt(goodsReceiptId));
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the goods receipt."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [goodsReceiptId]);

  if (loading) return <Loader size={24} message="Loading goods receipt..." />;
  if (error || !receipt) {
    return (
      <div className="ops-section">
        <PageHeader className="pud-page-header" title="Goods receipt" onBack={onBack} backLabel="Back to goods receipts" />
        <EmptyState
          variant="error"
          title="Couldn't load the goods receipt"
          description={error ?? "The goods receipt was not returned."}
          action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
        />
      </div>
    );
  }

  const payload = toPayload(receipt);
  const canPost = POSTABLE_STATUSES.includes(receipt.status) && payload !== null;
  const canRetry = RETRY_STATUSES.includes(receipt.status) || RETRY_STATUSES.includes(receipt.erpPostingStatus ?? "");

  const handleValidate = async () => {
    if (!payload) return;
    setBusy("validate");
    try {
      setValidation(await validateGoodsReceipt(payload));
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not validate the goods receipt."));
    } finally {
      setBusy(null);
    }
  };

  const handlePost = async () => {
    if (!payload) return;
    setBusy("post");
    try {
      setReceipt(await postGoodsReceipt(payload, idempotencyKey.current));
      setValidation(null);
      toastService.success("Goods receipt posted.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not post the goods receipt."));
    } finally {
      setBusy(null);
    }
  };

  const handleRetry = async () => {
    setBusy("retry");
    try {
      const updated = await retryGoodsReceipt(receipt.id);
      setReceipt(updated);
      toastService.success(`ERP posting is now ${statusLabel(updated.erpPostingStatus ?? updated.status).toLowerCase()}.`);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not retry the ERP posting."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title={receipt.grnNumber}
        description={`${receipt.supplierName} · received ${formatDate(receipt.receiptDate)}`}
        meta={<span className={statusBadgeClass(receipt.status)}>{statusLabel(receipt.status)}</span>}
        onBack={onBack}
        backLabel="Back to goods receipts"
        actions={(
          <div className="sila-btn-group">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={load} disabled={busy !== null}>Refresh</button>
            {canPost && (
              <>
                <button type="button" className="sila-btn sila-btn--secondary" onClick={handleValidate} disabled={busy !== null}>
                  {busy === "validate" ? "Validating..." : "Validate"}
                </button>
                <button type="button" className="sila-btn sila-btn--primary" onClick={handlePost} disabled={busy !== null}>
                  {busy === "post" ? "Posting..." : "Post goods receipt"}
                </button>
              </>
            )}
            {canRetry && (
              <button type="button" className="sila-btn sila-btn--primary" onClick={handleRetry} disabled={busy !== null}>
                {busy === "retry" ? "Retrying..." : "Retry ERP posting"}
              </button>
            )}
          </div>
        )}
      />

      {validation && (
        <div className={`sila-alert ${validation.valid ? "sila-alert--success" : "sila-alert--danger"}`} role="status">
          <div>
            <div className="sila-alert-title">{validation.valid ? "Validation passed" : "Validation failed"}</div>
            {validation.errors.map((message) => <div key={`e-${message}`}>{message}</div>)}
            {validation.warnings.map((message) => <div key={`w-${message}`}>Warning: {message}</div>)}
          </div>
        </div>
      )}

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Receipt details</h2>
        </div>
        <div className="sila-card-body">
          <dl className="sila-meta-grid">
            <div className="sila-meta-item"><dt className="sila-meta-label">Purchase order</dt><dd className="sila-meta-value">{receipt.purchaseOrderNumber}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Invoice</dt><dd className="sila-meta-value">{receipt.invoiceNumber || "Not linked"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Supplier</dt><dd className="sila-meta-value">{receipt.supplierName}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Operating unit</dt><dd className="sila-meta-value">{receipt.operatingUnitName}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Received</dt><dd className="sila-meta-value">{formatDateTime(receipt.receiptDate)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Posted</dt><dd className="sila-meta-value">{formatDateTime(receipt.postedAt)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">ERP posting</h2>
          <span className={statusBadgeClass(receipt.erpPostingStatus)}>{statusLabel(receipt.erpPostingStatus ?? "NOT_CONFIGURED")}</span>
        </div>
        <div className="sila-card-body ops-stack">
          <dl className="sila-meta-grid">
            <div className="sila-meta-item"><dt className="sila-meta-label">Material document</dt><dd className="sila-meta-value">{receipt.erpMaterialDocument || "—"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Document year</dt><dd className="sila-meta-value">{receipt.erpDocumentYear || "—"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Attempts</dt><dd className="sila-meta-value">{receipt.erpAttemptCount ?? 0}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Last attempt</dt><dd className="sila-meta-value">{formatDateTime(receipt.lastErpAttemptAt)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Business status</dt><dd className="sila-meta-value">{receipt.businessStatus ? statusLabel(receipt.businessStatus) : "—"}</dd></div>
          </dl>
          {receipt.failureMessage && (
            <div className="sila-alert sila-alert--danger" role="alert">
              <div>
                <div className="sila-alert-title">{receipt.failureCode || "Posting failed"}</div>
                <div className="ops-break">{receipt.failureMessage}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Received lines</h2>
          <span className="ops-muted">{receipt.lines.length} lines</span>
        </div>
        {receipt.lines.length === 0 ? (
          <EmptyState title="No receipt lines" description="This receipt has no recorded quantities." />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">PO line</th>
                  <th scope="col">Item</th>
                  <th scope="col" className="ops-num">Open before</th>
                  <th scope="col" className="ops-num">Invoiced</th>
                  <th scope="col" className="ops-num">Received</th>
                  <th scope="col" className="ops-num">Accepted</th>
                  <th scope="col" className="ops-num">Damaged</th>
                  <th scope="col" className="ops-num">Rejected</th>
                  <th scope="col">Batch</th>
                  <th scope="col">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.purchaseOrderLineNumber}</td>
                    <td>
                      <span className="sila-cell-strong">{line.materialCode}</span>
                      <div className="sila-help">{line.description}</div>
                    </td>
                    <td className="ops-num">{formatNumber(line.openQuantityBefore)} {line.uom}</td>
                    <td className="ops-num">{line.invoiceQuantity == null ? "—" : `${formatNumber(line.invoiceQuantity)} ${line.uom}`}</td>
                    <td className="ops-num sila-cell-strong">{formatNumber(line.receivedQuantity)} {line.uom}</td>
                    <td className="ops-num">{formatNumber(line.acceptedQuantity)}</td>
                    <td className="ops-num">{formatNumber(line.damagedQuantity)}</td>
                    <td className="ops-num">{formatNumber(line.rejectedQuantity)}</td>
                    <td>{line.batchNumber || "—"}</td>
                    <td>{formatDate(line.expiryDate)}</td>
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

export default GoodsReceiptDetail;
