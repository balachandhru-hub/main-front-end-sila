import { useEffect, useState } from "react";
import {
  fetchSegments,
  fetchFamilies,
  fetchClassifications,
  fetchCommodities,
} from "../api/masterdataApi";
import { fetchBuyerCatalog, fetchBuyerAsset, fetchBuyerCatalogDetail } from "../api/Buyerapi";
import type { BuyerCatalogResponse as BuyerCatalogResponseType } from "../api/Buyerapi";
import type { DropdownValue, DropdownLoadParams, DropdownLoadResult } from "@vosox/shared-ui";
import { isErrorResponse } from "@vosox/shared-ui";
import type { ProductFilterState } from "../components/product/types";

const PRODUCT_PAGE_SIZE = 10;
const SEGMENT_PAGE_SIZE = 40;
const FAMILY_PAGE_SIZE = 40;
const CLASS_PAGE_SIZE = 40;
const COMMODITY_PAGE_SIZE = 40;

/** All state and API calls behind the buyer product catalog: filters, search, results paging, product detail and PunchOut preview. */
export const useProductCatalog = () => {
  // ---- Filter State ----
  const [filters, setFilters] = useState<ProductFilterState>({
    segment: "",
    family: "",
    class: "",
    commodity: "",
    search: "",
    index: 0,
    limit: 20,
  });

  // ---- Selected Classification Values (kept as-is from Dropdown's onChange so the label never goes stale) ----
  const [selectedSegment, setSelectedSegment] = useState<DropdownValue | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<DropdownValue | null>(null);
  const [selectedClass, setSelectedClass] = useState<DropdownValue | null>(null);
  const [selectedCommodity, setSelectedCommodity] = useState<DropdownValue | null>(null);

  // ---- Loading States ----
  const [loadingResults, setLoadingResults] = useState(false);

  // ---- Results State ----
  const [catalogResults, setCatalogResults] = useState<BuyerCatalogResponseType[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productPage, setProductPage] = useState(0);
  const productTotalPages = Math.max(1, Math.ceil(catalogResults.length / PRODUCT_PAGE_SIZE));
  const pagedProductResults = catalogResults.slice(
    productPage * PRODUCT_PAGE_SIZE,
    productPage * PRODUCT_PAGE_SIZE + PRODUCT_PAGE_SIZE
  );

  const [productAssetImages, setProductAssetImages] = useState<Record<string, string>>({});

  // Detail view
  const [selectedProduct, setSelectedProduct] = useState<BuyerCatalogResponseType | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingSelectedImages, setLoadingSelectedImages] = useState(false);
  const [loadingProductDetail, setLoadingProductDetail] = useState(false);
  const [productDetailError, setProductDetailError] = useState<string | null>(null);

  const [showPunchOutFullPage, setShowPunchOutFullPage] = useState(false);
  const [punchOutPreviewUrl, setPunchOutPreviewUrl] = useState<string>("");
  const [punchOutIframeBlocked, setPunchOutIframeBlocked] = useState(false);

  const fetchProducts = async (filterState: ProductFilterState) => {
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

  // ---- Async paginated loader for the Segment Dropdown ----
  const loadSegmentOptions = async ({
    page,
    search,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    const pageIndex = page * SEGMENT_PAGE_SIZE; // Dropdown pages are 0-based; the API is 1-based
    const segments = await fetchSegments(pageIndex, SEGMENT_PAGE_SIZE, search || undefined);

    if (!Array.isArray(segments)) {
      return { options: [], hasMore: false };
    }

    return {
      options: segments.map((seg) => ({
        name: seg.title,
        value: String(seg.segment),
      })),
      hasMore: segments.length === SEGMENT_PAGE_SIZE,
    };
  };

  // ---- Async paginated loader for the Family Dropdown ----
  const loadFamilyOptions = async ({
    page,
    search,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    if (!filters.segment) {
      return { options: [], hasMore: false };
    }

    const pageIndex = page * FAMILY_PAGE_SIZE; // Dropdown pages are 0-based; the API is 1-based
    const families = await fetchFamilies(filters.segment, { pageIndex, pageSize: FAMILY_PAGE_SIZE });

    if (!Array.isArray(families)) {
      return { options: [], hasMore: false };
    }

    const searchTerm = search.trim().toLowerCase();
    const options = families
      .filter((fam) => !searchTerm || fam.title.toLowerCase().includes(searchTerm))
      .map((fam) => ({
        name: fam.title,
        value: String(fam.family),
      }));

    return {
      options,
      hasMore: families.length === FAMILY_PAGE_SIZE,
    };
  };

  // ---- Async paginated loader for the Class Dropdown ----
  const loadClassOptions = async ({
    page,
    search,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    if (!filters.family) {
      return { options: [], hasMore: false };
    }

    const pageIndex = page * CLASS_PAGE_SIZE; // Dropdown pages are 0-based; the API is 1-based
    const classes = await fetchClassifications(filters.family, { pageIndex, pageSize: CLASS_PAGE_SIZE });

    if (!Array.isArray(classes)) {
      return { options: [], hasMore: false };
    }

    const searchTerm = search.trim().toLowerCase();
    const options = classes
      .filter((cls) => !searchTerm || cls.classTitle.toLowerCase().includes(searchTerm))
      .map((cls) => ({
        name: cls.classTitle,
        value: String(cls.class),
      }));

    return {
      options,
      hasMore: classes.length === CLASS_PAGE_SIZE,
    };
  };

  // ---- Async paginated loader for the Commodity Dropdown ----
  const loadCommodityOptions = async ({
    page,
    search,
  }: DropdownLoadParams): Promise<DropdownLoadResult> => {
    if (!filters.class) {
      return { options: [], hasMore: false };
    }

    const pageIndex = page * COMMODITY_PAGE_SIZE; // Dropdown pages are 0-based; the API is 1-based
    const commodities = await fetchCommodities(filters.class, { pageIndex, pageSize: COMMODITY_PAGE_SIZE });

    if (!Array.isArray(commodities)) {
      return { options: [], hasMore: false };
    }

    const searchTerm = search.trim().toLowerCase();
    const options = commodities
      .filter((com) => !searchTerm || com.commodityTitle.toLowerCase().includes(searchTerm))
      .map((com) => ({
        name: com.commodityTitle,
        value: String(com.commodity),
      }));

    return {
      options,
      hasMore: commodities.length === COMMODITY_PAGE_SIZE,
    };
  };

  const handleSegmentChange = (val: DropdownValue | null) => {
    setFilters((prev) => ({
      ...prev,
      segment: val ? Number(val.value) : "",
      family: "",
      class: "",
      commodity: "",
    }));

    setSelectedSegment(val);
    setSelectedFamily(null);
    setSelectedClass(null);
    setSelectedCommodity(null);
  };

  const handleFamilyChange = (val: DropdownValue | null) => {
    setFilters((prev) => ({
      ...prev,
      family: val ? Number(val.value) : "",
      class: "",
      commodity: "",
    }));

    setSelectedFamily(val);
    setSelectedClass(null);
    setSelectedCommodity(null);
  };

  const handleClassChange = (val: DropdownValue | null) => {
    setFilters((prev) => ({
      ...prev,
      class: val ? Number(val.value) : "",
      commodity: "",
    }));

    setSelectedClass(val);
    setSelectedCommodity(null);
  };

  const handleCommodityChange = (val: DropdownValue | null) => {
    setFilters((prev) => ({
      ...prev,
      commodity: val ? Number(val.value) : "",
    }));

    setSelectedCommodity(val);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters((prev) => ({
      ...prev,
      search: value,
    }));

    if (value.trim() === "") {
      fetchProducts({
        ...filters,
        search: "",
        index: 0,
      });
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

  const openProductDetail = async (catalogId: string) => {
    setLoadingProductDetail(true);
    setProductDetailError(null);
    setSelectedProduct(null);
    setSelectedImageIndex(0);

    try {
      const response = await fetchBuyerCatalogDetail(catalogId);

      if (isErrorResponse(response)) {
        setProductDetailError(
          response.description || response.message || 'Failed to load product details.'
        );
        return;
      }

      setSelectedProduct(response);

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

  return {
    filters,
    selectedSegment,
    selectedFamily,
    selectedClass,
    selectedCommodity,
    loadingResults,
    catalogResults,
    hasSearched,
    error,
    PRODUCT_PAGE_SIZE,
    productPage,
    setProductPage,
    productTotalPages,
    pagedProductResults,
    productAssetImages,
    selectedProduct,
    selectedImageIndex,
    setSelectedImageIndex,
    loadingSelectedImages,
    loadingProductDetail,
    productDetailError,
    showPunchOutFullPage,
    setShowPunchOutFullPage,
    punchOutPreviewUrl,
    punchOutIframeBlocked,
    setPunchOutIframeBlocked,
    loadSegmentOptions,
    loadFamilyOptions,
    loadClassOptions,
    loadCommodityOptions,
    handleSegmentChange,
    handleFamilyChange,
    handleClassChange,
    handleCommodityChange,
    handleSearchChange,
    handleSearchSubmit,
    openProductDetail,
    closeProductDetail,
    selectedProductImages,
    goToPrevProductImage,
    goToNextProductImage,
    handlePunchOutPreview,
  };
};
