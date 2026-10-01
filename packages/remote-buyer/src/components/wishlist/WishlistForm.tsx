import React, { useEffect, useState } from "react";
import { Loader, PageHeader, toastService } from "@vosox/shared-ui";
import { getAllItemMasters, getMasterApprovalFlows, type ItemMasterDto, type MasterApprovalFlowDto } from "../../api/Buyerapi";
import {
  createOutlet,
  createWishlist,
  getOutlets,
  updateWishlist,
  type Outlet,
  type WishlistDetail,
  type WishlistWrite,
} from "../../api/wishlistApi";

interface LineDraft {
  key: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  unitPrice: string;
  currency: string;
}

interface WishlistFormProps {
  buyerId: string;
  wishlist?: WishlistDetail | null;
  onCancel: () => void;
  onSaved: () => void;
}

const blank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const dateInput = (value?: string | null): string => (value ? value.slice(0, 10) : "");

const newLine = (): LineDraft => ({
  key: `${Date.now()}-${Math.random()}`,
  materialId: "",
  materialCode: "",
  materialName: "",
  quantity: "1",
  unitPrice: "",
  currency: "",
});

const linesFromWishlist = (wishlist: WishlistDetail): LineDraft[] =>
  wishlist.items.map((item) => ({
    key: item.id,
    materialId: item.materialId,
    materialCode: item.materialCode,
    materialName: item.materialName,
    quantity: String(item.quantity),
    unitPrice: item.unitPrice == null ? "" : String(item.unitPrice),
    currency: item.currency ?? "",
  }));

const unwrapItems = (result: unknown): ItemMasterDto[] => {
  if (Array.isArray(result)) return result as ItemMasterDto[];
  if (result && typeof result === "object") {
    const record = result as { data?: unknown };
    if (Array.isArray(record.data)) return record.data as ItemMasterDto[];
    if (record.data && typeof record.data === "object") {
      const nested = record.data as { data?: unknown };
      if (Array.isArray(nested.data)) return nested.data as ItemMasterDto[];
    }
  }
  return [];
};

const WishlistForm: React.FC<WishlistFormProps> = ({ buyerId, wishlist, onCancel, onSaved }) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [flows, setFlows] = useState<MasterApprovalFlowDto[]>([]);
  const [materials, setMaterials] = useState<ItemMasterDto[]>([]);
  const [materialQuery, setMaterialQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outletName, setOutletName] = useState("");
  const [creatingOutlet, setCreatingOutlet] = useState(false);

  const [outletId, setOutletId] = useState(wishlist?.outletId ?? "");
  const [wishlistName, setWishlistName] = useState(wishlist?.wishlistName ?? "");
  const [description, setDescription] = useState(wishlist?.description ?? "");
  const [supplierName, setSupplierName] = useState(wishlist?.supplierName ?? "");
  const [approvalFlowId, setApprovalFlowId] = useState(wishlist?.masterApprovalFlowId ?? "");
  const [currency, setCurrency] = useState(wishlist?.currency ?? "");
  const [deliveryInstruction, setDeliveryInstruction] = useState(wishlist?.deliveryInstruction ?? "");
  const [requiredDate, setRequiredDate] = useState(dateInput(wishlist?.requiredDate));
  const [lines, setLines] = useState<LineDraft[]>(wishlist ? linesFromWishlist(wishlist) : [newLine()]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [outletRows, flowRows] = await Promise.all([
          getOutlets(),
          loadWishlistFlows(buyerId),
        ]);
        if (!active) return;
        setOutlets(outletRows);
        setFlows(flowRows);
        if (!wishlist && outletRows[0]) {
          setOutletId((current) => current || outletRows[0].id);
        }
      } catch (err: unknown) {
        if (active) toastService.error(err instanceof Error ? err.message : "Could not load wishlist form.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [buyerId, wishlist]);

  useEffect(() => {
    if (!buyerId) return;
    let active = true;
    const handle = window.setTimeout(async () => {
      try {
        const result = await getAllItemMasters(buyerId, 0, 10, materialQuery.trim() || undefined);
        if (active) setMaterials(unwrapItems(result));
      } catch {
        if (active) setMaterials([]);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [buyerId, materialQuery]);

  const addMaterial = (material: ItemMasterDto) => {
    setLines((current) => {
      if (current.some((line) => line.materialId === material.id)) return current;
      const empty = current.find((line) => !line.materialId);
      const next: LineDraft = {
        key: empty?.key ?? `${material.id}-${Date.now()}`,
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.description,
        quantity: empty?.quantity || "1",
        unitPrice: empty?.unitPrice ?? "",
        currency: empty?.currency || currency,
      };
      if (empty) return current.map((line) => (line.key === empty.key ? next : line));
      return [...current, next];
    });
  };

  const handleCreateOutlet = async () => {
    if (!outletName.trim()) {
      toastService.error("Enter an outlet name.");
      return;
    }
    setCreatingOutlet(true);
    try {
      await createOutlet({ outletName: outletName.trim() });
      const outletRows = await getOutlets();
      setOutlets(outletRows);
      const created = outletRows.find((outlet) => outlet.outletName === outletName.trim());
      if (created) setOutletId(created.id);
      setOutletName("");
      toastService.success("Outlet created.");
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not create the outlet.");
    } finally {
      setCreatingOutlet(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!outletId) {
      toastService.error("Select an outlet.");
      return;
    }
    if (!wishlistName.trim()) {
      toastService.error("Enter a wishlist name.");
      return;
    }
    if (!approvalFlowId) {
      toastService.error("Select a wishlist approval flow.");
      return;
    }
    const items = lines.filter((line) => line.materialId);
    if (items.length === 0) {
      toastService.error("Add at least one material.");
      return;
    }
    if (items.some((line) => Number(line.quantity) <= 0)) {
      toastService.error("Enter a quantity greater than zero for every material.");
      return;
    }

    const payload: WishlistWrite = {
      outletId,
      wishlistName: wishlistName.trim(),
      description: blank(description),
      supplierName: blank(supplierName),
      supplierOrganizationId: wishlist?.supplierOrganizationId ?? null,
      masterApprovalFlowId: approvalFlowId,
      currency: blank(currency),
      deliveryInstruction: blank(deliveryInstruction),
      requiredDate: requiredDate || null,
      items: items.map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
        unitPrice: line.unitPrice.trim() ? Number(line.unitPrice) : null,
        currency: blank(line.currency) ?? blank(currency),
        requiredDate: requiredDate || null,
      })),
    };

    setSaving(true);
    try {
      if (wishlist) {
        await updateWishlist(wishlist.id, payload);
        toastService.success("Wishlist sent for approval again.");
      } else {
        await createWishlist(payload);
        toastService.success("Wishlist created and sent for approval.");
      }
      onSaved();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not save the wishlist.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader size={24} message="Loading wishlist..." />;

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title={wishlist ? "Update wishlist" : "New wishlist"}
        description="Creating a wishlist copies the approval users and starts approval. A rejected wishlist can be sent again."
        onBack={onCancel}
        backLabel="Back to wishlists"
      />
      <form className="sila-card" onSubmit={handleSubmit}>
        <div className="sila-card-body">
          <div className="sila-form-grid">
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-name">Name<span className="sila-required">*</span></label>
              <input id="wishlist-name" className="sila-input" value={wishlistName} onChange={(event) => setWishlistName(event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-outlet">Outlet<span className="sila-required">*</span></label>
              <select id="wishlist-outlet" className="sila-select" value={outletId} onChange={(event) => setOutletId(event.target.value)}>
                <option value="">Select an outlet</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>{outlet.outletName}</option>
                ))}
              </select>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-new-outlet">New outlet</label>
              <input id="wishlist-new-outlet" className="sila-input" value={outletName} onChange={(event) => setOutletName(event.target.value)} placeholder="Outlet name" />
            </div>
            <div className="sila-field">
              <span className="sila-label"> </span>
              <button type="button" className="sila-btn sila-btn--secondary" onClick={handleCreateOutlet} disabled={creatingOutlet}>
                {creatingOutlet ? "Creating..." : "Add outlet"}
              </button>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-flow">Approval flow<span className="sila-required">*</span></label>
              <select id="wishlist-flow" className="sila-select" value={approvalFlowId ?? ""} onChange={(event) => setApprovalFlowId(event.target.value)}>
                <option value="">Select a WISHLIST flow</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>{flow.approvalName || flow.approvalCode}</option>
                ))}
              </select>
              {flows.length === 0 && (
                <span className="sila-help">Create an approval configuration of type WISHLIST first.</span>
              )}
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-supplier">Supplier</label>
              <input id="wishlist-supplier" className="sila-input" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-currency">Currency</label>
              <input id="wishlist-currency" className="sila-input" value={currency} onChange={(event) => setCurrency(event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="wishlist-date">Required date</label>
              <input id="wishlist-date" type="date" className="sila-input" value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} />
            </div>
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="wishlist-delivery">Delivery instruction</label>
              <input id="wishlist-delivery" className="sila-input" value={deliveryInstruction} onChange={(event) => setDeliveryInstruction(event.target.value)} />
            </div>
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="wishlist-description">Description</label>
              <textarea id="wishlist-description" className="sila-textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>

          <h2 className="sila-card-title">Materials</h2>
          <div className="sila-field">
            <label className="sila-label" htmlFor="wishlist-material-search">Catalog search</label>
            <input id="wishlist-material-search" className="sila-input" value={materialQuery} onChange={(event) => setMaterialQuery(event.target.value)} placeholder="Material code or description" />
          </div>
          {materials.length > 0 && (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Description</th>
                    <th scope="col"> </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => (
                    <tr key={material.id}>
                      <td>{material.materialCode}</td>
                      <td>{material.description}</td>
                      <td>
                        <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => addMaterial(material)}>
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Material</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit price</th>
                  <th scope="col">Currency</th>
                  <th scope="col"> </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td>{line.materialId ? `${line.materialCode} ${line.materialName}` : "Select a material"}</td>
                    <td>
                      <input
                        className="sila-input"
                        type="number"
                        min="0"
                        step="any"
                        aria-label="Quantity"
                        value={line.quantity}
                        onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item))}
                      />
                    </td>
                    <td>
                      <input
                        className="sila-input"
                        type="number"
                        min="0"
                        step="any"
                        aria-label="Unit price"
                        value={line.unitPrice}
                        onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, unitPrice: event.target.value } : item))}
                      />
                    </td>
                    <td>
                      <input
                        className="sila-input"
                        aria-label="Line currency"
                        value={line.currency}
                        onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, currency: event.target.value } : item))}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sila-btn sila-btn--ghost sila-btn--sm"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="sila-card-footer">
          <button type="button" className="sila-btn sila-btn--secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
            {saving ? "Saving..." : wishlist ? "Send for approval" : "Create wishlist"}
          </button>
        </div>
      </form>
    </>
  );
};

const loadWishlistFlows = async (buyerId: string): Promise<MasterApprovalFlowDto[]> => {
  const collected: MasterApprovalFlowDto[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < 10; page += 1) {
    const batch = await getMasterApprovalFlows(buyerId, page * 50, 50);
    const fresh = batch.filter((flow) => !seen.has(flow.id));
    fresh.forEach((flow) => seen.add(flow.id));
    collected.push(...fresh);
    if (batch.length < 50 || fresh.length === 0) break;
  }
  return collected.filter((flow) => (flow.type ?? "").toUpperCase() === "WISHLIST");
};

export default WishlistForm;
