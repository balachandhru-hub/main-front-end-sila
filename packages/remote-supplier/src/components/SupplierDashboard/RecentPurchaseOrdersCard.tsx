import React from "react";
import { StatusBadge } from "@vosox/shared-ui";
import { IconCalendar, IconChevronRight } from "./icons";

// Placeholder purchase orders: the backend has no purchase-order entity yet.
interface POItem {
  code: string;
  status: "ACCEPTED" | "DELIVERED";
  company: string;
  orderDate: string;
  amount: string;
}

const poItems: POItem[] = [
  { code: "PO-2026-90412", status: "ACCEPTED", company: "Global Tech Solutions Inc.", orderDate: "2026-07-04", amount: "$18,500.00" },
  { code: "PO-2026-88401", status: "ACCEPTED", company: "Apex Partners", orderDate: "2026-05-22", amount: "$4,200.00" },
  { code: "PO-2026-80214", status: "DELIVERED", company: "ABC Manufacturing Inc.", orderDate: "2026-04-10", amount: "$9,800.00" },
];

const RecentPurchaseOrdersCard: React.FC = () => {
  return (
    <section className="sila-card pud-dash-card">
      <div className="sila-card-header">
        <div>
          <h2 className="sila-card-title">Recent Purchase Orders</h2>
          <p className="sila-card-subtitle">New orders requiring attention</p>
        </div>
        <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm pud-card-link">
          View all <IconChevronRight />
        </button>
      </div>
      <div className="pud-panel-list">
        {poItems.map((po) => (
          <div className="pud-po-row" key={po.code}>
            <div className="pud-po-info">
              <div className="pud-po-meta">
                <span className="pud-po-code sila-ref">{po.code}</span>
                <StatusBadge status={po.status} size="sm" />
              </div>
              <div className="pud-po-company">{po.company}</div>
              <div className="pud-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
            </div>
            <div className="pud-po-right">
              <div className="pud-po-amount">{po.amount}</div>
              <a className="pud-po-process" href="#" onClick={(e) => e.preventDefault()}>Process →</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentPurchaseOrdersCard;
