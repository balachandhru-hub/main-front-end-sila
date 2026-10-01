import React, { useCallback, useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  getOperationsSuppliers,
  saveOperationsSupplier,
  type OperationsSupplier,
  type OperationsSupplierWrite,
  type SupplierSearch,
} from "../../api/operationsApi";
import { blank, errorMessage, formatDate, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface SupplierForm {
  supplierCode: string;
  name: string;
  searchName: string;
  businessPartnerId: string;
  legalName: string;
  taxNumber: string;
  trn: string;
  email: string;
  phone: string;
  entityCode: string;
  country: string;
  city: string;
  postalCode: string;
  street: string;
  currency: string;
  status: string;
  isBlocked: boolean;
  aliases: string;
}

const EMPTY_FORM: SupplierForm = {
  supplierCode: "", name: "", searchName: "", businessPartnerId: "", legalName: "", taxNumber: "", trn: "",
  email: "", phone: "", entityCode: "DEFAULT", country: "", city: "", postalCode: "", street: "", currency: "",
  status: "ACTIVE", isBlocked: false, aliases: "",
};

const EMPTY_SEARCH: Required<SupplierSearch> = { query: "", entityCode: "", status: "" };

const toForm = (supplier: OperationsSupplier): SupplierForm => ({
  supplierCode: supplier.supplierCode,
  name: supplier.name,
  searchName: supplier.searchName ?? "",
  businessPartnerId: supplier.businessPartnerId ?? "",
  legalName: supplier.legalName ?? "",
  taxNumber: supplier.taxNumber ?? "",
  trn: supplier.trn ?? "",
  email: supplier.email ?? "",
  phone: supplier.phone ?? "",
  entityCode: supplier.entityCode,
  country: supplier.country ?? "",
  city: supplier.city ?? "",
  postalCode: supplier.postalCode ?? "",
  street: supplier.street ?? "",
  currency: supplier.currency ?? "",
  status: supplier.status,
  isBlocked: supplier.isBlocked,
  aliases: supplier.aliases.join(", "),
});

const supplierState = (supplier: OperationsSupplier): string =>
  supplier.isBlocked || supplier.isDeleted ? "BLOCKED" : supplier.status;

/** Supplier master used by invoice matching, purchase orders and ERP receiving. */
const OperationsSuppliers: React.FC = () => {
  const [rows, setRows] = useState<OperationsSupplier[]>([]);
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [applied, setApplied] = useState(EMPTY_SEARCH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // null = list only; "new" = create form; otherwise the supplier being edited.
  const [editing, setEditing] = useState<OperationsSupplier | "new" | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);

  const load = useCallback(async (criteria: SupplierSearch) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getOperationsSuppliers(criteria));
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load suppliers."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied);
  }, [load, applied]);

  const setField = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (supplier: OperationsSupplier) => {
    setForm(toForm(supplier));
    setEditing(supplier);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!form.supplierCode.trim() || !form.name.trim()) {
      toastService.error("Enter a supplier code and a name.");
      return;
    }
    const existing = editing === "new" ? null : editing;
    const payload: OperationsSupplierWrite = {
      supplierCode: form.supplierCode.trim(),
      name: form.name.trim(),
      searchName: blank(form.searchName),
      businessPartnerId: blank(form.businessPartnerId),
      legalName: blank(form.legalName),
      taxNumber: blank(form.taxNumber),
      trn: blank(form.trn),
      email: blank(form.email),
      phone: blank(form.phone),
      entityCode: form.entityCode.trim() || "DEFAULT",
      country: blank(form.country),
      city: blank(form.city),
      postalCode: blank(form.postalCode),
      street: blank(form.street),
      currency: blank(form.currency),
      isBlocked: form.isBlocked,
      // Deletion is not offered here; a supplier keeps the flag it already has.
      isDeleted: existing?.isDeleted ?? false,
      status: form.status,
      aliases: form.aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      await saveOperationsSupplier(existing ? existing.id : null, payload);
      toastService.success(existing ? "Supplier updated." : "Supplier created.");
      setEditing(null);
      await load(applied);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not save the supplier."));
    } finally {
      setSaving(false);
    }
  };

  const textField = (key: Exclude<keyof SupplierForm, "isBlocked">, label: string, required = false) => (
    <div className="sila-field">
      <label className="sila-label" htmlFor={`ops-supplier-${key}`}>
        {label}{required && <span className="sila-required">*</span>}
      </label>
      <input id={`ops-supplier-${key}`} className="sila-input" value={form[key]} onChange={(event) => setField(key, event.target.value)} />
    </div>
  );

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Supplier master"
        description="The supplier identity used when invoices are matched and goods are received."
        actions={!editing ? (
          <button type="button" className="sila-btn sila-btn--primary" onClick={openCreate}>New supplier</button>
        ) : undefined}
      />

      {editing && (
        <form className="sila-card" onSubmit={handleSubmit}>
          <div className="sila-card-header">
            <h2 className="sila-card-title">{editing === "new" ? "New supplier" : `Edit ${editing.name}`}</h2>
          </div>
          <div className="sila-card-body">
            <div className="sila-form-grid">
              {textField("supplierCode", "Supplier code", true)}
              {textField("name", "Name", true)}
              {textField("legalName", "Legal name")}
              {textField("searchName", "Search name")}
              {textField("businessPartnerId", "Business partner ID")}
              {textField("entityCode", "Entity code")}
              {textField("taxNumber", "Tax number")}
              {textField("trn", "TRN")}
              {textField("email", "Email")}
              {textField("phone", "Phone")}
              {textField("street", "Street")}
              {textField("city", "City")}
              {textField("postalCode", "Postal code")}
              {textField("country", "Country")}
              {textField("currency", "Currency")}
              <div className="sila-field">
                <label className="sila-label" htmlFor="ops-supplier-status">Status</label>
                <select id="ops-supplier-status" className="sila-select" value={form.status} onChange={(event) => setField("status", event.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="ops-supplier-aliases">Aliases</label>
                <input id="ops-supplier-aliases" className="sila-input" value={form.aliases} onChange={(event) => setField("aliases", event.target.value)} />
                <span className="sila-help">
                  Other names this supplier prints on invoices, separated by commas. Saving adds new aliases; existing ones are kept.
                </span>
              </div>
              <div className="sila-field sila-field--full">
                <label className="ops-check">
                  <input type="checkbox" checked={form.isBlocked} onChange={(event) => setField("isBlocked", event.target.checked)} />
                  Blocked: cannot be matched to invoices or used for receiving
                </label>
              </div>
            </div>
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
              {saving ? "Saving..." : editing === "new" ? "Create supplier" : "Save supplier"}
            </button>
          </div>
        </form>
      )}

      <section className="sila-card">
        <form
          className="sila-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(search);
          }}
        >
          <div className="sila-toolbar-group">
            <label className="sila-visually-hidden" htmlFor="ops-supplier-search">Search suppliers</label>
            <input id="ops-supplier-search" className="sila-input" placeholder="Code, name, TRN or alias" value={search.query} onChange={(event) => setSearch((current) => ({ ...current, query: event.target.value }))} />
            <label className="sila-visually-hidden" htmlFor="ops-supplier-entity">Entity code</label>
            <input id="ops-supplier-entity" className="sila-input" placeholder="Entity code" value={search.entityCode} onChange={(event) => setSearch((current) => ({ ...current, entityCode: event.target.value }))} />
            <label className="sila-visually-hidden" htmlFor="ops-supplier-status-filter">Status</label>
            <select id="ops-supplier-status-filter" className="sila-select" value={search.status} onChange={(event) => setSearch((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <button type="submit" className="sila-btn sila-btn--primary sila-btn--sm" disabled={loading}>Search</button>
        </form>
        {loading ? (
          <Loader size={24} message="Loading suppliers..." />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn't load suppliers"
            description={error}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={() => load(applied)}>Try again</button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="No suppliers found" description="Add a supplier, or import suppliers from the Integrations screen." />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Supplier</th>
                  <th scope="col">Entity</th>
                  <th scope="col">TRN / tax number</th>
                  <th scope="col">Location</th>
                  <th scope="col">Aliases</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="sila-cell-strong">{row.name}</span>
                      <div className="sila-help">{row.supplierCode}</div>
                    </td>
                    <td>{row.entityCode}</td>
                    <td>{row.trn || row.taxNumber || "—"}</td>
                    <td>{[row.city, row.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="ops-break">{row.aliases.length > 0 ? row.aliases.join(", ") : "—"}</td>
                    <td>{row.sourceSystem || "—"}</td>
                    <td><span className={statusBadgeClass(supplierState(row))}>{statusLabel(supplierState(row))}</span></td>
                    <td>{formatDate(row.updatedAt)}</td>
                    <td>
                      <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    </td>
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

export default OperationsSuppliers;
