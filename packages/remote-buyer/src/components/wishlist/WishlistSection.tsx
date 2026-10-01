import React, { useCallback, useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, Pagination, toastService } from "@vosox/shared-ui";
import { getWishlist, getWishlists, type WishlistDetail, type WishlistListItem } from "../../api/wishlistApi";
import WishlistDetailView from "./WishlistDetail";
import WishlistForm from "./WishlistForm";
import { isMyApprovalTurn, statusBadgeClass, statusLabel } from "./wishlistStatus";

const PAGE_SIZE = 20;

interface WishlistSectionProps {
  buyerId: string;
  currentUserId: string | null;
  /** manage: create and resubmit. approve: inbox of wishlists waiting for this user. */
  mode?: "manage" | "approve";
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

const WishlistSection: React.FC<WishlistSectionProps> = ({ buyerId, currentUserId, mode = "manage" }) => {
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

  const openWishlist = async (id: string) => {
    setLoading(true);
    try {
      const wishlist = await getWishlist(id);
      setView({ name: "detail", wishlist });
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not load this wishlist.");
    } finally {
      setLoading(false);
    }
  };

  const refreshOpen = async (id: string) => {
    await openWishlist(id);
  };

  if (!buyerId) {
    return <EmptyState title="Buyer profile is still loading" description="The wishlist opens after the buyer profile is available." />;
  }

  if (view.name === "create") {
    return (
      <WishlistForm
        buyerId={buyerId}
        onCancel={() => setView({ name: "list" })}
        onSaved={() => {
          setPage(1);
          setView({ name: "list" });
        }}
      />
    );
  }

  if (view.name === "edit") {
    return (
      <WishlistForm
        buyerId={buyerId}
        wishlist={view.wishlist}
        onCancel={() => setView({ name: "detail", wishlist: view.wishlist })}
        onSaved={() => refreshOpen(view.wishlist.id)}
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
        description={mode === "approve"
          ? "Wishlists waiting for your approval. The last approval sends the purchase order to the saved PO_CREATE API."
          : "Organization wishlists start approval on create. The last approval sends the purchase order to the saved PO_CREATE API."}
        actions={mode === "manage" ? (
          <button type="button" className="sila-btn sila-btn--primary" onClick={() => setView({ name: "create" })}>
            New wishlist
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
              : "Create a wishlist to start approval and send a purchase order."}
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
