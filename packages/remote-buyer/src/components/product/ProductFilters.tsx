import React from "react";
import type { DropdownValue, DropdownLoadParams, DropdownLoadResult } from "@vosox/shared-ui";
import { Dropdown, FilterIcon, LoaderIcon, SearchIcon } from "@vosox/shared-ui";
import type { ProductFilterState } from "./types";

interface ProductFiltersProps {
  filters: ProductFilterState;
  selectedSegment: DropdownValue | null;
  selectedFamily: DropdownValue | null;
  selectedClass: DropdownValue | null;
  selectedCommodity: DropdownValue | null;
  loadSegmentOptions: (params: DropdownLoadParams) => Promise<DropdownLoadResult>;
  loadFamilyOptions: (params: DropdownLoadParams) => Promise<DropdownLoadResult>;
  loadClassOptions: (params: DropdownLoadParams) => Promise<DropdownLoadResult>;
  loadCommodityOptions: (params: DropdownLoadParams) => Promise<DropdownLoadResult>;
  onSegmentChange: (val: DropdownValue | null) => void;
  onFamilyChange: (val: DropdownValue | null) => void;
  onClassChange: (val: DropdownValue | null) => void;
  onCommodityChange: (val: DropdownValue | null) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: () => void;
  loadingResults: boolean;
}

/** Classification filter dropdowns and the product search box. */
const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  selectedSegment,
  selectedFamily,
  selectedClass,
  selectedCommodity,
  loadSegmentOptions,
  loadFamilyOptions,
  loadClassOptions,
  loadCommodityOptions,
  onSegmentChange,
  onFamilyChange,
  onClassChange,
  onCommodityChange,
  onSearchChange,
  onSearchSubmit,
  loadingResults,
}) => (
  <div className="pud-product-filters">
    <div className="pud-product-filter-card">
      <div className="pud-product-filter-title">
        <FilterIcon /> Filter by Classification
      </div>

      <div className="pud-product-filter-grid">
        <div className="pud-product-filter-field">
          <Dropdown
            label="Segment"
            placeholder="Select Segment"
            isAsync
            loadOptions={loadSegmentOptions}
            value={selectedSegment}
            onChange={onSegmentChange}
          />
        </div>

        <div className="pud-product-filter-field">
          <Dropdown
            label="Family"
            placeholder={!filters.segment ? "Select Segment first" : "Select Family"}
            isDisable={!filters.segment}
            isAsync
            loadOptions={loadFamilyOptions}
            cacheUniques={[filters.segment]}
            value={selectedFamily}
            onChange={onFamilyChange}
          />
        </div>

        <div className="pud-product-filter-field">
          <Dropdown
            label="Class"
            placeholder={!filters.family ? "Select Family first" : "Select Class"}
            isDisable={!filters.family}
            isAsync
            loadOptions={loadClassOptions}
            cacheUniques={[filters.family]}
            value={selectedClass}
            onChange={onClassChange}
          />
        </div>

        <div className="pud-product-filter-field">
          <Dropdown
            label="Commodity"
            placeholder={!filters.class ? "Select Class first" : "Select Commodity"}
            isDisable={!filters.class}
            isAsync
            loadOptions={loadCommodityOptions}
            cacheUniques={[filters.class]}
            value={selectedCommodity}
            onChange={onCommodityChange}
          />
        </div>
      </div>

      <div className="pud-product-search-field">
        <label className="pud-product-filter-label" htmlFor="pud-product-search">Search Products</label>
        <div className="pud-product-search-input-wrapper">
          <input
            id="pud-product-search"
            type="text"
            className="pud-product-search-input"
            placeholder="Search by product name, description..."
            value={filters.search}
            onChange={onSearchChange}
            onKeyPress={(e) => {
              if (e.key === "Enter") onSearchSubmit();
            }}
          />
          <button
            type="button"
            className="pud-product-search-button"
            onClick={onSearchSubmit}
            disabled={loadingResults}
            aria-label="Search products"
          >
            {loadingResults ? <LoaderIcon className="pud-loader" /> : <SearchIcon />}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ProductFilters;
