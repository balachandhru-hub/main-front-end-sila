import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import type { MasterApprovalFlowDto } from "../../api/Buyerapi";
import {
  createOutlet,
  getOutlets,
  getWishlistApprovalFlows,
  updateOutlet,
  type Outlet,
  type OutletWrite,
} from "../../api/wishlistApi";

interface OutletManagementProps {
  buyerId: string;
}

interface OutletForm {
  outletName: string;
  outletCode: string;
  masterApprovalFlowId: string;
}

const EMPTY_FORM: OutletForm = { outletName: "", outletCode: "", masterApprovalFlowId: "" };

const blank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/** Buyer administrator screen: the outlets of the organization and the approval flow each one uses. */
const OutletManagement: React.FC<OutletManagementProps> = ({ buyerId }) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [flows, setFlows] = useState<MasterApprovalFlowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // null = list only; "new" = create form; otherwise the outlet being edited.
  const [editing, setEditing] = useState<Outlet | "new" | null>(null);
  const [form, setForm] = useState<OutletForm>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [outletRows, flowRows] = await Promise.all([getOutlets(), getWishlistApprovalFlows(buyerId)]);
      setOutlets(outletRows);
      setFlows(flowRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load outlets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buyerId) load();
  }, [buyerId]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (outlet: Outlet) => {
    setForm({
      outletName: outlet.outletName,
      outletCode: outlet.outletCode ?? "",
      masterApprovalFlowId: outlet.masterApprovalFlowId ?? "",
    });
    setEditing(outlet);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!form.outletName.trim()) {
      toastService.error("Enter an outlet name.");
      return;
    }

    // Fields this form does not edit keep their saved values.
    const existing = editing === "new" ? null : editing;
    const payload: OutletWrite = {
      outletName: form.outletName.trim(),
      outletCode: blank(form.outletCode),
      description: existing?.description ?? null,
      externalShipTo: existing?.externalShipTo ?? null,
      addressLine1: existing?.addressLine1 ?? null,
      city: existing?.city ?? null,
      country: existing?.country ?? null,
      masterApprovalFlowId: form.masterApprovalFlowId || null,
    };

    setSaving(true);
    try {
      if (existing) {
        await updateOutlet(existing.id, payload);
        toastService.success("Outlet updated.");
      } else {
        await createOutlet(payload);
        toastService.success("Outlet created.");
      }
      setEditing(null);
      await load();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not save the outlet.");
    } finally {
      setSaving(false);
    }
  };

  if (!buyerId || loading) return <Loader size={24} message="Loading outlets..." />;
  if (error) return <EmptyState variant="error" title="Couldn't load outlets" description={error} />;

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title="Outlets"
        actions={!editing ? (
          <button type="button" className="sila-btn sila-btn--primary" onClick={openCreate}>
            New outlet
          </button>
        ) : undefined}
      />

      {editing && (
        <form className="sila-card" onSubmit={handleSubmit}>
          <div className="sila-card-body">
            <div className="sila-form-grid">
              <div className="sila-field">
                <label className="sila-label" htmlFor="outlet-name">Outlet name<span className="sila-required">*</span></label>
                <input id="outlet-name" className="sila-input" value={form.outletName} onChange={(event) => setForm((current) => ({ ...current, outletName: event.target.value }))} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="outlet-code">Outlet code</label>
                <input id="outlet-code" className="sila-input" value={form.outletCode} onChange={(event) => setForm((current) => ({ ...current, outletCode: event.target.value }))} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="outlet-flow">Wishlist approval flow</label>
                <select id="outlet-flow" className="sila-select" value={form.masterApprovalFlowId} onChange={(event) => setForm((current) => ({ ...current, masterApprovalFlowId: event.target.value }))}>
                  <option value="">No approval flow</option>
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.approvalName || flow.approvalCode}</option>
                  ))}
                </select>
                {flows.length === 0 && (
                  <span className="sila-help">Create an approval flow of type WISHLIST in Approval Management first.</span>
                )}
              </div>
            </div>
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
              {saving ? "Saving..." : editing === "new" ? "Create outlet" : "Save outlet"}
            </button>
          </div>
        </form>
      )}

      <section className="sila-card">
        {outlets.length === 0 ? (
          <EmptyState title="No outlets yet" description="Create an outlet and give it a wishlist approval flow." />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Outlet</th>
                  <th scope="col">Code</th>
                  <th scope="col">Wishlist approval flow</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((outlet) => (
                  <tr key={outlet.id}>
                    <td className="sila-cell-strong">{outlet.outletName}</td>
                    <td>{outlet.outletCode || "—"}</td>
                    <td>
                      {outlet.approvalName || (
                        <span className="sila-badge sila-badge--warning">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openEdit(outlet)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default OutletManagement;
