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
import { isErrorResponse, Dropdown } from "@vosox/shared-ui";
import type { DropdownValue, DropdownLoadParams, DropdownLoadResult } from "@vosox/shared-ui";

/* ============================== Icons ============================== */

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconFilter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconFileGeneric = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pud-loader">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const IconExternalLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  const SEGMENT_PAGE_SIZE = 40;

  // ---- Async paginated loader for the Segment Dropdown ----
  const loadSegmentOptions = async ({
    page,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    const pageIndex = page + 1; // Dropdown pages are 0-based; the API is 1-based
    const segments = await fetchSegments(pageIndex, SEGMENT_PAGE_SIZE);

    if (!Array.isArray(segments)) {
      return { options: [], hasMore: false };
    }

    setSegmentOptions((prev) => (page === 0 ? segments : [...prev, ...segments]));

    return {
      options: segments.map((seg) => ({
        name: `${seg.segment} - ${seg.title}`,
        value: String(seg.segment),
      })),
      hasMore: segments.length === SEGMENT_PAGE_SIZE,
    };
  };

  const FAMILY_PAGE_SIZE = 40;

  // ---- Async paginated loader for the Family Dropdown ----
  const loadFamilyOptions = async ({
    page,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    if (!filters.segment) {
      return { options: [], hasMore: false };
    }

    const pageIndex = page + 1; // Dropdown pages are 0-based; the API is 1-based
    const families = await fetchFamilies(filters.segment, { pageIndex, pageSize: FAMILY_PAGE_SIZE });

    if (!Array.isArray(families)) {
      return { options: [], hasMore: false };
    }

    setFamilyOptions((prev) => (page === 0 ? families : [...prev, ...families]));

    return {
      options: families.map((fam) => ({
        name: `${fam.family} - ${fam.title}`,
        value: String(fam.family),
      })),
      hasMore: families.length === FAMILY_PAGE_SIZE,
    };
  };

  const CLASS_PAGE_SIZE = 40;

  // ---- Async paginated loader for the Class Dropdown ----
  const loadClassOptions = async ({
    page,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    if (!filters.family) {
      return { options: [], hasMore: false };
    }

    const pageIndex = page + 1; // Dropdown pages are 0-based; the API is 1-based
    const classes = await fetchClassifications(filters.family, { pageIndex, pageSize: CLASS_PAGE_SIZE });

    if (!Array.isArray(classes)) {
      return { options: [], hasMore: false };
    }

    setClassOptions((prev) => (page === 0 ? classes : [...prev, ...classes]));

    return {
      options: classes.map((cls) => ({
        name: `${cls.class} - ${cls.classTitle}`,
        value: String(cls.class),
      })),
      hasMore: classes.length === CLASS_PAGE_SIZE,
    };
  };

  const COMMODITY_PAGE_SIZE = 40;

  // ---- Async paginated loader for the Commodity Dropdown ----
  const loadCommodityOptions = async ({
    page,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    if (!filters.class) {
      return { options: [], hasMore: false };
    }

    const pageIndex = page + 1; // Dropdown pages are 0-based; the API is 1-based
    const commodities = await fetchCommodities(filters.class, { pageIndex, pageSize: COMMODITY_PAGE_SIZE });

    if (!Array.isArray(commodities)) {
      return { options: [], hasMore: false };
    }

    setCommodityOptions((prev) => (page === 0 ? commodities : [...prev, ...commodities]));

    return {
      options: commodities.map((com) => ({
        name: `${com.commodity} - ${com.commodityTitle}`,
        value: String(com.commodity),
      })),
      hasMore: commodities.length === COMMODITY_PAGE_SIZE,
    };
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#64748b' }}>
                <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
                  <p style={{ fontWeight: '600' }}>Website Cannot Be Embedded</p>
                  <p style={{ fontSize: '12px' }}>
                    This website has restricted embedding for security reasons.
                  </p>
                </div>
                <a
                  href={punchOutPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pud-btn pud-btn-message"
                  style={{ background: "#2563eb", color: "#ffffff", textDecoration: "none" }}
                >
                  <IconExternalLink /> Open in New Tab
                </a>
              </div>
            ) : (
              <iframe
                src={punchOutPreviewUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
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

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "32px",
            alignItems: "flex-start",
            padding: "2rem 0.5rem 1rem",
          }}
        >
          <div style={{ flex: "1 1 360px", maxWidth: "480px", minWidth: "280px" }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {loadingProductDetail || loadingSelectedImages ? (
                <div className="pud-spinner" />
              ) : productDetailError ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
                  <div style={{ fontSize: '15px', marginBottom: '16px' }}>{productDetailError}</div>
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
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ color: "#94a3b8" }}><IconFileGeneric /></div>
              )}

              {selectedProductImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPrevProductImage}
                    title="Previous image"
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      border: "1px solid #e2e8f0",
                      background: "rgba(255,255,255,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <IconChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextProductImage}
                    title="Next image"
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      border: "1px solid #e2e8f0",
                      background: "rgba(255,255,255,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <IconChevronRight />
                  </button>
                </>
              )}
            </div>

            {selectedProductImages.length > 1 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                {selectedProductImages.map((src, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: idx === selectedImageIndex ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      opacity: idx === selectedImageIndex ? 1 : 0.75,
                    }}
                  >
                    <img src={src} alt={`thumb-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1 1 320px" }}>
            <h1 className="pud-title">{selectedProduct.catalogName}</h1>
            <p className="pud-product-item-supplier">by {selectedProduct.supplierName}</p>

            {selectedProduct.catalogType && (
              <span className="pud-catalog-card-tag" style={{ display: "inline-block", width: "fit-content" }}>
                {selectedProduct.catalogType}
              </span>
            )}

            {selectedProduct.description && (
              <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.6 }}>{selectedProduct.description}</p>
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

            {/* ✅ FIXED: Show classification even if titles are null */}
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
              <Dropdown
                label="Segment"
                placeholder="Select Segment"
                isAsync
                loadOptions={loadSegmentOptions}
                value={
                  filters.segment
                    ? {
                        name: `${filters.segment} - ${
                          segmentOptions.find((seg) => seg.segment === filters.segment)?.title ?? ""
                        }`,
                        value: String(filters.segment),
                      }
                    : null
                }
                onChange={(val: DropdownValue | null) => handleSegmentChange(val?.value ?? "")}
              />
            </div>

            {/* Family */}
            <div className="pud-product-filter-field">
              <Dropdown
                label="Family"
                placeholder={!filters.segment ? "Select Segment first" : "Select Family"}
                isDisable={!filters.segment}
                isAsync
                loadOptions={loadFamilyOptions}
                cacheUniques={[filters.segment]}
                value={
                  filters.family
                    ? {
                        name: `${filters.family} - ${
                          familyOptions.find((fam) => fam.family === filters.family)?.title ?? ""
                        }`,
                        value: String(filters.family),
                      }
                    : null
                }
                onChange={(val: DropdownValue | null) => handleFamilyChange(val?.value ?? "")}
              />
            </div>

            {/* Class */}
            <div className="pud-product-filter-field">
              <Dropdown
                label="Class"
                placeholder={!filters.family ? "Select Family first" : "Select Class"}
                isDisable={!filters.family}
                isAsync
                loadOptions={loadClassOptions}
                cacheUniques={[filters.family]}
                value={
                  filters.class
                    ? {
                        name: `${filters.class} - ${
                          classOptions.find((cls) => cls.class === filters.class)?.classTitle ?? ""
                        }`,
                        value: String(filters.class),
                      }
                    : null
                }
                onChange={(val: DropdownValue | null) => handleClassChange(val?.value ?? "")}
              />
            </div>

            {/* Commodity */}
            <div className="pud-product-filter-field">
              <Dropdown
                label="Commodity"
                placeholder={!filters.class ? "Select Class first" : "Select Commodity"}
                isDisable={!filters.class}
                isAsync
                loadOptions={loadCommodityOptions}
                cacheUniques={[filters.class]}
                value={
                  filters.commodity
                    ? {
                        name: `${filters.commodity} - ${
                          commodityOptions.find((com) => com.commodity === filters.commodity)?.commodityTitle ?? ""
                        }`,
                        value: String(filters.commodity),
                      }
                    : null
                }
                onChange={(val: DropdownValue | null) => handleCommodityChange(val?.value ?? "")}
              />
            </div>
          </div>

          {/* Search Input */}
          <div className="pud-product-search-field">
            <label className="pud-product-filter-label">Search Products</label>
            <div className="pud-product-search-input-wrapper">
              <input
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
                className="pud-product-search-button"
                onClick={handleSearchSubmit}
                disabled={loadingResults}
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
          <div className="pud-product-error">
            <p>{error}</p>
          </div>
        )}

        {loadingResults ? (
          <div className="pud-product-loading">
            <IconLoader /> Loading products...
          </div>
        ) : hasSearched && catalogResults.length === 0 ? (
          <div className="pud-product-empty">
            <div className="pud-product-empty-icon"><IconFileGeneric /></div>
            <p className="pud-product-empty-text">No products found</p>
            <p className="pud-product-empty-subtext">Try adjusting your filters or search terms</p>
          </div>
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
                    style={{ cursor: "pointer" }}
                    role="button"
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
              <div className="pud-catalog-pagination">
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
              </div>
            )}
          </>
        ) : (
          !hasSearched && (
            <div className="pud-product-empty">
              <div className="pud-product-empty-icon"><IconSearch /></div>
              <p className="pud-product-empty-text">Start searching</p>
              <p className="pud-product-empty-subtext">Select filters or enter a search term to find products</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Product;