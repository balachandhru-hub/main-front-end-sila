import React from "react";
import { CalendarIcon, StatusBadge } from "@vosox/shared-ui";
import { poItems } from "./mockData";

/** Dashboard panel listing recent purchase orders (placeholder data, see mockData). */
const RecentPurchaseOrdersPanel: React.FC = () => (
  <section className="pud-panel">
    <div className="pud-panel-header">
      <div>
        <h2 className="pud-panel-title">Recent Purchase Orders</h2>
        <div className="pud-panel-subtitle">New orders requiring attention</div>
      </div>
      <a className="pud-panel-link" href="#" onClick={(e) => e.preventDefault()}>View All →</a>
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
            <div className="pud-po-date"><CalendarIcon /> Order Date: {po.orderDate}</div>
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

export default RecentPurchaseOrdersPanel;
