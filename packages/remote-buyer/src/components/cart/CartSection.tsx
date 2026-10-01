import React, { useEffect, useMemo, useState } from "react";
import { EmptyState, FileIcon, PageHeader, isErrorResponse, toastService } from "@vosox/shared-ui";
import { fetchBuyerAsset } from "../../api/Buyerapi";
import { getWishlists, type WishlistListItem } from "../../api/wishlistApi";
import { useCartStore } from "../../store/useCartStore";
import { isEditableStatus } from "../wishlist/wishlistStatus";
import "./CartSection.css";

interface CartSectionProps {
  /** Opens the wishlist section, which picks up the products handed over from the cart. */
  onOpenWishlist: () => void;
  /** Opens the Product Catalog, where products are added to the cart. */
  onBrowseCatalog: () => void;
}

const NEW_WISHLIST = "";

/** Cart: products added from the Product Catalog, which the user moves into a wishlist. */
const CartSection: React.FC<CartSectionProps> = ({ onOpenWishlist, onBrowseCatalog }) => {
  const products = useCartStore((state) => state.products);
  const removeProducts = useCartStore((state) => state.removeProducts);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const startWishlist = useCartStore((state) => state.startWishlist);

  const [supplier, setSupplier] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [draftWishlists, setDraftWishlists] = useState<WishlistListItem[]>([]);
  const [targetWishlistId, setTargetWishlistId] = useState(NEW_WISHLIST);

  const suppliers = useMemo(
    () => Array.from(new Set(products.map((product) => product.supplierName).filter(Boolean))).sort(),
    [products],
  );
  const visibleProducts = supplier ? products.filter((product) => product.supplierName === supplier) : products;
  const selectedVisibleIds = visibleProducts
    .map((product) => product.catalogId)
    .filter((catalogId) => selectedIds.includes(catalogId));
  const allVisibleSelected = visibleProducts.length > 0 && selectedVisibleIds.length === visibleProducts.length;

  // Thumbnails: load each product's first image once.
  useEffect(() => {
    let active = true;
    products.forEach(async (product) => {
      const assetId = product.imageAssetId;
      if (!assetId || images[assetId]) return;
      try {
        const asset = await fetchBuyerAsset(assetId);
        if (!active || isErrorResponse(asset)) return;
        const src = asset.fileBytes
          ? `data:${asset.contentType || asset.fileType || "image/png"};base64,${asset.fileBytes}`
          : asset.url || asset.fileUrl;
        if (src) setImages((current) => ({ ...current, [assetId]: src }));
      } catch {
        // The row keeps its placeholder when the image cannot be loaded.
      }
    });
    return () => {
      active = false;
    };
  }, [products]);

  // Draft wishlists the selected products can be added to.
  useEffect(() => {
    let active = true;
    getWishlists(0, 50)
      .then((rows) => {
        if (active) setDraftWishlists(rows.filter((row) => isEditableStatus(row.status)));
      })
      .catch(() => {
        // "New wishlist" stays available when the drafts cannot be loaded.
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleProduct = (catalogId: string) => {
    setSelectedIds((current) =>
      current.includes(catalogId) ? current.filter((id) => id !== catalogId) : [...current, catalogId],
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = visibleProducts.map((product) => product.catalogId);
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    );
  };

  const handleRemove = (catalogIds: string[]) => {
    removeProducts(catalogIds);
    setSelectedIds((current) => current.filter((id) => !catalogIds.includes(id)));
  };

  const handleAddToWishlist = () => {
    if (selectedVisibleIds.length === 0) {
      toastService.error("Select at least one product.");
      return;
    }
    const selected = products.filter((product) => selectedVisibleIds.includes(product.catalogId));
    if (selected.some((product) => !(product.quantity > 0))) {
      toastService.error("Enter a quantity greater than zero for every selected product.");
      return;
    }
    startWishlist({ wishlistId: targetWishlistId || null, catalogIds: selectedVisibleIds });
    onOpenWishlist();
  };

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title="Cart"
        actions={(
          <button type="button" className="sila-btn sila-btn--secondary" onClick={onBrowseCatalog}>
            Product Catalog
          </button>
        )}
      />
      <section className="sila-card">
        {products.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            description='Use "Add to cart" on products in the Product Catalog.'
            action={(
              <button type="button" className="sila-btn sila-btn--secondary" onClick={onBrowseCatalog}>
                Open Product Catalog
              </button>
            )}
          />
        ) : (
          <>
            <div className="sila-card-body">
              <div className="cart-toolbar">
                <div className="sila-field">
                  <label className="sila-label" htmlFor="cart-supplier">Supplier</label>
                  <select id="cart-supplier" className="sila-select" value={supplier} onChange={(event) => setSupplier(event.target.value)}>
                    <option value="">All suppliers</option>
                    {suppliers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="cart-toolbar-group">
                  <div className="sila-field">
                    <label className="sila-label" htmlFor="cart-target">Add to</label>
                    <select id="cart-target" className="sila-select" value={targetWishlistId} onChange={(event) => setTargetWishlistId(event.target.value)}>
                      <option value={NEW_WISHLIST}>New wishlist</option>
                      {draftWishlists.map((wishlist) => (
                        <option key={wishlist.id} value={wishlist.id}>{wishlist.wishlistName}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="sila-btn sila-btn--primary" onClick={handleAddToWishlist} disabled={selectedVisibleIds.length === 0}>
                    Add to wishlist ({selectedVisibleIds.length})
                  </button>
                </div>
              </div>
            </div>
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <input type="checkbox" aria-label="Select all products" checked={allVisibleSelected} onChange={toggleAllVisible} />
                    </th>
                    <th scope="col">Image</th>
                    <th scope="col">Product</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Quantity</th>
                    <th scope="col"> </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => {
                    const imageSrc = product.imageAssetId ? images[product.imageAssetId] : undefined;
                    return (
                      <tr key={product.catalogId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${product.catalogName}`}
                            checked={selectedIds.includes(product.catalogId)}
                            onChange={() => toggleProduct(product.catalogId)}
                          />
                        </td>
                        <td>
                          <div className="cart-thumb">
                            {imageSrc ? <img src={imageSrc} alt={product.catalogName} /> : <FileIcon />}
                          </div>
                        </td>
                        <td className="sila-cell-strong">{product.catalogName}</td>
                        <td>{product.supplierName || "—"}</td>
                        <td>{product.unitOfMeasure || "—"}</td>
                        <td>{product.price > 0 ? `${product.currency} ${product.price}`.trim() : "—"}</td>
                        <td>
                          <input
                            className="sila-input cart-qty"
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Quantity of ${product.catalogName}`}
                            value={product.quantity}
                            onChange={(event) => setQuantity(product.catalogId, Number(event.target.value))}
                          />
                        </td>
                        <td>
                          <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => handleRemove([product.catalogId])}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default CartSection;
