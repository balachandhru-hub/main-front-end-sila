import React from "react";
import "./Product.css";
import "../../../remote-supplier/src/components/Catalog.css";
import ProductFilters from "./product/ProductFilters";
import ProductResults from "./product/ProductResults";
import ProductDetailView from "./product/ProductDetailView";
import PunchOutView from "./product/PunchOutView";
import { useProductCatalog } from "../hooks/useProductCatalog";

/** Buyer product catalog: filter/search, results grid, product detail and PunchOut preview. */
const Product: React.FC = () => {
  const catalog = useProductCatalog();

  if (catalog.showPunchOutFullPage && catalog.selectedProduct) {
    return (
      <PunchOutView
        catalogName={catalog.selectedProduct.catalogName}
        previewUrl={catalog.punchOutPreviewUrl}
        iframeBlocked={catalog.punchOutIframeBlocked}
        onIframeError={() => catalog.setPunchOutIframeBlocked(true)}
        onBack={() => catalog.setShowPunchOutFullPage(false)}
      />
    );
  }

  if (catalog.selectedProduct) {
    return (
      <ProductDetailView
        product={catalog.selectedProduct}
        images={catalog.selectedProductImages}
        selectedImageIndex={catalog.selectedImageIndex}
        loading={catalog.loadingProductDetail}
        loadingImages={catalog.loadingSelectedImages}
        error={catalog.productDetailError}
        onBack={catalog.closeProductDetail}
        onRetry={() => catalog.selectedProduct && catalog.openProductDetail(catalog.selectedProduct.catalogId)}
        onSelectImage={catalog.setSelectedImageIndex}
        onPrevImage={catalog.goToPrevProductImage}
        onNextImage={catalog.goToNextProductImage}
        onPunchOutPreview={catalog.handlePunchOutPreview}
      />
    );
  }

  return (
    <div className="pud-product-page">
      <div className="pud-product-header">
        <h1 className="pud-title">Product Catalog</h1>
        <p className="pud-subtitle">Search and filter products by classification</p>
      </div>

      <ProductFilters
        filters={catalog.filters}
        selectedSegment={catalog.selectedSegment}
        selectedFamily={catalog.selectedFamily}
        selectedClass={catalog.selectedClass}
        selectedCommodity={catalog.selectedCommodity}
        loadSegmentOptions={catalog.loadSegmentOptions}
        loadFamilyOptions={catalog.loadFamilyOptions}
        loadClassOptions={catalog.loadClassOptions}
        loadCommodityOptions={catalog.loadCommodityOptions}
        onSegmentChange={catalog.handleSegmentChange}
        onFamilyChange={catalog.handleFamilyChange}
        onClassChange={catalog.handleClassChange}
        onCommodityChange={catalog.handleCommodityChange}
        onSearchChange={catalog.handleSearchChange}
        onSearchSubmit={catalog.handleSearchSubmit}
        loadingResults={catalog.loadingResults}
      />

      <ProductResults
        error={catalog.error}
        loading={catalog.loadingResults}
        hasSearched={catalog.hasSearched}
        catalogResults={catalog.catalogResults}
        pagedResults={catalog.pagedProductResults}
        productAssetImages={catalog.productAssetImages}
        onOpenDetail={catalog.openProductDetail}
        pageSize={catalog.PRODUCT_PAGE_SIZE}
        page={catalog.productPage}
        totalPages={catalog.productTotalPages}
        onPrevPage={() => catalog.setProductPage((p) => Math.max(0, p - 1))}
        onNextPage={() => catalog.setProductPage((p) => Math.min(catalog.productTotalPages - 1, p + 1))}
      />
    </div>
  );
};

export default Product;
