import React, { useState } from "react";
import "./QuotationSummaryTable.css";

/* ---------------------------------- RFQ Item Quotation Table Column Widths ---------------------------------- */

const RFQ_EXPAND_COL_WIDTH = 48;
const RFQ_MATERIAL_COL_WIDTH = 220;
const RFQ_LN_COL_WIDTH = 70;
const RFQ_CODE_COL_WIDTH = 120;
const RFQ_QTY_COL_WIDTH = 90;
const RFQ_RATE_COL_WIDTH = 90;
const RFQ_AMOUNT_COL_WIDTH = 100;
const RFQ_LL_COL_WIDTH = 70;

/* ---------------------------------- RFQ Item / Supplier Quotation Item Types ---------------------------------- */

export interface QuotationSummaryRfqItem {
  id?: string;
  description: string;
  quantity: number;
  uom: string;
  materialCode?: string;
  costCenter?: string;
}

export interface QuotationSummaryQuotationItem {
  // Joins back to rfq.items[].id — this is the RFQ item this quotation line was submitted for.
  supplierRFQItemId?: string;
  buyerRFQItemId?: string;
  quotedPrice?: number | null;
  quotedAmount?: number | null;
  subTotal?: number | null;
  tax?: number | null;
  taxType?: string | null;
  discount?: number | null;
  discountType?: string | null;
  deliveryCharge?: number | null;
  deliveryType?: string | null;
  lineNumber?: number | null;
}

export interface QuotationSummarySupplierQuotation {
  quotationId?: string | null;
  supplierName?: string | null;
  totalPrice?: number | null;
  isLead?: boolean;
  status?: string | null;
  supplierQuotationItems?: QuotationSummaryQuotationItem[] | null;
}

export interface QuotationSummaryRfq {
  items: QuotationSummaryRfqItem[];
  supplierQuotation?: QuotationSummarySupplierQuotation[] | null;
  addLotOption: boolean;
}

interface QuotationSummaryTableProps {
  rfq: QuotationSummaryRfq;
}

// Maps an RFQ item to the line-level quotation values a given supplier submitted for it.
// The join key is rfq.items[].id === supplierQuotationItems[].supplierRFQItemId.
// No array-index fallback is used, since supplierQuotationItems may be returned in a
// different order than rfq.items.
const getSupplierQuotationItem = (
  quotation: QuotationSummarySupplierQuotation,
  rfqItem: QuotationSummaryRfqItem
): QuotationSummaryQuotationItem | undefined => {
  if (!rfqItem.id) return undefined;
  return (quotation.supplierQuotationItems || []).find(
    (qi) => qi.buyerRFQItemId === rfqItem.id
  );
};

const formatMoney = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `$${value}`;

const formatLineNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${value}`;

// Tax/Discount/Delivery Charge can each be quoted either as a percentage or a flat
// amount (see taxType/discountType/deliveryType). Render accordingly.
const formatTypedValue = (value: number | null | undefined, type: string | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return type === "PERCENTAGE" ? `${value}%` : `$${value}`;
};

const formatTypedDiscount = (value: number | null | undefined, type: string | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return type === "PERCENTAGE" ? `-${value}%` : `-$${value}`;
};

/* ---------------------------------- Component ---------------------------------- */

const QuotationSummaryTable: React.FC<QuotationSummaryTableProps> = ({ rfq }) => {
  const [expandedRfqItems, setExpandedRfqItems] = useState<Set<string>>(new Set());

  const toggleRfqItemExpanded = (rowKey: string) => {
    setExpandedRfqItems((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  if (!rfq.items || rfq.items.length === 0) {
    return null;
  }

  const allSuppliers: QuotationSummarySupplierQuotation[] = rfq.supplierQuotation || [];
  const quotedSuppliers: QuotationSummarySupplierQuotation[] = allSuppliers.filter(
    (q) => q.quotationId || q.totalPrice !== null
  );
  const showSupplierColumns = quotedSuppliers.length > 0;
  const showLLColumn = rfq.addLotOption === false;
  const supplierGroupColSpan = showLLColumn ? 3 : 2;
  // Base columns: Expand, Material Info, LN, Code, Qty.
  const BASE_COLUMN_COUNT = 5;
  const quotedMinTableWidth = showSupplierColumns
    ? RFQ_EXPAND_COL_WIDTH + RFQ_MATERIAL_COL_WIDTH + RFQ_LN_COL_WIDTH + RFQ_CODE_COL_WIDTH + RFQ_QTY_COL_WIDTH +
      quotedSuppliers.length * (RFQ_RATE_COL_WIDTH + RFQ_AMOUNT_COL_WIDTH + (showLLColumn ? RFQ_LL_COL_WIDTH : 0))
    : undefined;

  const toColPercent = (px: number) =>
    `${(px / (quotedMinTableWidth as number)) * 100}%`;

  return (
    <div>
      <div className="qst-section-title" style={{ marginBottom: '10px' }}>Quotation Summary</div>
      <div className="qst-table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
        <table
          className="qst-items-table"
          style={showSupplierColumns ? { tableLayout: 'fixed', width: '100%', minWidth: quotedMinTableWidth } : undefined}
        >
          {showSupplierColumns && (
            <colgroup>
              <col style={{ width: toColPercent(RFQ_EXPAND_COL_WIDTH) }} />
              <col style={{ width: toColPercent(RFQ_MATERIAL_COL_WIDTH) }} />
              <col style={{ width: toColPercent(RFQ_LN_COL_WIDTH) }} />
              <col style={{ width: toColPercent(RFQ_CODE_COL_WIDTH) }} />
              <col style={{ width: toColPercent(RFQ_QTY_COL_WIDTH) }} />
              {quotedSuppliers.map((quote, sIdx) => (
                <React.Fragment key={`col-${quote.quotationId || sIdx}`}>
                  <col style={{ width: toColPercent(RFQ_RATE_COL_WIDTH) }} />
                  <col style={{ width: toColPercent(RFQ_AMOUNT_COL_WIDTH) }} />
                  {showLLColumn && <col style={{ width: toColPercent(RFQ_LL_COL_WIDTH) }} />}
                </React.Fragment>
              ))}
            </colgroup>
          )}
          <thead>
            {showSupplierColumns ? (
              <>
                <tr>
                  <th colSpan={BASE_COLUMN_COUNT} className="qst-supplier-name-label">Supplier Name</th>
                  {quotedSuppliers.map((quote, sIdx) => (
                    <th key={quote.quotationId || sIdx} colSpan={supplierGroupColSpan} className="qst-supplier-group-header">
                      <div className="qst-supplier-group-name">
                        {quote.supplierName || `Supplier ${sIdx + 1}`}
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="qst-expand-header"></th>
                  <th>Material Info</th>
                  <th className="qst-align-right">LN</th>
                  <th>Code</th>
                  <th className="qst-align-right">Qty</th>
                  {quotedSuppliers.map((quote, sIdx) => (
                    <React.Fragment key={quote.quotationId || sIdx}>
                      <th className="qst-sub-header">Rate</th>
                      <th className="qst-sub-header">Amount</th>
                      {showLLColumn && <th className="qst-sub-header">LL</th>}
                    </React.Fragment>
                  ))}
                </tr>
              </>
            ) : (
              <tr>
                <th>Material Info</th>
                <th className="qst-align-right">LN</th>
                <th>Code</th>
                <th className="qst-align-right">Qty</th>
              </tr>
            )}
          </thead>
          <tbody>
            {rfq.items.map((item, idx) => {
              const rowKey = item.id || `${idx}`;
              const isExpanded = expandedRfqItems.has(rowKey);

              return (
                <React.Fragment key={rowKey}>
                  <tr>
                    {showSupplierColumns && (
                      <td className="qst-expand-cell">
                        <button
                          type="button"
                          className="qst-expand-toggle"
                          onClick={() => toggleRfqItemExpanded(rowKey)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse item details" : "Expand item details"}
                        >
                          {isExpanded ? "-" : "+"}
                        </button>
                      </td>
                    )}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                      {item.costCenter && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Cost Center: {item.costCenter}
                        </div>
                      )}
                    </td>
                    <td className="qst-ll-cell">{idx + 1}</td>
                    <td>
                      <div>
                        {item.materialCode || "N/A"}
                      </div>
                    </td>
                    <td className="qst-align-right">
                      {item.quantity} <span>{item.uom}</span>
                    </td>
                    {showSupplierColumns && quotedSuppliers.map((quote, sIdx) => {
                      const matchedItem = getSupplierQuotationItem(quote, item);
                      return (
                        <React.Fragment key={quote.quotationId || sIdx}>
                          <td className="qst-rate-cell">{formatMoney(matchedItem?.quotedPrice)}</td>
                          <td className="qst-amount-cell">{formatMoney(matchedItem?.quotedAmount)}</td>
                          {showLLColumn && (
                            <td className="qst-ll-cell">{formatLineNumber(matchedItem?.lineNumber)}</td>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>

                  {isExpanded && showSupplierColumns && (
                    <tr className="qst-expanded-row">
                      <td></td>
                      <td colSpan={4} className="qst-expanded-label-cell">Item Details</td>
                      {quotedSuppliers.map((quote, sIdx) => {
                        const matchedItem = getSupplierQuotationItem(quote, item);
                        return (
                          <td key={quote.quotationId || sIdx} colSpan={supplierGroupColSpan} className="qst-expanded-detail-cell">
                            <div className="qst-expanded-detail-grid">
                              <span>Tax:</span>
                              <span>{formatTypedValue(matchedItem?.tax, matchedItem?.taxType)}</span>
                              <span>Discount:</span>
                              <span style={{ color: '#dc2626' }}>{formatTypedDiscount(matchedItem?.discount, matchedItem?.discountType)}</span>
                              <span>Delivery Charge:</span>
                              <span>{formatTypedValue(matchedItem?.deliveryCharge, matchedItem?.deliveryType)}</span>
                              <span>Subtotal:</span>
                              <span>{formatMoney(matchedItem?.subTotal)}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {showSupplierColumns && (
            <tfoot>
              <tr className="qst-total-quote-row">
                <td></td>
                <td>{rfq.addLotOption === true ? "FL" : ""}</td>
                <td></td>
                <td></td>
                <td></td>
                {quotedSuppliers.map((quote, sIdx) => (
                  <td key={quote.quotationId || sIdx} colSpan={supplierGroupColSpan}>
                    Total Quote: ${quote.totalPrice ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default QuotationSummaryTable;
