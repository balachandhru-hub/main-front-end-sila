import React, { useState } from "react";
import { PageHeader, toastService } from "@vosox/shared-ui";
import { decideWishlist, type WishlistDetail as Wishlist } from "../../api/wishlistApi";
import { statusBadgeClass, statusLabel } from "./wishlistStatus";

interface WishlistDetailProps {
  wishlist: Wishlist;
  currentUserId: string | null;
  onBack: () => void;
  onChanged: () => void;
  onEdit: () => void;
}

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const WishlistDetailView: React.FC<WishlistDetailProps> = ({
  wishlist,
  currentUserId,
  onBack,
  onChanged,
  onEdit,
}) => {
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const pendingStep = wishlist.approvalSteps.find(
    (step) => step.status === "PENDING" && currentUserId && step.userId === currentUserId,
  );
  const earlierPending = pendingStep
    ? wishlist.approvalSteps.some((step) => step.order < pendingStep.order && step.status !== "APPROVE")
    : false;
  const canDecide = Boolean(pendingStep) && !earlierPending && wishlist.status === "PENDING_APPROVAL";

  const decide = async (status: "APPROVE" | "REJECT") => {
    setDeciding(true);
    try {
      await decideWishlist(wishlist.id, status, comment);
      toastService.success(status === "APPROVE" ? "Wishlist approved." : "Wishlist rejected.");
      onChanged();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not record the decision.");
      onChanged();
    } finally {
      setDeciding(false);
    }
  };

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title={wishlist.wishlistName}
        description={wishlist.outletName || "Wishlist"}
        meta={<span className={statusBadgeClass(wishlist.status)}>{statusLabel(wishlist.status)}</span>}
        onBack={onBack}
        backLabel="Back to wishlists"
        actions={wishlist.status === "REJECTED" ? (
          <button type="button" className="sila-btn sila-btn--secondary" onClick={onEdit}>Edit and resubmit</button>
        ) : undefined}
      />

      <section className="sila-card">
        <div className="sila-card-body">
          <div className="sila-form-grid">
            <div className="sila-field">
              <span className="sila-label">Approval</span>
              <span>{wishlist.approvalName || "—"}</span>
            </div>
            <div className="sila-field">
              <span className="sila-label">Supplier</span>
              <span>{wishlist.supplierName || "—"}</span>
            </div>
            <div className="sila-field">
              <span className="sila-label">Currency</span>
              <span>{wishlist.currency || "—"}</span>
            </div>
            <div className="sila-field">
              <span className="sila-label">Required date</span>
              <span>{formatDate(wishlist.requiredDate)}</span>
            </div>
            <div className="sila-field sila-field--full">
              <span className="sila-label">Delivery instruction</span>
              <span>{wishlist.deliveryInstruction || "—"}</span>
            </div>
            {wishlist.buyerErpDocumentNumber && (
              <div className="sila-field">
                <span className="sila-label">Buyer document</span>
                <span>{wishlist.buyerErpDocumentNumber}</span>
              </div>
            )}
            {wishlist.supplierErpDocumentNumber && (
              <div className="sila-field">
                <span className="sila-label">Supplier document</span>
                <span>{wishlist.supplierErpDocumentNumber}</span>
              </div>
            )}
            {wishlist.lastError && (
              <div className="sila-field sila-field--full">
                <span className="sila-error-text">{wishlist.lastError}</span>
              </div>
            )}
          </div>

          <h2 className="sila-card-title">Items</h2>
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Material</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Unit price</th>
                </tr>
              </thead>
              <tbody>
                {wishlist.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.materialCode}</td>
                    <td>{item.materialName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitOfMeasure || "—"}</td>
                    <td>{item.unitPrice ?? "—"} {item.currency || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="sila-card-title">Approval</h2>
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Status</th>
                  <th scope="col">Comment</th>
                  <th scope="col">Acted on</th>
                </tr>
              </thead>
              <tbody>
                {wishlist.approvalSteps.map((step) => (
                  <tr key={`${step.order}-${step.userId}`}>
                    <td>{step.order}</td>
                    <td>{statusLabel(step.status)}</td>
                    <td>{step.comment || "—"}</td>
                    <td>{formatDate(step.actedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canDecide && (
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="wishlist-decision-comment">Comment</label>
              <textarea id="wishlist-decision-comment" className="sila-textarea" value={comment} onChange={(event) => setComment(event.target.value)} />
              <div className="sila-form-actions">
                <button type="button" className="sila-btn sila-btn--danger" disabled={deciding} onClick={() => decide("REJECT")}>Reject</button>
                <button type="button" className="sila-btn sila-btn--primary" disabled={deciding} onClick={() => decide("APPROVE")}>Approve</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default WishlistDetailView;
