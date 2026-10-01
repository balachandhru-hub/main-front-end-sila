import React, { useCallback, useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader } from "@vosox/shared-ui";
import {
  getOrganizationUnits,
  getPurchaseOrder,
  searchPurchaseOrders,
  type GoodsReceipt,
  type OperationsPurchaseOrder,
  type OrganizationUnit,
} from "../../api/operationsApi";
import GoodsReceiptDetail from "./GoodsReceiptDetail";
import GoodsReceiptForm from "./GoodsReceiptForm";
import { errorMessage, formatDate, formatDateTime, formatMoney, formatNumber, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

type View =
  | { name: "list" }
  | { name: "detail"; order: OperationsPurchaseOrder }
  | { name: "receive"; order: OperationsPurchaseOrder }
  | { name: "receipt"; order: OperationsPurchaseOrder; receipt: GoodsReceipt };

interface Filters {
  query: string;
  entityCode: string;
  operatingUnitId: string;
  openOnly: boolean;
}

const EMPTY_FILTERS: Filters = { query: "", entityCode: "", operatingUnitId: "", openOnly: false };

const yesNo = (value?: boolean): string => (value === undefined ? "—" : value ? "Yes" : "No");

/** Purchase orders held by the receiving service: search, then open one to see its lines. */
const OperationsPurchaseOrders: React.FC = () => {
  const [view, setView] = useState<View>({ name: "list" });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<OperationsPurchaseOrder[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (criteria: Filters) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await searchPurchaseOrders(criteria));
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load purchase orders."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied);
  }, [load, applied]);

  // The unit filter is optional; the list still works when units cannot be loaded.
  useEffect(() => {
    getOrganizationUnits().then(setUnits).catch(() => setUnits([]));
  }, []);

  const openOrder = async (order: OperationsPurchaseOrder) => {
    setOpening(true);
    setError(null);
    try {
      setView({ name: "detail", order: await getPurchaseOrder(order.poNumber, order.entityCode) });
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the purchase order."));
    } finally {
      setOpening(false);
    }
  };

  if (view.name === "receive") {
    return (
      <GoodsReceiptForm
        purchaseOrderId={view.order.id}
        onCancel={() => setView({ name: "detail", order: view.order })}
        onPosted={(receipt) => setView({ name: "receipt", order: view.order, receipt })}
      />
    );
  }

  if (view.name === "receipt") {
    return <GoodsReceiptDetail goodsReceiptId={view.receipt.id} onBack={() => openOrder(view.order)} />;
  }

  if (view.name === "detail") {
    const order = view.order;
    const receivable = order.status === "OPEN" || order.status === "PARTIALLY_RECEIVED";
    return (
      <div className="ops-section">
        <PageHeader
          className="pud-page-header"
          title={order.poNumber}
          description={`${order.supplierName}${order.entityCode ? ` · ${order.entityCode}` : ""}`}
          meta={<span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>}
          onBack={() => setView({ name: "list" })}
          backLabel="Back to purchase orders"
          actions={receivable ? (
            <button type="button" className="sila-btn sila-btn--primary" onClick={() => setView({ name: "receive", order })}>
              Receive goods
            </button>
          ) : undefined}
        />

        <section className="sila-card">
          <div className="sila-card-header">
            <h2 className="sila-card-title">Order details</h2>
          </div>
          <div className="sila-card-body">
            <dl className="sila-meta-grid">
              <div className="sila-meta-item"><dt className="sila-meta-label">Supplier</dt><dd className="sila-meta-value">{order.supplierName}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">ERP supplier</dt><dd className="sila-meta-value">{order.erpSupplierId || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Entity</dt><dd className="sila-meta-value">{order.entityCode || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Company code</dt><dd className="sila-meta-value">{order.companyCode || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Order type</dt><dd className="sila-meta-value">{order.purchaseOrderType || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Purchasing organization</dt><dd className="sila-meta-value">{order.purchasingOrganization || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Purchasing group</dt><dd className="sila-meta-value">{order.purchasingGroup || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Payment terms</dt><dd className="sila-meta-value">{order.paymentTerms || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Order date</dt><dd className="sila-meta-value">{formatDate(order.poDate)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Expected delivery</dt><dd className="sila-meta-value">{formatDate(order.deliveryDate)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Net amount</dt><dd className="sila-meta-value">{formatMoney(order.totalNetAmount, order.currency)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Tax amount</dt><dd className="sila-meta-value">{formatMoney(order.totalTaxAmount, order.currency)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Total</dt><dd className="sila-meta-value">{formatMoney(order.totalAmount, order.currency)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Ordered / received</dt><dd className="sila-meta-value">{formatNumber(order.totalOrderedQuantity)} / {formatNumber(order.totalReceivedQuantity)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Operating unit</dt><dd className="sila-meta-value">{order.operatingUnitName || "All units"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Source</dt><dd className="sila-meta-value">{order.sourceSystem || "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Last synced</dt><dd className="sila-meta-value">{formatDateTime(order.lastSyncedAt)}</dd></div>
            </dl>
          </div>
        </section>

        <section className="sila-card">
          <div className="sila-card-header">
            <h2 className="sila-card-title">Items</h2>
            <span className="ops-muted">{order.items.length} lines</span>
          </div>
          {order.items.length === 0 ? (
            <EmptyState title="No lines" description="This purchase order has no line items." />
          ) : (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Line</th>
                    <th scope="col">Item</th>
                    <th scope="col" className="ops-num">Ordered</th>
                    <th scope="col" className="ops-num">Received</th>
                    <th scope="col" className="ops-num">Open</th>
                    <th scope="col" className="ops-num">Unit price</th>
                    <th scope="col" className="ops-num">Amount</th>
                    <th scope="col">Plant / storage</th>
                    <th scope="col">GR expected</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.itemNumber || item.lineNumber}</td>
                      <td>
                        <span className="sila-cell-strong">{item.materialCode}</span>
                        <div className="sila-help">{item.description}</div>
                      </td>
                      <td className="ops-num">{formatNumber(item.orderedQuantity)} {item.uom}</td>
                      <td className="ops-num">{formatNumber(item.receivedQuantity)} {item.uom}</td>
                      <td className="ops-num">{formatNumber(item.openQuantity)} {item.uom}</td>
                      <td className="ops-num">{formatMoney(item.unitPrice, item.currency ?? order.currency)}</td>
                      <td className="ops-num">{formatMoney(item.itemAmount, item.currency ?? order.currency)}</td>
                      <td>{[item.plant, item.storageLocation].filter(Boolean).join(" / ") || "—"}</td>
                      <td>{yesNo(item.goodsReceiptExpected)}</td>
                      <td><span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setApplied(filters);
  };

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Purchase orders"
        description="Orders synchronized from the ERP or imported by spreadsheet, with ordered, received and open quantities."
      />
      <section className="sila-card">
        <form className="sila-toolbar" onSubmit={handleSearch}>
          <div className="sila-toolbar-group">
            <label className="sila-visually-hidden" htmlFor="po-search">Search purchase orders</label>
            <input id="po-search" className="sila-input" placeholder="PO number or supplier" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} />
            <label className="sila-visually-hidden" htmlFor="po-entity">Entity code</label>
            <input id="po-entity" className="sila-input" placeholder="Entity code" value={filters.entityCode} onChange={(event) => setFilters((current) => ({ ...current, entityCode: event.target.value }))} />
            <label className="sila-visually-hidden" htmlFor="po-unit">Operating unit</label>
            <select id="po-unit" className="sila-select" value={filters.operatingUnitId} onChange={(event) => setFilters((current) => ({ ...current, operatingUnitId: event.target.value }))}>
              <option value="">All operating units</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
            <label className="ops-check">
              <input type="checkbox" checked={filters.openOnly} onChange={(event) => setFilters((current) => ({ ...current, openOnly: event.target.checked }))} />
              Open to receive only
            </label>
          </div>
          <button type="submit" className="sila-btn sila-btn--primary sila-btn--sm" disabled={loading}>Search</button>
        </form>
        {loading || opening ? (
          <Loader size={24} message={opening ? "Opening purchase order..." : "Loading purchase orders..."} />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn't load purchase orders"
            description={error}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={() => load(applied)}>Try again</button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="No purchase orders found" description="Orders pulled by an integration or imported by spreadsheet show up here." />
        ) : (
          <>
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">PO number</th>
                    <th scope="col">Entity</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Order date</th>
                    <th scope="col">Expected delivery</th>
                    <th scope="col" className="ops-num">Total</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="sila-row-clickable"
                      tabIndex={0}
                      onClick={() => openOrder(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openOrder(row);
                        }
                      }}
                    >
                      <td>
                        <span className="sila-cell-strong">{row.poNumber}</span>
                        <div className="sila-help">{row.items.length} line items</div>
                      </td>
                      <td>{row.entityCode || "—"}</td>
                      <td>{row.supplierName}</td>
                      <td>{formatDate(row.poDate)}</td>
                      <td>{formatDate(row.deliveryDate)}</td>
                      <td className="ops-num">{formatMoney(row.totalAmount, row.currency)}</td>
                      <td><span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sila-card-footer">
              <span className="sila-help">The search returns the 50 most recent matching orders. Narrow the search to find older ones.</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default OperationsPurchaseOrders;
