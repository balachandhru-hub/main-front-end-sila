import React, { useState, useEffect } from "react";
import "./Product.css";
import "../../../remote-supplier/src/components/Catalog.css";
import {
  fetchSegments,
  fetchFamilies,
  fetchClassifications,
  fetchCommodities,
} from "../api/masterdataApi";
import { fetchBuyerCatalog } from "../api/Buyerapi";

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

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconExternalLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
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

interface BuyerCatalogItem {
  supplierId: string;
  catalogId: string;
  supplierName: string;
  catalogName: string;
  description: string;
  price: number;
  currency: string;
  unitOfMeasure: string;
  segment: number;
  segmentTitle: string;
  family: number;
  familyTitle: string;
  commodity: number;
  commodityTitle: string;
  class: number;
  classTitle: string;
  catalogType: string;
  isPunchOut: boolean;
  punchOutUrl: string;
  hasCatalog: boolean;
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
  const [classOptions, setClassOptions] = useState<Array<{ class: number; title: string }>>([]);
  const [commodityOptions, setCommodityOptions] = useState<Array<{ commodity: number; title: string }>>([]);

  // ---- Loading States ----
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingCommodities, setLoadingCommodities] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // ---- Results State ----
  const [catalogResults, setCatalogResults] = useState<BuyerCatalogItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- PunchOut Preview Modal State ----
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [punchOutPreviewUrl, setPunchOutPreviewUrl] = useState<string>("");
  const [punchOutIframeBlocked, setPunchOutIframeBlocked] = useState(false);

  // ---- Load Segments + All Products on Component Mount ----
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSegments = async () => {
    setLoadingSegments(true);
    try {
      const segments = await fetchSegments();
      if (Array.isArray(segments)) {
        setSegmentOptions(segments);
      }
    } catch (err) {
      console.error("Failed to load segments", err);
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
        console.error("Failed to load families", err);
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
        console.error("Failed to load classes", err);
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
        console.error("Failed to load commodities", err);
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

  // ---- Fetch products for a given filter state ----
  // Used both for the initial unfiltered load (all products) and for
  // subsequent filtered/search requests, so the two stay in sync.
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
      } else {
        setError((results as any)?.message || "Failed to fetch catalogs. Please try again.");
        setCatalogResults([]);
      }
      setHasSearched(true);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch catalogs. Please try again.");
      setCatalogResults([]);
      setHasSearched(true);
    } finally {
      setLoadingResults(false);
    }
  };

  // ---- Handle Search/Filter Submit ----
  const handleSearchSubmit = () => {
    fetchProducts(filters);
  };

  // ---- PunchOut Preview Handler (mirrors Catalog.tsx) ----
  const handlePunchOutPreview = (url: string) => {
    setPunchOutPreviewUrl(url);
    setShowPunchOutModal(true);
    setPunchOutIframeBlocked(false);
  };

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
              <label className="pud-product-filter-label">Segment</label>
              <select
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
              <label className="pud-product-filter-label">Family</label>
              <select
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
              <label className="pud-product-filter-label">Class</label>
              <select
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
                    {cls.class} - {cls.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Commodity */}
            <div className="pud-product-filter-field">
              <label className="pud-product-filter-label">Commodity</label>
              <select
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
                    {com.commodity} - {com.title}
                  </option>
                ))}
              </select>
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

            <div className="pud-product-list">
              {catalogResults.map((item) => (
                <div className="pud-product-item" key={item.catalogId}>
                  <div className="pud-product-item-header">
                    <div>
                      <h3 className="pud-product-item-title">{item.catalogName}</h3>
                      <p className="pud-product-item-supplier">by {item.supplierName}</p>
                    </div>
                    {item.isPunchOut && (
                      <span className="pud-product-item-badge pud-product-item-badge-punchout">
                        PunchOut
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="pud-product-item-desc">{item.description}</p>
                  )}

                  <div className="pud-product-item-meta">
                    {item.price > 0 && (
                      <span className="pud-product-item-price">
                        {item.currency} {item.price.toFixed(2)}
                      </span>
                    )}
                    {item.unitOfMeasure && (
                      <span className="pud-product-item-uom">{item.unitOfMeasure}</span>
                    )}
                    {item.catalogType && (
                      <span className="pud-product-item-type">{item.catalogType}</span>
                    )}
                  </div>

                  <div className="pud-product-item-tags">
                    {item.segmentTitle && (
                      <span className="pud-product-item-tag">{item.segmentTitle}</span>
                    )}
                    {item.familyTitle && (
                      <span className="pud-product-item-tag">{item.familyTitle}</span>
                    )}
                    {item.classTitle && (
                      <span className="pud-product-item-tag">{item.classTitle}</span>
                    )}
                    {item.commodityTitle && (
                      <span className="pud-product-item-tag">{item.commodityTitle}</span>
                    )}
                  </div>

                  {item.isPunchOut && item.punchOutUrl && (
                    <div className="pud-product-item-action">
                      <button
                        type="button"
                        className="pud-product-item-link"
                        onClick={() => handlePunchOutPreview(item.punchOutUrl)}
                      >
                        Visit Supplier
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

      {/* ---- PunchOut Preview Modal (mirrors Catalog.tsx) ---- */}
      {showPunchOutModal && (
        <div className="pud-modal-overlay" onClick={() => setShowPunchOutModal(false)}>
          <div className="pud-modal pud-modal-punchout" onClick={(e) => e.stopPropagation()}>
            <div className="pud-modal-header">
              <button className="pud-modal-close" onClick={() => setShowPunchOutModal(false)} title="Close">
                <IconClose />
              </button>
              <span className="pud-modal-badge">
                <IconExternalLink /> PunchOut Catalog
              </span>
              <h2 className="pud-modal-name">Catalog Website</h2>
            </div>

            <div className="pud-modal-body pud-punchout-viewer-container">
              {punchOutIframeBlocked ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px', color: '#64748b' }}>
                  <div style={{ fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
                    <p style={{ marginBottom: '12px', fontWeight: '600' }}>Website Cannot Be Embedded</p>
                    <p style={{ fontSize: '12px', marginBottom: '16px' }}>
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
      )}
    </div>
  );
};

export default Product;