import React from "react";
import { ChevronLeftIcon, ChevronRightIcon, EmptyState, FileIcon, Loader, SearchIcon } from "@vosox/shared-ui";
import type { BuyerCatalogResponse } from "../../api/Buyerapi";

interface ProductResultsProps {
  error: string | null;
  loading: boolean;
  hasSearched: boolean;
  catalogResults: BuyerCatalogResponse[];
  pagedResults: BuyerCatalogResponse[];
  productAssetImages: Record<string, string>;
  onOpenDetail: (catalogId: string) => void;
  /** When given, each product shows "Add to cart". */
  onAddToCart?: (product: BuyerCatalogResponse) => void;
  /** Catalog ids already in the cart. */
  cartCatalogIds?: string[];
  pageSize: number;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

/** Product search results: loading/empty/error states, the result grid and its pagination. */
const ProductResults: React.FC<ProductResultsProps> = ({
  error,
  loading,
  hasSearched,
  catalogResults,
  pagedResults,
  productAssetImages,
  onOpenDetail,
  onAddToCart,
  cartCatalogIds = [],
  pageSize,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}) => (
  <div className="pud-product-results">
    {error && (
      <div className="pud-product-error" role="alert">
        <p>{error}</p>
      </div>
    )}

    {loading ? (
      <div className="pud-product-loading">
        <Loader size={28} message="Loading products..." />
      </div>
    ) : hasSearched && catalogResults.length === 0 ? (
      <EmptyState
        className="pud-product-empty"
        icon={<FileIcon />}
        title="No products found"
        description="Try adjusting your filters or search terms"
      />
    ) : hasSearched && catalogResults.length > 0 ? (
      <>
        <div className="pud-product-results-header">
          <h2 className="pud-product-results-title">
            Found {catalogResults.length} Product{catalogResults.length !== 1 ? "s" : ""}
          </h2>
        </div>

        <div className="pud-catalog-grid">
          {pagedResults.map((item) => {
            const firstAssetId = item.asset && item.asset[0]?.id;
            const imageSrc = firstAssetId ? productAssetImages[firstAssetId] : undefined;
            return (
              <div
                className="pud-catalog-card"
                key={item.catalogId}
                onClick={() => onOpenDetail(item.catalogId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDetail(item.catalogId);
                  }
                }}
                role="button"
                tabIndex={0}
                title={`View ${item.catalogName}`}
              >
                <div className="pud-catalog-card-media">
                  {imageSrc ? (
                    <img src={imageSrc} alt={item.catalogName} />
                  ) : (
                    <div className="pud-catalog-card-media-placeholder"><FileIcon /></div>
                  )}
                  {item.isPunchOut && (
                    <span className="pud-catalog-card-source pud-catalog-card-source-created">
                      PunchOut
                    </span>
                  )}
                </div>
                <div className="pud-catalog-card-body">
                  <div className="pud-catalog-card-name" title={item.catalogName}>{item.catalogName}</div>
                  <p className="pud-product-item-supplier">by {item.supplierName}</p>
                  {item.description && (
                    <div className="pud-catalog-card-desc">{item.description}</div>
                  )}
                  <div className="pud-catalog-card-meta">
                    {item.price > 0 && (
                      <span className="pud-catalog-card-price">
                        {item.currency} {item.price.toFixed(2)}
                      </span>
                    )}
                    {item.unitOfMeasure && (
                      <span className="pud-catalog-card-uom">{item.unitOfMeasure}</span>
                    )}
                  </div>
                  {onAddToCart && (
                    <div className="pud-product-item-action">
                      <button
                        type="button"
                        className="pud-btn pud-btn-outline"
                        disabled={cartCatalogIds.includes(item.catalogId)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(item);
                        }}
                        // The card itself opens the product on Enter/Space; keep those keys for this button.
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {cartCatalogIds.includes(item.catalogId) ? "Added to cart" : "Add to cart"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {catalogResults.length > pageSize && (
          <nav className="pud-catalog-pagination" aria-label="Product pages">
            <button
              type="button"
              className="pud-btn pud-btn-outline"
              disabled={page === 0}
              onClick={onPrevPage}
            >
              <ChevronLeftIcon /> Previous
            </button>
            <span className="pud-catalog-pagination-info">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="pud-btn pud-btn-outline"
              disabled={page >= totalPages - 1}
              onClick={onNextPage}
            >
              Next <ChevronRightIcon />
            </button>
          </nav>
        )}
      </>
    ) : (
      !hasSearched && (
        <EmptyState
          className="pud-product-empty"
          icon={<SearchIcon />}
          title="Start searching"
          description="Select filters or enter a search term to find products"
        />
      )
    )}
  </div>
);

export default ProductResults;
