import React from "react";
import "./QuotationComparisonCard.css";
import type { SupplierQuotationComparisonResponse } from "../api/networkAdminApi";

interface QuotationComparisonCardProps {
  quotations: SupplierQuotationComparisonResponse[];
  supplierNames: string[];
  rfqTitle?: string;
}

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const calcGrandTotal = (
  subtotal: number,
  tax: number,
  delivery: number | undefined,
  discount: number
) => subtotal + tax + (delivery || 0) - discount;

const QuotationComparisonCard: React.FC<QuotationComparisonCardProps> = ({
  quotations,
  supplierNames,
  rfqTitle,
}) => {
  const handleDownloadExcel = () => {
    // Placeholder for Excel download functionality
    console.log("Download Excel clicked");
  };

  const getSupplierName = (index: number) => supplierNames[index] || `Supplier ${index + 1}`;

  if (!quotations || quotations.length === 0) {
    return (
      <div className="qcc-container">
        <div className="qcc-header-section">
          <div className="qcc-header-top">
            <div className="qcc-header-info">
              {rfqTitle && <div className="qcc-company-name">{rfqTitle}</div>}
            </div>
          </div>
        </div>
        <div className="qcc-empty-state">No quotation data available.</div>
      </div>
    );
  }

  const rowCount = Math.max(0, ...quotations.map((q) => q.items?.length ?? 0));
  const supplierValueColumnCount = quotations.length * 2;

  return (
    <div className="qcc-container">
      <div className="qcc-header-section">
        <div className="qcc-header-top">
          <div className="qcc-header-info">
            {rfqTitle && <div className="qcc-company-name">{rfqTitle}</div>}
          </div>
          <button className="qcc-btn qcc-btn-download" onClick={handleDownloadExcel}>
            <IconDownload /> Download Excel
          </button>
        </div>
      </div>

      <div className="qcc-table-wrapper">
        <table className="qcc-comparison-table">
          <thead>
            <tr>
              <th scope="row" colSpan={3} className="qcc-row-label">Bidder</th>
              {quotations.map((q, index) => (
                <td key={q.supplierQuotationId || index} colSpan={2} className="qcc-spanned-cell qcc-bidder-name">
                  {getSupplierName(index)}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row" colSpan={3} className="qcc-row-label">Currency</th>
              {quotations.map((q, index) => (
                <td key={q.supplierQuotationId || index} colSpan={2} className="qcc-spanned-cell">
                  INR
                </td>
              ))}
            </tr>

            <tr>
              <th scope="col" className="qcc-col-sno qcc-fixed-col">S. No.</th>
              <th scope="col" className="qcc-col-description qcc-fixed-col">Description</th>
              <th scope="col" className="qcc-col-qty qcc-fixed-col">Qty</th>
              {quotations.map((q, index) => (
                <React.Fragment key={q.supplierQuotationId || index}>
                  <th scope="col" className="qcc-col-quoted">Quoted</th>
                  <th scope="col" className="qcc-col-negotiated">Negotiated</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
          
            {rowCount > 0 ? (
              Array.from({ length: rowCount }).map((_, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 1 ? "qcc-row-striped" : undefined}>
                  <td className="qcc-col-sno qcc-fixed-col">{rowIndex + 1}</td>
                  <td className="qcc-col-description qcc-fixed-col">Line item - {rowIndex + 1}</td>
                  <td className="qcc-col-qty qcc-fixed-col">—</td>
                  {quotations.map((q, supplierIndex) => {
                    const item = q.items?.[rowIndex];
                    return (
                      <React.Fragment key={q.supplierQuotationId || supplierIndex}>
                        <td className="qcc-col-quoted">{item ? formatCurrency(item.oldQuotedPrice) : "—"}</td>
                        <td className="qcc-col-negotiated">{item ? formatCurrency(item.latestQuotedPrice) : "—"}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3 + supplierValueColumnCount} className="qcc-no-data">
                  No line items found.
                </td>
              </tr>
            )}

            <tr className="qcc-totals-row">
              <th scope="row" colSpan={3} className="qcc-row-label">Subtotal</th>
              {quotations.map((q, index) => (
                <React.Fragment key={q.supplierQuotationId || index}>
                  <td className="qcc-col-quoted">{formatCurrency(q.oldTotalPrice)}</td>
                  <td className="qcc-col-negotiated">{formatCurrency(q.latestTotalPrice)}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr className="qcc-totals-row">
              <th scope="row" colSpan={3} className="qcc-row-label">Tax</th>
              {quotations.map((q, index) => (
                <React.Fragment key={q.supplierQuotationId || index}>
                  <td className="qcc-col-quoted">{formatCurrency(q.oldTax)}</td>
                  <td className="qcc-col-negotiated">{formatCurrency(q.latestTax)}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr className="qcc-totals-row">
              <th scope="row" colSpan={3} className="qcc-row-label">Delivery</th>
              {quotations.map((q, index) => (
                <React.Fragment key={q.supplierQuotationId || index}>
                  <td className="qcc-col-quoted">{formatCurrency(q.oldDeliveryCharge || 0)}</td>
                  <td className="qcc-col-negotiated">{formatCurrency(q.latestDeliveryCharge || 0)}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr className="qcc-totals-row">
              <th scope="row" colSpan={3} className="qcc-row-label">Discount</th>
              {quotations.map((q, index) => (
                <React.Fragment key={q.supplierQuotationId || index}>
                  <td className="qcc-col-quoted qcc-discount">-{formatCurrency(q.oldDiscount)}</td>
                  <td className="qcc-col-negotiated qcc-discount">-{formatCurrency(q.latestDiscount)}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr className="qcc-grand-total-row">
              <th scope="row" colSpan={3} className="qcc-row-label">Grand Total</th>
              {quotations.map((q, index) => (
                <React.Fragment key={q.supplierQuotationId || index}>
                  <td className="qcc-col-quoted qcc-grand-total">
                    {formatCurrency(calcGrandTotal(q.oldTotalPrice, q.oldTax, q.oldDeliveryCharge, q.oldDiscount))}
                  </td>
                  <td className="qcc-col-negotiated qcc-grand-total">
                    {formatCurrency(calcGrandTotal(q.latestTotalPrice, q.latestTax, q.latestDeliveryCharge, q.latestDiscount))}
                  </td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationComparisonCard;
