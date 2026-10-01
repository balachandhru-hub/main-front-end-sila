import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  UNIT_KINDS,
  createOrganizationUnit,
  getOrganizationUnits,
  type OrganizationUnit,
} from "../../api/operationsApi";
import { errorMessage, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface UnitForm {
  name: string;
  code: string;
  kind: string;
  parentUnitId: string;
}

const EMPTY_FORM: UnitForm = { name: "", code: "", kind: "STORE", parentUnitId: "" };

interface TreeRow {
  unit: OrganizationUnit;
  depth: number;
}

/** Units in tree order: each parent followed by its children. Units whose parent is not in the list sit at the top. */
const toTree = (units: OrganizationUnit[]): TreeRow[] => {
  const ids = new Set(units.map((unit) => unit.id));
  const byParent = new Map<string, OrganizationUnit[]>();
  units.forEach((unit) => {
    const parent = unit.parentUnitId && ids.has(unit.parentUnitId) ? unit.parentUnitId : "";
    byParent.set(parent, [...(byParent.get(parent) ?? []), unit]);
  });
  const rows: TreeRow[] = [];
  const visited = new Set<string>();
  const walk = (parent: string, depth: number) => {
    (byParent.get(parent) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((unit) => {
        if (visited.has(unit.id)) return;
        visited.add(unit.id);
        rows.push({ unit, depth });
        walk(unit.id, depth + 1);
      });
  };
  walk("", 0);
  return rows;
};

/** Organization units: the properties, hotels, outlets, kitchens and stores that receive goods. */
const OperationsUnits: React.FC = () => {
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUnits(await getOrganizationUnits());
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load organization units."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = <K extends keyof UnitForm>(key: K, value: UnitForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || form.code.trim().length < 2) {
      toastService.error("Enter a name and a code of at least two characters.");
      return;
    }
    setSaving(true);
    try {
      await createOrganizationUnit({
        name: form.name.trim(),
        code: form.code.trim(),
        kind: form.kind,
        parentUnitId: form.parentUnitId || null,
      });
      toastService.success("Organization unit created.");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not create the organization unit."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader size={24} message="Loading organization units..." />;
  if (error) {
    return (
      <EmptyState
        variant="error"
        title="Couldn't load organization units"
        description={error}
        action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
      />
    );
  }

  const tree = toTree(units);
  const parentName = (unit: OrganizationUnit): string =>
    units.find((candidate) => candidate.id === unit.parentUnitId)?.name ?? "—";

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Organization units"
        description="The properties, hotels, outlets, kitchens and stores of the organization. Invoices, purchase orders and goods receipts belong to a unit."
        actions={!showForm ? (
          <button type="button" className="sila-btn sila-btn--primary" onClick={() => setShowForm(true)}>New unit</button>
        ) : undefined}
      />

      {showForm && (
        <form className="sila-card" onSubmit={handleSubmit}>
          <div className="sila-card-body">
            <div className="sila-form-grid">
              <div className="sila-field">
                <label className="sila-label" htmlFor="unit-name">Name<span className="sila-required">*</span></label>
                <input id="unit-name" className="sila-input" value={form.name} onChange={(event) => setField("name", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="unit-code">Code<span className="sila-required">*</span></label>
                <input id="unit-code" className="sila-input" value={form.code} onChange={(event) => setField("code", event.target.value)} />
                <span className="sila-help">Saved in upper case. Must be unique in the organization.</span>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="unit-kind">Kind<span className="sila-required">*</span></label>
                <select id="unit-kind" className="sila-select" value={form.kind} onChange={(event) => setField("kind", event.target.value)}>
                  {UNIT_KINDS.map((kind) => <option key={kind} value={kind}>{statusLabel(kind)}</option>)}
                </select>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="unit-parent">Parent unit</label>
                <select id="unit-parent" className="sila-select" value={form.parentUnitId} onChange={(event) => setField("parentUnitId", event.target.value)}>
                  <option value="">None (top level)</option>
                  {tree.filter((row) => row.unit.status === "ACTIVE").map((row) => (
                    <option key={row.unit.id} value={row.unit.id}>
                      {"— ".repeat(row.depth)}{row.unit.name} ({statusLabel(row.unit.kind)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
              {saving ? "Saving..." : "Create unit"}
            </button>
          </div>
        </form>
      )}

      <section className="sila-card">
        {tree.length === 0 ? (
          <EmptyState title="No organization units yet" description="Add a property, outlet, kitchen or store to start routing receiving to it." />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Unit</th>
                  <th scope="col">Code</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Parent</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {tree.map(({ unit, depth }) => (
                  <tr key={unit.id}>
                    <td>
                      <span className="ops-tree-indent sila-cell-strong" style={{ "--ops-depth": depth } as React.CSSProperties}>
                        {unit.name}
                      </span>
                    </td>
                    <td>{unit.code}</td>
                    <td>{statusLabel(unit.kind)}</td>
                    <td>{parentName(unit)}</td>
                    <td><span className={statusBadgeClass(unit.status)}>{statusLabel(unit.status)}</span></td>
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

export default OperationsUnits;
