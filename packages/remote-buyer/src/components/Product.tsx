import React, { useState, useEffect } from "react";
import "./Product.css";
import "../../../remote-supplier/src/components/Catalog.css";
import {
  fetchSegments,
  fetchFamilies,
  fetchClassifications,
  fetchCommodities,
} from "../api/masterdataApi";
import { 
  fetchBuyerCatalog,
  fetchBuyerAsset,
  fetchBuyerCatalogDetail} from "../api/Buyerapi";
import type { BuyerCatalogResponse as BuyerCatalogResponseType } from "../api/Buyerapi";
import { EmptyState, Loader, isErrorResponse } from "@vosox/shared-ui";

/* ============================== Icons ============================== */

const IconSearch = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconFilter = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconFileGeneric = () => (
  <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const IconLoader = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pud-loader">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const IconExternalLink = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconChevronLeft = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ============================== Types ============================== */

interface FilterState {
  segment: number | "";
  family: number | "";
  class: number | "";
  commodity: number | "";
  search: string;
  index: number;
  limit: number;
}

/* ============================== Component ============================== */

const Product: React.FC = () => {
  // ---- Filter State ----
  const [filters, setFilters] = useState<FilterState>({
    segment: "",
    family: "",
    class: "",
    commodity: "",
    search: "",
    index: 0,
    limit: 20,
  });

  // ---- Classification Options ----
  const [segmentOptions, setSegmentOptions] = useState<Array<{ segment: number; title: string }>>([]);
  const [familyOptions, setFamilyOptions] = useState<Array<{ family: number; title: string }>>([]);
  const [classOptions, setClassOptions] = useState<Array<{ class: number; classTitle: string }>>([]);
  const [commodityOptions, setCommodityOptions] = useState<Array<{ commodity: number; commodityTitle: string }>>([]);

  // ---- Loading States ----
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingCommodities, setLoadingCommodities] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // ---- Results State ----
  const [catalogResults, setCatalogResults] = useState<BuyerCatalogResponseType[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRODUCT_PAGE_SIZE = 10;
  const [productPage, setProductPage] = useState(0);
  const productTotalPages = Math.max(1, Math.ceil(catalogResults.length / PRODUCT_PAGE_SIZE));
  const pagedProductResults = catalogResults.slice(
    productPage * PRODUCT_PAGE_SIZE,
    productPage * PRODUCT_PAGE_SIZE + PRODUCT_PAGE_SIZE
  );

  const [productAssetImages, setProductAssetImages] = useState<Record<string, string>>({});

  // ✅ NEW STATE: Detail view
  const [selectedProduct, setSelectedProduct] = useState<BuyerCatalogResponseType | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingSelectedImages, setLoadingSelectedImages] = useState(false);
  const [loadingProductDetail, setLoadingProductDetail] = useState(false);
  const [productDetailError, setProductDetailError] = useState<string | null>(null);

  const [showPunchOutFullPage, setShowPunchOutFullPage] = useState(false);
  const [punchOutPreviewUrl, setPunchOutPreviewUrl] = useState<string>("");
  const [punchOutIframeBlocked, setPunchOutIframeBlocked] = useState(false);

  useEffect(() => {
    loadSegments();
    fetchProducts({
      segment: "",
      family: "",
      class: "",
      commodity: "",
      search: "",
      index: 0,
      limit: 20,
    });
  }, []);

  const loadSegments = async () => {
    setLoadingSegments(true);
    try {
      const segments = await fetchSegments();
      if (Array.isArray(segments)) {
        setSegmentOptions(segments);
      }
    } catch (err) {
    } finally {
      setLoadingSegments(false);
    }
  };

  // ---- Handle Segment Selection ----
  const handleSegmentChange = async (segmentValue: string) => {
    const segmentNum = Number(segmentValue);

    setFilters((prev) => ({
      ...prev,
      segment: segmentNum,
      family: "",
      class: "",
      commodity: "",
    }));

    setFamilyOptions([]);
    setClassOptions([]);
    setCommodityOptions([]);

    if (segmentNum) {
      setLoadingFamilies(true);
      try {
        const families = await fetchFamilies(segmentNum);
        if (Array.isArray(families)) {
          setFamilyOptions(families);
        }
      } catch (err) {
      } finally {
        setLoadingFamilies(false);
      }
    }
  };

  // ---- Handle Family Selection ----
  const handleFamilyChange = async (familyValue: string) => {
    const familyNum = Number(familyValue);

    setFilters((prev) => ({
      ...prev,
      family: familyNum,
      class: "",
      commodity: "",
    }));

    setClassOptions([]);
    setCommodityOptions([]);

    if (familyNum) {
      setLoadingClasses(true);
      try {
        const classes = await fetchClassifications(familyNum);
        if (Array.isArray(classes)) {
          setClassOptions(classes);
        }
      } catch (err) {
      } finally {
        setLoadingClasses(false);
      }
    }
  };

  // ---- Handle Class Selection ----
  const handleClassChange = async (classValue: string) => {
    const classNum = Number(classValue);

    setFilters((prev) => ({
      ...prev,
      class: classNum,
      commodity: "",
    }));

    setCommodityOptions([]);

    if (classNum) {
      setLoadingCommodities(true);
      try {
        const commodities = await fetchCommodities(classNum);
        if (Array.isArray(commodities)) {
          setCommodityOptions(commodities);
        }
      } catch (err) {
      } finally {
        setLoadingCommodities(false);
      }
    }
  };

  // ---- Handle Commodity Selection ----
  const handleCommodityChange = (commodityValue: string) => {
    const commodityNum = Number(commodityValue);
    setFilters((prev) => ({
      ...prev,
      commodity: commodityNum,
    }));
  };

  // ---- Handle Search Input ----
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
    }));
  };

  const fetchProducts = async (filterState: FilterState) => {
    setLoadingResults(true);
    setError(null);

    try {
      const results = await fetchBuyerCatalog({
        segment: filterState.segment || undefined,
        family: filterState.family || undefined,
        class: filterState.class || undefined,
        commodity: filterState.commodity || undefined,
        search: filterState.search || undefined,
        index: filterState.index,
        limit: filterState.limit,
      });

      if (Array.isArray(results)) {
        setCatalogResults(results);
        setProductPage(0);
        results.forEach((item: BuyerCatalogResponseType) => {
          const firstAssetId = item.asset && item.asset[0]?.id;
          if (firstAssetId) {
            loadProductAssetImage(firstAssetId);
          }
        });
      } else {
        setError("Failed to fetch catalogs. Please try again.");
        setCatalogResults([]);
      }
      setHasSearched(true);
    } catch (err: any) {
      setError("Failed to fetch catalogs. Please try again.");
      setCatalogResults([]);
      setHasSearched(true);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchProducts(filters);
  };

  const loadProductAssetImage = async (assetId: string) => {
    if (!assetId || productAssetImages[assetId]) return;
    try {
      const asset: any = await fetchBuyerAsset(assetId);
      if (!asset || asset.statusCode) return;

      let src: string | null = null;
      if (asset.fileBytes) {
        const mime = asset.contentType || asset.fileType || "image/png";
        src = `data:${mime};base64,${asset.fileBytes}`;
      } else if (asset.url) {
        src = asset.url;
      } else if (asset.fileUrl) {
        src = asset.fileUrl;
      }

      if (src) {
        setProductAssetImages((prev) => ({ ...prev, [assetId]: src as string }));
      }
    } catch (error) {
    }
  };

  // ✅ UPDATED: Open product detail with API call
  const openProductDetail = async (catalogId: string) => {
    setLoadingProductDetail(true);
    setProductDetailError(null);
    setSelectedProduct(null);
    setSelectedImageIndex(0);

    try {
      const response = await fetchBuyerCatalogDetail(catalogId);

      // ✅ Check if error response
      if (isErrorResponse(response)) {
        setProductDetailError(
          response.description || response.message || 'Failed to load product details.'
        );
        return;
      }

      // ✅ Set the product detail
      setSelectedProduct(response);

      // ✅ Load images for the detailed product
      const assetIds = (response.asset || []).map((a) => a.id).filter(Boolean) as string[];
      if (assetIds.length > 0) {
        setLoadingSelectedImages(true);
        try {
          await Promise.all(assetIds.map((id) => loadProductAssetImage(id)));
        } finally {
          setLoadingSelectedImages(false);
        }
      }
    } catch (error: any) {
      setProductDetailError(error.message || 'Failed to load product details.');
    } finally {
      setLoadingProductDetail(false);
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    setSelectedImageIndex(0);
    setShowPunchOutFullPage(false);
    setProductDetailError(null);
  };

  const selectedProductImages: string[] = selectedProduct
    ? ((selectedProduct.asset || [])
      .map((a) => (a.id ? productAssetImages[a.id] : undefined))
      .filter(Boolean) as string[])
    : [];

  const goToPrevProductImage = () => {
    setSelectedImageIndex((prev) =>
      selectedProductImages.length === 0 ? 0 : (prev - 1 + selectedProductImages.length) % selectedProductImages.length
    );
  };

  const goToNextProductImage = () => {
    setSelectedImageIndex((prev) =>
      selectedProductImages.length === 0 ? 0 : (prev + 1) % selectedProductImages.length
    );
  };

  const handlePunchOutPreview = (url: string) => {
    setPunchOutPreviewUrl(url);
    setShowPunchOutFullPage(true);
    setPunchOutIframeBlocked(false);
  };

  if (showPunchOutFullPage && selectedProduct) {
    return (
      <div className="pud-product-page">
        <div className="pud-catalog-fullview-header">
          <div>
            <button
              type="button"
              className="pud-btn pud-btn-outline"
              onClick={() => setShowPunchOutFullPage(false)}
            >
              <IconChevronLeft /> Back to {selectedProduct.catalogName}
            </button>
          </div>
          <div className="pud-catalog-fullview-actions">
            <span className="pud-modal-badge">
              <IconExternalLink /> PunchOut Catalog
            </span>
          </div>
        </div>

        <div className="pud-punchout-fullpage-body">
          <h1 className="pud-title">{selectedProduct.catalogName}</h1>

          <div className="pud-punchout-fullpage-viewer">
            {punchOutIframeBlocked ? (
              <div className="pud-product-embed-blocked">
                <div className="pud-product-embed-blocked-text">
                  <p className="pud-product-embed-blocked-title">Website Cannot Be Embedded</p>
                  <p className="pud-product-embed-blocked-desc">
                    This website has restricted embedding for security reasons.
                  </p>
                </div>
                <a
                  href={punchOutPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pud-btn pud-btn-message"
                >
                  <IconExternalLink /> Open in New Tab
                </a>
              </div>
            ) : (
              <iframe
                src={punchOutPreviewUrl}
                className="pud-product-embed-frame"
                title="PunchOut Catalog"
                onError={() => setPunchOutIframeBlocked(true)}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="pud-product-page">
        <div className="pud-catalog-fullview-header">
          <div>
            <button type="button" className="pud-btn pud-btn-outline" onClick={closeProductDetail}>
              <IconChevronLeft /> Back to Products
            </button>
          </div>
        </div>

        <div className="pud-product-detail">
          <div className="pud-product-detail-gallery">
            <div className="pud-product-detail-media">
              {loadingProductDetail || loadingSelectedImages ? (
                <Loader size={28} />
              ) : productDetailError ? (
                <div className="pud-product-detail-error" role="alert">
                  <div className="pud-product-detail-error-text">{productDetailError}</div>
                  <button
                    type="button"
                    className="pud-btn pud-btn-outline"
                    onClick={() => selectedProduct && openProductDetail(selectedProduct.catalogId)}
                  >
                    Retry Loading
                  </button>
                </div>
              ) : selectedProductImages.length > 0 ? (
                <img
                  src={selectedProductImages[selectedImageIndex]}
                  alt={selectedProduct.catalogName}
                  className="pud-product-detail-image"
                />
              ) : (
                <div className="pud-product-detail-placeholder"><IconFileGeneric /></div>
              )}

              {selectedProductImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="pud-product-detail-nav pud-product-detail-nav-prev"
                    onClick={goToPrevProductImage}
                    title="Previous image"
                    aria-label="Previous image"
                  >
                    <IconChevronLeft />
                  </button>
                  <button
                    type="button"
                    className="pud-product-detail-nav pud-product-detail-nav-next"
                    onClick={goToNextProductImage}
                    title="Next image"
                    aria-label="Next image"
                  >
                    <IconChevronRight />
                  </button>
                </>
              )}
            </div>

            {selectedProductImages.length > 1 && (
              <div className="pud-product-detail-thumbs">
                {selectedProductImages.map((src, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className={`pud-product-detail-thumb${idx === selectedImageIndex ? " pud-product-detail-thumb-active" : ""}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`Show image ${idx + 1}`}
                    aria-pressed={idx === selectedImageIndex}
                  >
                    <img src={src} alt={`thumb-${idx}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pud-product-detail-info">
            <h1 className="pud-title">{selectedProduct.catalogName}</h1>
            <p className="pud-product-item-supplier">by {selectedProduct.supplierName}</p>

            {selectedProduct.catalogType && (
              <span className="pud-catalog-card-tag pud-product-detail-tag">
                {selectedProduct.catalogType}
              </span>
            )}

            {selectedProduct.description && (
              <p className="pud-product-detail-desc">{selectedProduct.description}</p>
            )}

            <div className="pud-catalog-card-meta">
              {selectedProduct.price > 0 && (
                <span className="pud-catalog-card-price">
                  {selectedProduct.currency} {selectedProduct.price.toFixed(2)}
                </span>
              )}
              {selectedProduct.unitOfMeasure && (
                <span className="pud-catalog-card-uom">per {selectedProduct.unitOfMeasure}</span>
              )}
            </div>

            {/* Show classification even if titles are null */}
            {(selectedProduct.segment || selectedProduct.family || selectedProduct.class || selectedProduct.commodity) && (
              <div className="pud-catalog-card-classification">
                <div className="pud-catalog-form-section-title">Classification</div>
                {selectedProduct.segment && (
                  <div className="pud-catalog-classification-row">
                    <span className="pud-catalog-classification-label">Segment:</span>
                    <span className="pud-catalog-classification-value">
                      {selectedProduct.segment}
                      {selectedProduct.segmentTitle && ` - ${selectedProduct.segmentTitle}`}
                    </span>
                  </div>
                )}
                {selectedProduct.family && (
                  <div className="pud-catalog-classification-row">
                    <span className="pud-catalog-classification-label">Family:</span>
                    <span className="pud-catalog-classification-value">
                      {selectedProduct.family}
                      {selectedProduct.familyTitle && ` - ${selectedProduct.familyTitle}`}
                    </span>
                  </div>
                )}
                {selectedProduct.class && (
                  <div className="pud-catalog-classification-row">
                    <span className="pud-catalog-classification-label">Class:</span>
                    <span className="pud-catalog-classification-value">
                      {selectedProduct.class}
                      {selectedProduct.classTitle && ` - ${selectedProduct.classTitle}`}
                    </span>
                  </div>
                )}
                {selectedProduct.commodity && (
                  <div className="pud-catalog-classification-row">
                    <span className="pud-catalog-classification-label">Commodity:</span>
                    <span className="pud-catalog-classification-value">
                      {selectedProduct.commodity}
                      {selectedProduct.commodityTitle && ` - ${selectedProduct.commodityTitle}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {selectedProduct.isPunchOut && selectedProduct.punchOutUrl && (
              <div className="pud-product-item-action">
                <button
                  type="button"
                  className="pud-product-item-link"
                  onClick={() => handlePunchOutPreview(selectedProduct.punchOutUrl)}
                >
                  <IconExternalLink /> View Catalog
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pud-product-page">
      <div className="pud-product-header">
        <h1 className="pud-title">Product Catalog</h1>
        <p className="pud-subtitle">Search and filter products by classification</p>
      </div>

      {/* ---- Filter Section ---- */}
      <div className="pud-product-filters">
        <div className="pud-product-filter-card">
          <div className="pud-product-filter-title">
            <IconFilter /> Filter by Classification
          </div>

          <div className="pud-product-filter-grid">
            {/* Segment */}
            <div className="pud-product-filter-field">
              <label className="pud-product-filter-label" htmlFor="pud-product-filter-segment">Segment</label>
              <select
                id="pud-product-filter-segment"
                className="pud-product-filter-select"
                value={filters.segment}
                onChange={(e) => handleSegmentChange(e.target.value)}
              >
                <option value="">
                  {loadingSegments ? "Loading..." : "Select Segment"}
                </option>
                {segmentOptions.map((seg) => (
                  <option key={seg.segment} value={seg.segment}>
                    {seg.segment} - {seg.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Family */}
            <div className="pud-product-filter-field">
              <label className="pud-product-filter-label" htmlFor="pud-product-filter-family">Family</label>
              <select
                id="pud-product-filter-family"
                className="pud-product-filter-select"
                value={filters.family}
                onChange={(e) => handleFamilyChange(e.target.value)}
                disabled={!filters.segment}
              >
                <option value="">
                  {!filters.segment
                    ? "Select Segment first"
                    : loadingFamilies
                      ? "Loading..."
                      : "Select Family"}
                </option>
                {familyOptions.map((fam) => (
                  <option key={fam.family} value={fam.family}>
                    {fam.family} - {fam.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div className="pud-product-filter-field">
              <label className="pud-product-filter-label" htmlFor="pud-product-filter-class">Class</label>
              <select
                id="pud-product-filter-class"
                className="pud-product-filter-select"
                value={filters.class}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={!filters.family}
              >
                <option value="">
                  {!filters.family
                    ? "Select Family first"
                    : loadingClasses
                      ? "Loading..."
                      : "Select Class"}
                </option>
                {classOptions.map((cls) => (
                  <option key={cls.class} value={cls.class}>
                    {cls.class} - {cls.classTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Commodity */}
            <div className="pud-product-filter-field">
              <label className="pud-product-filter-label" htmlFor="pud-product-filter-commodity">Commodity</label>
              <select
                id="pud-product-filter-commodity"
                className="pud-product-filter-select"
                value={filters.commodity}
                onChange={(e) => handleCommodityChange(e.target.value)}
                disabled={!filters.class}
              >
                <option value="">
                  {!filters.class
                    ? "Select Class first"
                    : loadingCommodities
                      ? "Loading..."
                      : "Select Commodity"}
                </option>
                {commodityOptions.map((com) => (
                  <option key={com.commodity} value={com.commodity}>
                    {com.commodity} - {com.commodityTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="pud-product-search-field">
            <label className="pud-product-filter-label" htmlFor="pud-product-search">Search Products</label>
            <div className="pud-product-search-input-wrapper">
              <input
                id="pud-product-search"
                type="text"
                className="pud-product-search-input"
                placeholder="Search by product name, description..."
                value={filters.search}
                onChange={handleSearchChange}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
              />
              <button
                type="button"
                className="pud-product-search-button"
                onClick={handleSearchSubmit}
                disabled={loadingResults}
                aria-label="Search products"
              >
                {loadingResults ? <IconLoader /> : <IconSearch />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Results Section ---- */}
      <div className="pud-product-results">
        {error && (
          <div className="pud-product-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        {loadingResults ? (
          <div className="pud-product-loading">
            <Loader size={28} message="Loading products..." />
          </div>
        ) : hasSearched && catalogResults.length === 0 ? (
          <EmptyState
            className="pud-product-empty"
            icon={<IconFileGeneric />}
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
              {pagedProductResults.map((item) => {
                const firstAssetId = item.asset && item.asset[0]?.id;
                const imageSrc = firstAssetId ? productAssetImages[firstAssetId] : undefined;
                return (
                  <div
                    className="pud-catalog-card"
                    key={item.catalogId}
                    onClick={() => openProductDetail(item.catalogId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openProductDetail(item.catalogId);
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
                        <div className="pud-catalog-card-media-placeholder"><IconFileGeneric /></div>
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
                    </div>
                  </div>
                );
              })}
            </div>

            {catalogResults.length > PRODUCT_PAGE_SIZE && (
              <nav className="pud-catalog-pagination" aria-label="Product pages">
                <button
                  type="button"
                  className="pud-btn pud-btn-outline"
                  disabled={productPage === 0}
                  onClick={() => setProductPage((p) => Math.max(0, p - 1))}
                >
                  <IconChevronLeft /> Previous
                </button>
                <span className="pud-catalog-pagination-info">
                  Page {productPage + 1} of {productTotalPages}
                </span>
                <button
                  type="button"
                  className="pud-btn pud-btn-outline"
                  disabled={productPage >= productTotalPages - 1}
                  onClick={() => setProductPage((p) => Math.min(productTotalPages - 1, p + 1))}
                >
                  Next <IconChevronRight />
                </button>
              </nav>
            )}
          </>
        ) : (
          !hasSearched && (
            <EmptyState
              className="pud-product-empty"
              icon={<IconSearch />}
              title="Start searching"
              description="Select filters or enter a search term to find products"
            />
          )
        )}
      </div>
    </div>
  );
};

export default Product;
