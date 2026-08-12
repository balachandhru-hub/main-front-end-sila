import React, { useState, useEffect } from "react";
import "./Product.css";
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

  // ---- Load Segments on Component Mount ----
  useEffect(() => {
    loadSegments();
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

  // ---- Handle Search/Filter Submit ----
  const handleSearchSubmit = async () => {
    setLoadingResults(true);
    setError(null);
    setCatalogResults([]);

    try {
     const results = await fetchBuyerCatalog({
    segment: filters.segment || undefined,
    family: filters.family || undefined,
    class: filters.class || undefined,
    commodity: filters.commodity || undefined,
    search: filters.search || undefined,
    index: filters.index,
    limit: filters.limit,
});

if (Array.isArray(results)) {
    setCatalogResults(results);
} else {
    setError((results as any)?.message || "Failed to fetch catalogs. Please try again.");
}
setHasSearched(true);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch catalogs. Please try again.");
      setHasSearched(true);
    } finally {
      setLoadingResults(false);
    }
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
                      <a
                        href={item.punchOutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pud-product-item-link"
                      >
                        Visit Supplier
                      </a>
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
    </div>
  );
};

export default Product;