import React from "react";
import { StatusBadge } from "@vosox/shared-ui";
import { IconCalendar } from "./icons";

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
    <section className="sad-panel">
      <div className="sad-panel-header">
        <div>
          <h2 className="sad-panel-title">Recent Purchase Orders</h2>
          <div className="sad-panel-subtitle">Supplier orders requiring attention</div>
        </div>
        <a className="sad-panel-link" href="#" onClick={(e) => e.preventDefault()}>View All →</a>
      </div>
      <div className="sad-panel-list">
        {poItems.map((po) => (
          <div className="sad-po-row" key={po.code}>
            <div className="sad-po-info">
              <div className="sad-po-meta">
                <span className="sad-po-code sila-ref">{po.code}</span>
                <StatusBadge status={po.status} size="sm" />
              </div>
              <div className="sad-po-company">{po.company}</div>
              <div className="sad-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
            </div>
            <div className="sad-po-right">
              <div className="sad-po-amount">{po.amount}</div>
              <a className="sad-po-process" href="#" onClick={(e) => e.preventDefault()}>Process →</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentPurchaseOrdersCard;
