import React, { useEffect, useState } from "react";
import "./QuotationComparisonCard.css";
import { getBidComparisonData, isBidComparisonError } from "../api/platformApi";
import type {
  BidComparisonResponseDto,
  BidQuotationItemDto,
  BidQuotationVersionDto,
  BidRfqItemDto,
  BidSupplierQuotationDto,
} from "../api/platformApi";

interface QuotationComparisonCardProps {
  rfqId: string | undefined;
  rfqTitle?: string;
}

/* ---------------------------------- Formatting helpers ---------------------------------- */

const formatMoney = (value: number | null | undefined): string =>
  value === null || value === undefined || Number.isNaN(value) ? "—" : `${value}`;

const formatLineNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${value}`;

// Tax/Discount/Delivery Charge can each be quoted either as a percentage or a flat amount.
const formatTypedValue = (
  value: number | null | undefined,
  type: string | null | undefined
): string => {
  if (value === null || value === undefined) return "—";
  return type === "PERCENTAGE" ? `${value}%` : `${value}`;
};

const formatTypedDiscount = (
  value: number | null | undefined,
  type: string | null | undefined
): string => {
  if (value === null || value === undefined) return "—";
  return type === "PERCENTAGE" ? `-${value}%` : `-${value}`;
};

const calcGrandTotal = (version: BidQuotationVersionDto | undefined): number | null => {
  if (!version) return null;
  return (version.totalPrice || 0) + (version.tax || 0) + (version.deliveryCharge || 0) - (version.discount || 0);
};

// Joins an RFQ line item back to the line-level quotation values a supplier submitted for it.
const getVersionItem = (
  version: BidQuotationVersionDto | undefined,
  rfqItem: BidRfqItemDto
): BidQuotationItemDto | undefined =>
  (version?.items || []).find((item) => item.buyerRFQItemId === rfqItem.id);

// For line-wise bids (addLotOption === false) the backend has been seen to return an empty
// rfqItems array even though suppliers submitted per-line quotations. Fall back to deriving
// the row list from the union of buyerRFQItemIds quoted across all suppliers/versions, so the
// table still renders instead of showing "No line items found" with real quotation data present.
const deriveRfqItemsFromSuppliers = (suppliers: BidSupplierQuotationDto[]): BidRfqItemDto[] => {
  const byId = new Map<string, BidRfqItemDto>();

  suppliers.forEach((supplier) => {
    [supplier.firstVersion, supplier.latestVersion].forEach((version) => {
      (version?.items || []).forEach((item) => {
        if (!item.buyerRFQItemId || byId.has(item.buyerRFQItemId)) return;
        const lineNumber = item.lineNumber ?? byId.size + 1;
        byId.set(item.buyerRFQItemId, {
          id: item.buyerRFQItemId,
          description: `Line Item ${lineNumber}`,
          quantity: 0,
          uom: "",
          materialCode: "",
          materialGroup: "",
          costCenter: "",
          lineNumber,
        });
      });
    });
  });

  return Array.from(byId.values()).sort((a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0));
};

/* ---------------------------------- Component ---------------------------------- */

const QuotationComparisonCard: React.FC<QuotationComparisonCardProps> = ({ rfqId, rfqTitle }) => {
  const [data, setData] = useState<BidComparisonResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!rfqId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpandedRows(new Set());

    getBidComparisonData(rfqId)
      .then((response) => {
        if (cancelled) return;
        if (isBidComparisonError(response)) {
          setError(response.message || response.description || "Failed to load bid comparison data.");
        } else {
          setData(response);
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || "Failed to load bid comparison data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rfqId]);

  const toggleRowExpanded = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="qcc-container">
        <div className="qcc-state qcc-loading-state">
          <div className="qcc-spinner" />
          <span>Loading bid comparison data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qcc-container">
        <div className="qcc-state qcc-error-state">{error}</div>
      </div>
    );
  }

  const suppliers: BidSupplierQuotationDto[] = data?.suppliers || [];
  const rfqItems: BidRfqItemDto[] =
    data?.rfqItems && data.rfqItems.length > 0 ? data.rfqItems : deriveRfqItemsFromSuppliers(suppliers);

  if (!data || suppliers.length === 0) {
    return (
      <div className="qcc-container">
        <div className="qcc-section-title">{rfqTitle || "Bid Comparison"}</div>
        <div className="qcc-state qcc-empty-state">No bid comparison data available.</div>
      </div>
    );
  }

  // Line-wise bidding (addLotOption === false) surfaces a per-supplier line number (LL)
  // next to Rate/Amount, since a supplier's own line ordering can differ from the RFQ's.
  const showLLColumn = data.addLotOption === false;
  const fvLvColSpan = showLLColumn ? 3 : 2;
  const supplierGroupColSpan = fvLvColSpan * 2;
  const BASE_COLUMN_COUNT = 5; // Expand, Material Info, LN, Code, Qty

  const getSupplierName = (supplier: BidSupplierQuotationDto, index: number) =>
    supplier.supplierName || `Supplier ${index + 1}`;

  return (
    <div className="qcc-container">
      <div className="qcc-section-title">{rfqTitle || `RFQ ${data.rfqNumber}`}</div>

      <div className="qcc-table-container">
        <table className="qcc-items-table">
          <thead>
            <tr>
              <th colSpan={BASE_COLUMN_COUNT} className="qcc-supplier-name-label">Supplier Name</th>
              {suppliers.map((supplier, index) => (
                <th key={supplier.supplierId || index} colSpan={supplierGroupColSpan} className="qcc-supplier-group-header">
                  <div className="qcc-supplier-group-name">{getSupplierName(supplier, index)}</div>
                </th>
              ))}
            </tr>
            <tr>
              <th className="qcc-expand-header"></th>
              <th>Material Info</th>
              <th className="qcc-align-right">LN</th>
              <th>Code</th>
              <th className="qcc-align-right">Qty</th>
              {suppliers.map((supplier, index) => (
                <React.Fragment key={supplier.supplierId || index}>
                  <th className="qcc-sub-header">Rate (FV)</th>
                  <th className="qcc-sub-header">Amount (FV)</th>
                  {showLLColumn && <th className="qcc-sub-header">LL (FV)</th>}
                  <th className="qcc-sub-header">Rate (LV)</th>
                  <th className="qcc-sub-header">Amount (LV)</th>
                  {showLLColumn && <th className="qcc-sub-header">LL (LV)</th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rfqItems.length > 0 ? (
              rfqItems.map((rfqItem, idx) => {
                const rowKey = rfqItem.id || `${idx}`;
                const isExpanded = expandedRows.has(rowKey);

                return (
                  <React.Fragment key={rowKey}>
                    <tr>
                      <td className="qcc-expand-cell">
                        <button
                          type="button"
                          className="qcc-expand-toggle"
                          onClick={() => toggleRowExpanded(rowKey)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse item details" : "Expand item details"}
                        >
                          {isExpanded ? "-" : "+"}
                        </button>
                      </td>
                      <td>
                        <div className="qcc-material-name">{rfqItem.description}</div>
                        {rfqItem.costCenter && (
                          <div className="qcc-material-sub">Cost Center: {rfqItem.costCenter}</div>
                        )}
                      </td>
                      <td className="qcc-ll-cell">{rfqItem.lineNumber ?? idx + 1}</td>
                      <td>{rfqItem.materialCode || "N/A"}</td>
                      <td className="qcc-align-right">
                        {rfqItem.quantity ? (
                          <>
                            {rfqItem.quantity} <span>{rfqItem.uom}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      {suppliers.map((supplier, supplierIndex) => {
                        const fvItem = getVersionItem(supplier.firstVersion, rfqItem);
                        const lvItem = getVersionItem(supplier.latestVersion, rfqItem);
                        return (
                          <React.Fragment key={supplier.supplierId || supplierIndex}>
                            <td className="qcc-rate-cell">{formatMoney(fvItem?.quotedPrice)}</td>
                            <td className="qcc-amount-cell">{formatMoney(fvItem?.quotedAmount)}</td>
                            {showLLColumn && <td className="qcc-ll-cell">{formatLineNumber(fvItem?.lineNumber)}</td>}
                            <td className="qcc-rate-cell">{formatMoney(lvItem?.quotedPrice)}</td>
                            <td className="qcc-amount-cell">{formatMoney(lvItem?.quotedAmount)}</td>
                            {showLLColumn && <td className="qcc-ll-cell">{formatLineNumber(lvItem?.lineNumber)}</td>}
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {isExpanded && (
                      <tr className="qcc-expanded-row">
                        <td></td>
                        <td colSpan={BASE_COLUMN_COUNT - 1} className="qcc-expanded-label-cell">Item Details</td>
                        {suppliers.map((supplier, supplierIndex) => {
                          const fvItem = getVersionItem(supplier.firstVersion, rfqItem);
                          const lvItem = getVersionItem(supplier.latestVersion, rfqItem);
                          return (
                            <td key={supplier.supplierId || supplierIndex} colSpan={supplierGroupColSpan} className="qcc-expanded-detail-cell">
                              <div className="qcc-expanded-versions">
                                <div className="qcc-expanded-version">
                                  <div className="qcc-expanded-version-label">First Version</div>
                                  <div className="qcc-expanded-detail-grid">
                                    <span>Tax:</span>
                                    <span>{formatTypedValue(fvItem?.tax, fvItem?.taxType)}</span>
                                    <span>Discount:</span>
                                    <span className="qcc-discount">{formatTypedDiscount(fvItem?.discount, fvItem?.discountType)}</span>
                                    <span>Delivery Charge:</span>
                                    <span>{formatTypedValue(fvItem?.deliveryCharge, fvItem?.deliveryType)}</span>
                                    <span>Subtotal:</span>
                                    <span>{formatMoney(fvItem?.subTotal)}</span>
                                  </div>
                                </div>
                                <div className="qcc-expanded-version">
                                  <div className="qcc-expanded-version-label">Latest Version</div>
                                  <div className="qcc-expanded-detail-grid">
                                    <span>Tax:</span>
                                    <span>{formatTypedValue(lvItem?.tax, lvItem?.taxType)}</span>
                                    <span>Discount:</span>
                                    <span className="qcc-discount">{formatTypedDiscount(lvItem?.discount, lvItem?.discountType)}</span>
                                    <span>Delivery Charge:</span>
                                    <span>{formatTypedValue(lvItem?.deliveryCharge, lvItem?.deliveryType)}</span>
                                    <span>Subtotal:</span>
                                    <span>{formatMoney(lvItem?.subTotal)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={BASE_COLUMN_COUNT + suppliers.length * supplierGroupColSpan} className="qcc-no-data">
                  No line items found.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="qcc-grand-total-row">
              <td></td>
              <td>{data.addLotOption === true ? "FL" : ""}</td>
              <td></td>
              <td></td>
              <td></td>
              {suppliers.map((supplier, index) => (
                <td key={supplier.supplierId || index} colSpan={supplierGroupColSpan}>
                  <div className="qcc-grand-total-grid">
                    <span>Grand Total (FV):</span>
                    <span>{formatMoney(calcGrandTotal(supplier.firstVersion))}</span>
                    <span>Grand Total (LV):</span>
                    <span>{formatMoney(calcGrandTotal(supplier.latestVersion))}</span>
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default QuotationComparisonCard;
