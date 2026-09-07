import React from "react";
import "./QuotationComparisonCard.css";
import type { SupplierQuotationComparisonResponse } from "../api/networkAdminApi";

interface QuotationComparisonCardProps {
  quotation: SupplierQuotationComparisonResponse;
  rfqTitle?: string;
  rfqNumber?: string;
  supplierName?: string;
  contactPerson?: string;
}

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const QuotationComparisonCard: React.FC<QuotationComparisonCardProps> = ({
  quotation,
  supplierName = "Supplier Name",
}) => {
  const handleDownloadExcel = () => {
    // Placeholder for Excel download functionality
    console.log("Download Excel clicked");
  };

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="qcc-container">
      {/* Header Section */}
      <div className="qcc-header-section">
        <div className="qcc-header-top">
          <div className="qcc-header-info">
            <div>
              <div className="qcc-company-name">{supplierName}</div>
            </div>
          </div>
          <button className="qcc-btn qcc-btn-download" onClick={handleDownloadExcel}>
            <IconDownload /> Download Excel
          </button>
        </div>
      </div>

      {/* Details Section - Vertical Layout */}
      <div className="qcc-details-section">
        <div className="qcc-details-vertical">
          <div className="qcc-detail-row-vertical">
            <span className="qcc-detail-label">Bidder</span>
            <span className="qcc-detail-value">{supplierName}</span>
          </div>
          <div className="qcc-detail-row-vertical">
            <span className="qcc-detail-label">Currency</span>
            <span className="qcc-detail-value">INR</span>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="qcc-table-wrapper">
        <table className="qcc-comparison-table">
          <thead>
            <tr>
              <th className="qcc-col-sno">S. No.</th>
              <th className="qcc-col-description">Description</th>
              <th className="qcc-col-qty">Qty</th>
              <th colSpan={2} className="qcc-col-quoted">
                Quoted (R0)
              </th>
              <th colSpan={2} className="qcc-col-negotiated">
                Negotiated (R1)
              </th>
            </tr>
            <tr className="qcc-subheader">
              <th colSpan={3}></th>
              <th className="qcc-col-rate">Rate</th>
              <th className="qcc-col-amount">Amount</th>
              <th className="qcc-col-rate">Rate</th>
              <th className="qcc-col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items && quotation.items.length > 0 ? (
              quotation.items.map((item, index) => (
                <tr key={item.supplierQuotationItemId}>
                  <td className="qcc-col-sno">{index + 1}</td>
                  <td className="qcc-col-description">Line item - {index + 1}</td>
                  <td className="qcc-col-qty">—</td>
                  <td className="qcc-col-rate">{formatCurrency(item.oldQuotedPrice)}</td>
                  <td className="qcc-col-amount">{formatCurrency(item.oldQuotedPrice)}</td>
                  <td className="qcc-col-rate">{formatCurrency(item.latestQuotedPrice)}</td>
                  <td className="qcc-col-amount">{formatCurrency(item.latestQuotedPrice)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="qcc-no-data">
                  No line items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="qcc-totals-wrapper">
        <div className="qcc-bidder-header">{supplierName}</div>

        <table className="qcc-totals-table">
          <tbody>
            <tr>
              <td className="qcc-totals-label">Total Subtotal</td>
              <td className="qcc-totals-value">{formatCurrency(quotation.oldTotalPrice)}</td>
              <td className="qcc-totals-value">{formatCurrency(quotation.latestTotalPrice)}</td>
            </tr>
            <tr>
              <td className="qcc-totals-label">Total Tax Amount</td>
              <td className="qcc-totals-value">{formatCurrency(quotation.oldTax)}</td>
              <td className="qcc-totals-value">{formatCurrency(quotation.latestTax)}</td>
            </tr>
            <tr>
              <td className="qcc-totals-label">Total Delivery Charge</td>
              <td className="qcc-totals-value">{formatCurrency(quotation.oldDeliveryCharge || 0)}</td>
              <td className="qcc-totals-value">{formatCurrency(quotation.latestDeliveryCharge || 0)}</td>
            </tr>
            <tr>
              <td className="qcc-totals-label">Total Discount</td>
              <td className="qcc-totals-value qcc-discount">
                -{formatCurrency(quotation.oldDiscount)}
              </td>
              <td className="qcc-totals-value qcc-discount">
                -{formatCurrency(quotation.latestDiscount)}
              </td>
            </tr>
            <tr className="qcc-grand-total-row">
              <td className="qcc-totals-label">Grand Total</td>
              <td className="qcc-totals-value qcc-grand-total">
                {formatCurrency(
                  quotation.oldTotalPrice +
                    quotation.oldTax +
                    (quotation.oldDeliveryCharge || 0) -
                    quotation.oldDiscount
                )}
              </td>
              <td className="qcc-totals-value qcc-grand-total">
                {formatCurrency(
                  quotation.latestTotalPrice +
                    quotation.latestTax +
                    (quotation.latestDeliveryCharge || 0) -
                    quotation.latestDiscount
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationComparisonCard;