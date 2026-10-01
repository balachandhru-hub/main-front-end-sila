import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  createWishlist,
  getOutlets,
  updateWishlist,
  type Outlet,
  type WishlistDetail,
  type WishlistWrite,
} from "../../api/wishlistApi";
import { useCartStore, type CartProduct } from "../../store/useCartStore";

/** One product line. materialId is the Product Catalog id. */
interface LineDraft {
  key: string;
  materialId: string;
  materialName: string;
  supplierName: string;
  unitOfMeasure: string;
  quantity: string;
  unitPrice: number | null;
  currency: string;
}

interface WishlistFormProps {
  wishlist?: WishlistDetail | null;
  onCancel: () => void;
  onSaved: () => void;
  /** Opens the cart, where products are added to a wishlist. */
  onOpenCart?: () => void;
}

const blank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const dateInput = (value?: string | null): string => (value ? value.slice(0, 10) : "");

const linesFromWishlist = (wishlist: WishlistDetail): LineDraft[] =>
  wishlist.items.map((item) => ({
    key: item.id,
    materialId: item.materialId,
    materialName: item.materialName,
    supplierName: "",
    unitOfMeasure: item.unitOfMeasure ?? "",
    quantity: String(item.quantity),
    unitPrice: item.unitPrice ?? null,
    currency: item.currency ?? "",
  }));

const lineFromProduct = (product: CartProduct): LineDraft => ({
  key: product.catalogId,
  materialId: product.catalogId,
  materialName: product.catalogName,
  supplierName: product.supplierName,
  unitOfMeasure: product.unitOfMeasure,
  quantity: String(product.quantity),
  unitPrice: product.price > 0 ? product.price : null,
  currency: product.currency,
});

/** Saved lines first, then the products handed over from the cart that are not saved yet. */
const initialLines = (wishlist: WishlistDetail | null | undefined, fromCart: CartProduct[]): LineDraft[] => {
  const saved = wishlist ? linesFromWishlist(wishlist) : [];
  const savedIds = new Set(saved.map((line) => line.materialId));
  return [...saved, ...fromCart.filter((product) => !savedIds.has(product.catalogId)).map(lineFromProduct)];
};

const WishlistForm: React.FC<WishlistFormProps> = ({ wishlist, onCancel, onSaved, onOpenCart }) => {
  const cartProducts = useCartStore((state) => state.products);
  const handoff = useCartStore((state) => state.handoff);
  const removeCartProducts = useCartStore((state) => state.removeProducts);
  const clearHandoff = useCartStore((state) => state.clearHandoff);

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [outletId, setOutletId] = useState(wishlist?.outletId ?? "");
  const [wishlistName, setWishlistName] = useState(wishlist?.wishlistName ?? "");
  const [description, setDescription] = useState(wishlist?.description ?? "");
  const [deliveryInstruction, setDeliveryInstruction] = useState(wishlist?.deliveryInstruction ?? "");
  const [requiredDate, setRequiredDate] = useState(dateInput(wishlist?.requiredDate));
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initialLines(
      wishlist,
      handoff ? cartProducts.filter((product) => handoff.catalogIds.includes(product.catalogId)) : [],
    ),
  );

  // The outlets come back already limited to the ones assigned to the signed-in user.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const outletRows = await getOutlets();
        if (!active) return;
        setOutlets(outletRows);
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
  }, [wishlist]);

  // The approval flow is the one assigned to the outlet.
  const selectedOutlet = outlets.find((outlet) => outlet.id === outletId);
  const hasApprovalFlow = Boolean(selectedOutlet?.masterApprovalFlowId);

  // A draft stays editable; submitting freezes the wishlist and starts approval.
  const save = async (saveAsDraft: boolean) => {
    if (!outletId) {
      toastService.error("Select an outlet.");
      return;
    }
    if (!wishlistName.trim()) {
      toastService.error("Enter a wishlist name.");
      return;
    }
    if (!saveAsDraft && !hasApprovalFlow) {
      toastService.error("This outlet has no approval flow. Ask your buyer administrator to assign one.");
      return;
    }
    if (lines.length === 0) {
      toastService.error("Add at least one product from the cart.");
      return;
    }
    if (lines.some((line) => !(Number(line.quantity) > 0))) {
      toastService.error("Enter a quantity greater than zero for every product.");
      return;
    }

    // Name, unit, price and currency of each product are read from the Product Catalog by the server.
    // A wishlist can mix suppliers and currencies, so it has no supplier or currency of its own.
    // The approval flow is taken from the outlet by the server.
    const payload: WishlistWrite = {
      outletId,
      wishlistName: wishlistName.trim(),
      description: blank(description),
      supplierName: null,
      supplierOrganizationId: null,
      masterApprovalFlowId: null,
      saveAsDraft,
      currency: null,
      deliveryInstruction: blank(deliveryInstruction),
      requiredDate: requiredDate || null,
      items: lines.map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
        requiredDate: requiredDate || null,
      })),
    };

    setSaving(true);
    try {
      if (wishlist) {
        await updateWishlist(wishlist.id, payload);
      } else {
        await createWishlist(payload);
      }
      toastService.success(saveAsDraft ? "Wishlist saved as draft." : "Wishlist submitted for approval.");
      // The products that came from the cart are now in the wishlist.
      if (handoff) removeCartProducts(lines.map((line) => line.materialId));
      clearHandoff();
      onSaved();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not save the wishlist.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    save(false);
  };

  const handleCancel = () => {
    clearHandoff();
    onCancel();
  };

  if (loading) return <Loader size={24} message="Loading wishlist..." />;

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title={wishlist ? "Update wishlist" : "New wishlist"}
        onBack={handleCancel}
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
              <label className="sila-label" htmlFor="wishlist-flow">Approval flow</label>
              <input
                id="wishlist-flow"
                className="sila-input"
                value={selectedOutlet?.approvalName || (selectedOutlet ? "Not assigned to this outlet" : "")}
                readOnly
                disabled
              />
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

          <h2 className="sila-card-title">Products</h2>
          {lines.length === 0 ? (
            <EmptyState
              title="No products yet"
              description='Select products in the cart and use "Add to wishlist".'
              action={onOpenCart ? (
                <button type="button" className="sila-btn sila-btn--secondary" onClick={onOpenCart}>
                  Open cart
                </button>
              ) : undefined}
            />
          ) : (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Quantity</th>
                    <th scope="col"> </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key}>
                      <td className="sila-cell-strong">{line.materialName}</td>
                      <td>{line.supplierName || "—"}</td>
                      <td>{line.unitOfMeasure || "—"}</td>
                      <td>{line.unitPrice == null ? "—" : `${line.currency} ${line.unitPrice}`.trim()}</td>
                      <td>
                        <input
                          className="sila-input"
                          type="number"
                          min="0"
                          step="any"
                          aria-label={`Quantity of ${line.materialName}`}
                          value={line.quantity}
                          onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item))}
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
          )}
        </div>
        <div className="sila-card-footer">
          <button type="button" className="sila-btn sila-btn--secondary" onClick={handleCancel} disabled={saving}>Cancel</button>
          <button type="button" className="sila-btn sila-btn--secondary" onClick={() => save(true)} disabled={saving}>
            Save as draft
          </button>
          <button type="submit" className="sila-btn sila-btn--primary" disabled={saving || !hasApprovalFlow}>
            {saving ? "Saving..." : "Submit for approval"}
          </button>
        </div>
      </form>
    </>
  );
};

export default WishlistForm;
