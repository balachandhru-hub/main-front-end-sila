import React, { useCallback, useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, Pagination, toastService } from "@vosox/shared-ui";
import { getWishlist, getWishlists, type WishlistDetail, type WishlistListItem } from "../../api/wishlistApi";
import WishlistDetailView from "./WishlistDetail";
import WishlistForm from "./WishlistForm";
import { isEditableStatus, isMyApprovalTurn, statusBadgeClass, statusLabel } from "./wishlistStatus";
import { useCartStore } from "../../store/useCartStore";

const PAGE_SIZE = 20;

interface WishlistSectionProps {
  buyerId: string;
  currentUserId: string | null;
  /** manage: create and resubmit. approve: inbox of wishlists waiting for this user. */
  mode?: "manage" | "approve";
  /** Opens the cart, where products are added to a wishlist. */
  onOpenCart?: () => void;
}

type View =
  | { name: "list" }
  | { name: "create" }
  | { name: "detail"; wishlist: WishlistDetail }
  | { name: "edit"; wishlist: WishlistDetail };

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const WishlistSection: React.FC<WishlistSectionProps> = ({ buyerId, currentUserId, mode = "manage", onOpenCart }) => {
  const cartCount = useCartStore((state) => state.products.length);
  const [view, setView] = useState<View>({ name: "list" });
  const [rows, setRows] = useState<WishlistListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "approve") {
        const pending: WishlistListItem[] = [];
        for (let index = 0; index < 10; index += 1) {
          const batch = await getWishlists(index * 50, 50);
          pending.push(...batch.filter((row) => row.status === "PENDING_APPROVAL"));
          if (batch.length < 50) break;
        }
        const details = await Promise.all(pending.map((row) => getWishlist(row.id).catch(() => null)));
        const mine = details.filter(
          (detail): detail is WishlistDetail => detail != null && isMyApprovalTurn(detail, currentUserId),
        );
        setRows(mine.map((detail) => ({
          id: detail.id,
          wishlistName: detail.wishlistName,
          outletName: detail.outletName,
          createdBy: detail.createdBy,
          dateCreated: detail.dateCreated,
          status: detail.status,
          approvalName: detail.approvalName,
          buyerErpDocumentNumber: detail.buyerErpDocumentNumber,
          supplierErpDocumentNumber: detail.supplierErpDocumentNumber,
          lastError: detail.lastError,
        })));
        setHasNext(false);
        setPage(1);
        return;
      }

      const data = await getWishlists((nextPage - 1) * PAGE_SIZE, PAGE_SIZE + 1);
      setHasNext(data.length > PAGE_SIZE);
      setRows(data.slice(0, PAGE_SIZE));
      setPage(nextPage);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load wishlists.";
      setError(message);
      toastService.error(message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, mode]);

  useEffect(() => {
    if (view.name === "list") loadPage(mode === "approve" ? 1 : page);
  }, [view.name, loadPage, page, mode]);

  const openWishlist = async (id: string, target: "detail" | "edit" = "detail") => {
    setLoading(true);
    try {
      const wishlist = await getWishlist(id);
      setView(target === "edit" ? { name: "edit", wishlist } : { name: "detail", wishlist });
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not load this wishlist.");
    } finally {
      setLoading(false);
    }
  };

  const refreshOpen = async (id: string) => {
    await openWishlist(id);
  };

  // Products handed over from the cart open the form they are meant for: a new wishlist or a draft.
  useEffect(() => {
    if (mode !== "manage") return;
    const handoff = useCartStore.getState().handoff;
    if (!handoff) return;
    if (handoff.wishlistId) {
      openWishlist(handoff.wishlistId, "edit");
    } else {
      setView({ name: "create" });
    }
  }, [mode]);

  if (!buyerId) {
    return <EmptyState title="Buyer profile is still loading" description="The wishlist opens after the buyer profile is available." />;
  }

  if (view.name === "create") {
    return (
      <WishlistForm
        onCancel={() => setView({ name: "list" })}
        onSaved={() => {
          setPage(1);
          setView({ name: "list" });
        }}
        onOpenCart={onOpenCart}
      />
    );
  }

  if (view.name === "edit") {
    return (
      <WishlistForm
        wishlist={view.wishlist}
        onCancel={() => setView({ name: "detail", wishlist: view.wishlist })}
        onSaved={() => refreshOpen(view.wishlist.id)}
        onOpenCart={onOpenCart}
      />
    );
  }

  if (view.name === "detail") {
    return (
      <WishlistDetailView
        wishlist={view.wishlist}
        currentUserId={currentUserId}
        onBack={() => setView({ name: "list" })}
        allowEdit={mode === "manage"}
        allowDecide={mode === "approve"}
        onEdit={() => setView({ name: "edit", wishlist: view.wishlist })}
        onChanged={() => refreshOpen(view.wishlist.id)}
      />
    );
  }

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title={mode === "approve" ? "Wishlist approvals" : "Wishlists"}
        actions={mode === "manage" && onOpenCart ? (
          <button type="button" className="sila-btn sila-btn--primary" onClick={onOpenCart}>
            Cart ({cartCount})
          </button>
        ) : undefined}
      />
      <section className="sila-card">
        {loading ? (
          <Loader size={24} message="Loading wishlists..." />
        ) : error && rows.length === 0 ? (
          <EmptyState variant="error" title="Couldn't load wishlists" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={mode === "approve" ? "Nothing is waiting for you" : "No wishlists yet"}
            description={mode === "approve"
              ? "When you are the next approver on a wishlist, it shows up here."
              : 'Add products to the cart from the Product Catalog, then use "Add to wishlist" in the cart.'}
          />
        ) : (
          <>
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Outlet</th>
                    <th scope="col">Approval</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Document</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="sila-row-clickable"
                      tabIndex={0}
                      onClick={() => openWishlist(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openWishlist(row.id);
                        }
                      }}
                    >
                      <td className="sila-cell-strong">{row.wishlistName}</td>
                      <td>{row.outletName || "—"}</td>
                      <td>{row.approvalName || "—"}</td>
                      <td><span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span></td>
                      <td>{formatDate(row.dateCreated)}</td>
                      <td>{row.buyerErpDocumentNumber || row.lastError || "—"}</td>
                      {/* The row opens the wishlist on click/Enter; keep those events for the buttons. */}
                      <td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                        <div className="sila-btn-group">
                          <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => openWishlist(row.id)}>
                            View
                          </button>
                          {mode === "manage" && isEditableStatus(row.status) && (
                            <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openWishlist(row.id, "edit")}>
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mode === "manage" && (
              <Pagination
                page={page}
                hasNext={hasNext}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => current + 1)}
                disabled={loading}
              />
            )}
          </>
        )}
      </section>
    </>
  );
};

export default WishlistSection;
