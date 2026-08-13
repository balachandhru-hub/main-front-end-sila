import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import "./Catalog.css";
import { useAuthStore } from "../../../host-app/src/store/useAuthStore";
import {
    createSupplierCatalog,
    fetchMetadataReferenceList,
    fetchCurrencies,
    fetchSegments,
    fetchFamilies,
    fetchClassifications,
    fetchCommodities,
    fetchSupplierCatalog,
    fetchSupplierAsset,
    fetchUnits,
    type UnitItem,
} from "../api/supplierApi";
import type { CatalogAssetDto, CatalogDetailDto, SupplierCatalogListItem } from "../dto/supplierDto";

/* ============================== Types ============================== */

export interface CatalogItem {
    source: "created" | "uploaded";
    catalogName: string;
    description: string;
    price: number;
    currency: string;
    unitOfMeasure: string;
    catalogType: string;
    segment: number;
    segmentTitle: string;
    family: number;
    familyTitle: string;
    commodity: number;
    commodityTitle: string;
    class: number;
    classTitle: string;
    isPunchOut: boolean;
    punchOutUrl: string;
    fileName?: string;
    filePreview?: string | null;
    fileType?: string;
    addedAt: string;
}

const emptyCatalogForm = {
    catalogName: "",
    description: "",
    price: "",
    currency: "",
    unitOfMeasure: "",
    catalogType: "",
    segment: "",
    segmentTitle: "",
    family: "",
    familyTitle: "",
    commodity: "",
    commodityTitle: "",
    class: "",
    classTitle: "",
    isPunchOut: false,
    punchOutUrl: "",
};

type CatalogFormState = typeof emptyCatalogForm;


/* ============================== Helpers ============================== */

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
};

/* ============================== Icons ============================== */

interface IconProps {
    style?: React.CSSProperties;
    className?: string;
}

const NavIconCatalog = (props: IconProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);

const IconChevronRight = (props: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const IconChevronLeft = (props: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const IconPlusCircle = (props: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

const IconUploadCloud = (props: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 16.5v.01" />
        <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 18h11.5z" />
        <path d="M12 12v7" />
        <path d="m9.5 14.5 2.5-2.5 2.5 2.5" />
    </svg>
);

const IconUploadCloudLarge = (props: IconProps) => (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 18h11.5z" />
        <path d="M12 12v7" />
        <path d="m9.5 14.5 2.5-2.5 2.5 2.5" />
    </svg>
);

const IconGrid = (props: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const IconGridLarge = (props: IconProps) => (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const IconClose = (props: IconProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconCheckCircle = (props: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
);


const IconFileGeneric = (props: IconProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
    </svg>
);



const IconExternalLink = (props: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

/* ============================== Component ============================== */

interface CatalogProps {
    onShowCatalogList?: () => void;
    onCloseCatalogList?: () => void;
    fullViewContainer?: HTMLDivElement | null;
    isAdmin?: boolean;
}

const Catalog: React.FC<CatalogProps> = ({
    onShowCatalogList,
    onCloseCatalogList,
    fullViewContainer,
    isAdmin = false
}) => {
    // ---- Sidebar expansion + modal visibility ----
    const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
    const [showCreateCatalogModal, setShowCreateCatalogModal] = useState(false);
    const [showUploadCatalogModal, setShowUploadCatalogModal] = useState(false);
    const [showCatalogListModal, setShowCatalogListModal] = useState(false);
    const [_catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

    // ---- PDF Preview Modal ----
    // const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
    // const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    // const [pdfPreviewFileName, setPdfPreviewFileName] = useState<string>("");

    // ---- PunchOut Preview Modal ----
    const [showPunchOutModal, setShowPunchOutModal] = useState(false);
    const [punchOutPreviewUrl, setPunchOutPreviewUrl] = useState<string>("");
    const [punchOutIframeBlocked, setPunchOutIframeBlocked] = useState(false);

    // ---- Show Catalogs: API-backed list state ----
    const [catalogList, setCatalogList] = useState<SupplierCatalogListItem[]>([]);
    const [loadingCatalogList, setLoadingCatalogList] = useState(false);
    const [catalogListError, setCatalogListError] = useState<string | null>(null);
    // Caches resolved image data (or URL) per asset id, so each card can show
    // its uploaded image after fetching GET /api/v1/supplier/asset/{assetId}.
    const [catalogAssetImages, setCatalogAssetImages] = useState<Record<string, string>>({});

    // ---- Catalog Detail (full-screen) view state ----
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<SupplierCatalogListItem | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [loadingSelectedImages, setLoadingSelectedImages] = useState(false);

    // Fetches a single asset's image content and caches it by asset id.
    const loadCatalogAssetImage = async (assetId: string) => {
        if (!assetId || catalogAssetImages[assetId]) return;
        try {
            const asset: any = await fetchSupplierAsset(assetId);
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
                setCatalogAssetImages((prev) => ({ ...prev, [assetId]: src as string }));
            }
        } catch (error) {
            // Non-fatal: the card just falls back to the placeholder icon.
        }
    };

    const loadCatalogList = async () => {
        setLoadingCatalogList(true);
        setCatalogListError(null);
        try {
            const data = await fetchSupplierCatalog();
            if (Array.isArray(data)) {
                setCatalogList(data);
                data.forEach((item) => {
                    const firstAssetId = item.assets && item.assets[0]?.id;
                    if (firstAssetId) {
                        loadCatalogAssetImage(firstAssetId);
                    }
                });
            } else {
                setCatalogListError((data as any)?.message || "Failed to load catalogs. Please try again.");
            }
        } catch (error: any) {

            setCatalogListError(error?.message || "Failed to load catalogs. Please try again.");
        } finally {
            setLoadingCatalogList(false);
        }
    };

    // Opens the full-screen detail view for a catalog item and resolves
    // every attached asset's image (not just the first) for the gallery.
    const openCatalogDetail = async (item: SupplierCatalogListItem) => {
        setSelectedCatalogItem(item);
        setSelectedImageIndex(0);
        const assetIds = (item.assets || []).map((a) => a.id).filter(Boolean) as string[];
        if (assetIds.length === 0) return;
        setLoadingSelectedImages(true);
        try {
            await Promise.all(assetIds.map((id) => loadCatalogAssetImage(id)));
        } finally {
            setLoadingSelectedImages(false);
        }
    };

    const closeCatalogDetail = () => {
        setSelectedCatalogItem(null);
        setSelectedImageIndex(0);
    };

    const selectedCatalogImages: string[] = selectedCatalogItem
        ? ((selectedCatalogItem.assets || [])
            .map((a) => (a.id ? catalogAssetImages[a.id] : undefined))
            .filter(Boolean) as string[])
        : [];

    const goToPrevImage = () => {
        setSelectedImageIndex((prev) =>
            selectedCatalogImages.length === 0 ? 0 : (prev - 1 + selectedCatalogImages.length) % selectedCatalogImages.length
        );
    };

    const goToNextImage = () => {
        setSelectedImageIndex((prev) =>
            selectedCatalogImages.length === 0 ? 0 : (prev + 1) % selectedCatalogImages.length
        );
    };

    // ---- Create Catalog form state ----
    const [catalogForm, setCatalogForm] = useState<CatalogFormState>(emptyCatalogForm);
    const [catalogFiles, setCatalogFiles] = useState<File[]>([]);
    const [catalogFilePreviews, setCatalogFilePreviews] = useState<string[]>([]);
    const [isDraggingCatalogFile, setIsDraggingCatalogFile] = useState(false);
    const [creatingCatalog, setCreatingCatalog] = useState(false);
    const [createCatalogError, setCreateCatalogError] = useState<string | null>(null);
    const [createCatalogSuccess, setCreateCatalogSuccess] = useState(false);
    const catalogFileInputRef = useRef<HTMLInputElement>(null);

    // ---- Catalog Type & Currency ----
    const [catalogTypeOptions, setCatalogTypeOptions] = useState<Array<{ id: string; key: string }>>([]);
    const [currencyOptions, setCurrencyOptions] = useState<Array<{ id: string; currencyName: string; sortNumber: number }>>([]);
    const [loadingCurrencies, setLoadingCurrencies] = useState(false);

    // ---- UNSPSC Classification Dropdowns State ----
    const [segmentOptions, setSegmentOptions] = useState<Array<{ segment: number; title: string }>>([]);
    const [familyOptions, setFamilyOptions] = useState<Array<{ family: number; title: string }>>([]);
    const [classOptions, setClassOptions] = useState<Array<{ class: number; title: string }>>([]);
    const [commodityOptions, setCommodityOptions] = useState<Array<{ commodity: number; title: string }>>([]);

    // ---- Loading states for classification ----
    const [loadingSegments, setLoadingSegments] = useState(false);
    const [loadingFamilies, setLoadingFamilies] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingCommodities, setLoadingCommodities] = useState(false);

    // ---- Load Catalog Types ----
    const loadCatalogTypes = async () => {
        const types = await fetchMetadataReferenceList(['CATALOG_TYPE']);
        if (Array.isArray(types)) {
            setCatalogTypeOptions(types);
        }
    };

    // ---- Load Currencies (lazy-load) ----
    const loadCurrencies = async () => {
        if (currencyOptions.length > 0 || loadingCurrencies) return;
        setLoadingCurrencies(true);
        try {
            const result = await fetchCurrencies({ index: 0, limit: 100 });
            if (result && 'items' in result && Array.isArray(result.items)) {
                setCurrencyOptions(result.items);
            }
        } catch (error) {

        } finally {
            setLoadingCurrencies(false);
        }
    };

    // ---- Load Segments on Modal Open ----
    const loadSegments = async () => {
        if (segmentOptions.length > 0) return;
        setLoadingSegments(true);
        try {
            const segments = await fetchSegments();
            if (Array.isArray(segments)) {
                setSegmentOptions(segments);
            }
        } catch (error) {

        } finally {
            setLoadingSegments(false);
        }
    };

    // ---- Handle Segment Selection ----
    const handleSegmentChange = async (segmentValue: string) => {
        const segmentNum = Number(segmentValue);

        updateCatalogField("segment", segmentValue);

        const selectedSegment = segmentOptions.find(s => s.segment === segmentNum);
        updateCatalogField("segmentTitle", selectedSegment?.title || "");

        updateCatalogField("family", "");
        updateCatalogField("familyTitle", "");
        updateCatalogField("class", "");
        updateCatalogField("classTitle", "");
        updateCatalogField("commodity", "");
        updateCatalogField("commodityTitle", "");

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
            } catch (error) {

            } finally {
                setLoadingFamilies(false);
            }
        }
    };

    // ---- Handle Family Selection ----
    const handleFamilyChange = async (familyValue: string) => {
        const familyNum = Number(familyValue);

        updateCatalogField("family", familyValue);

        const selectedFamily = familyOptions.find(f => f.family === familyNum);
        updateCatalogField("familyTitle", selectedFamily?.title || "");

        updateCatalogField("class", "");
        updateCatalogField("classTitle", "");
        updateCatalogField("commodity", "");
        updateCatalogField("commodityTitle", "");

        setClassOptions([]);
        setCommodityOptions([]);

        if (familyNum) {
            setLoadingClasses(true);
            try {
                const classes = await fetchClassifications(familyNum);
                if (Array.isArray(classes)) {
                    setClassOptions(classes);
                }
            } catch (error) {

            } finally {
                setLoadingClasses(false);
            }
        }
    };

    // ---- Handle Class Selection ----
    const handleClassChange = async (classValue: string) => {
        const classNum = Number(classValue);

        updateCatalogField("class", classValue);

        const selectedClass = classOptions.find(c => c.class === classNum);
        updateCatalogField("classTitle", selectedClass?.title || "");

        updateCatalogField("commodity", "");
        updateCatalogField("commodityTitle", "");

        setCommodityOptions([]);

        if (classNum) {
            setLoadingCommodities(true);
            try {
                const commodities = await fetchCommodities(classNum);
                if (Array.isArray(commodities)) {
                    setCommodityOptions(commodities);
                }
            } catch (error) {

            } finally {
                setLoadingCommodities(false);
            }
        }
    };

    // ---- Handle Commodity Selection ----
    const handleCommodityChange = (commodityValue: string) => {
        const commodityNum = Number(commodityValue);

        updateCatalogField("commodity", commodityValue);

        const selectedCommodity = commodityOptions.find(c => c.commodity === commodityNum);
        updateCatalogField("commodityTitle", selectedCommodity?.title || "");
    };

    const updateCatalogField = <K extends keyof CatalogFormState>(field: K, value: CatalogFormState[K]) => {
        setCatalogForm((prev) => ({ ...prev, [field]: value }));
    };

    // ---- Upload Catalog State ----
    const [uploadCatalogFiles, setUploadCatalogFiles] = useState<File[]>([]);
    const [isDraggingUploadFiles, setIsDraggingUploadFiles] = useState(false);
    const [uploadingCatalog, setUploadingCatalog] = useState(false);
    const [uploadCatalogError, setUploadCatalogError] = useState<string | null>(null);
    const [uploadCatalogSuccess, setUploadCatalogSuccess] = useState(false);
    const uploadCatalogInputRef = useRef<HTMLInputElement>(null);

    const closeCreateCatalogModal = () => {
        setShowCreateCatalogModal(false);
        setCatalogForm(emptyCatalogForm);
        setCatalogFiles([]);
        setCatalogFilePreviews([]);
        setCreateCatalogError(null);
        setCreateCatalogSuccess(false);
    };

    // Adds one or more images to the pending catalog-image list (multi-image upload).
    const handleCatalogFilesAdd = (files: FileList | File[] | null) => {
        if (!files) return;
        const incoming = Array.from(files);
        if (incoming.length === 0) return;

        const nonImage = incoming.find((f) => !f.type.startsWith("image/"));
        if (nonImage) {
            setCreateCatalogError("Only image files (JPG, PNG, GIF, WEBP, etc.) are allowed.");
            return;
        }

        setCreateCatalogError(null);
        setCatalogFiles((prev) => [...prev, ...incoming]);

        incoming.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                setCatalogFilePreviews((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveCatalogFile = (index: number) => {
        setCatalogFiles((prev) => prev.filter((_, i) => i !== index));
        setCatalogFilePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCreateCatalogSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catalogForm.catalogName.trim()) {
            setCreateCatalogError("Catalog name is required.");
            return;
        }
        if (catalogForm.isPunchOut && !catalogForm.punchOutUrl.trim()) {
            setCreateCatalogError("PunchOut URL is required when PunchOut is enabled.");
            return;
        }
        if (catalogFiles.length === 0) {
            setCreateCatalogError("Please upload at least one image for this catalog item.");
            return;
        }
        if (catalogFiles.some((f) => !f.type.startsWith("image/"))) {
            setCreateCatalogError("Only image files are allowed.");
            return;
        }
        setCreatingCatalog(true);
        setCreateCatalogError(null);
        try {
            const organizationId =
                useAuthStore.getState().organizationId || sessionStorage.getItem("vosox_organization_id") || "";

            if (!organizationId) {
                throw new Error("Organization ID not found. Please log in again.");
            }
            const entityTypesRaw = await fetchMetadataReferenceList(['ENTITY_TYPE']);
            const entityTypes = Array.isArray(entityTypesRaw) ? entityTypesRaw : [];
            const supplierEntityId = entityTypes.find((e) => e.key === 'SUPPLIER')?.id || '59476530-3c10-438b-b3b3-9db9e96e8d93';
            const entityType = entityTypes.find((e) => e.key === 'SUPPLIER')?.key || 'SUPPLIER';

            // Build one asset entry per uploaded image; the first image is marked
            // as the singleton/cover asset used for card & thumbnail previews.
            const assets: CatalogAssetDto[] = await Promise.all(
                catalogFiles.map(async (file, index) => {
                    const fileBytes = await fileToBase64(file);
                    return {
                        entityType: entityType,
                        entityId: supplierEntityId,
                        assetType: "CATALOG_ATTACHMENT",
                        fileBytes: fileBytes,
                        fileName: file.name,
                        contentType: file.type,
                        isSingletonAsset: index === 0,
                    };
                })
            );

            const catalogPayload: CatalogDetailDto = {
                catalogName: catalogForm.catalogName.trim(),
                description: catalogForm.description.trim(),
                price: Number(catalogForm.price) || 0,
                currency: catalogForm.currency.trim(),
                unitOfMeasure: catalogForm.unitOfMeasure,
                catalogType: catalogForm.catalogType.trim(),
                segment: Number(catalogForm.segment) || 0,
                segmentTitle: catalogForm.segmentTitle.trim(),
                family: Number(catalogForm.family) || 0,
                familyTitle: catalogForm.familyTitle.trim(),
                commodity: Number(catalogForm.commodity) || 0,
                commodityTitle: catalogForm.commodityTitle.trim(),
                class: Number(catalogForm.class) || 0,
                classTitle: catalogForm.classTitle.trim(),
                isPunchOut: catalogForm.isPunchOut,
                punchOutUrl: catalogForm.punchOutUrl.trim(),
                assets,
            } as CatalogDetailDto & { currency: string };

            await createSupplierCatalog({
                organizationId,
                catalog: catalogPayload,
            });

            setCatalogItems((prev) => [
                {
                    source: "created",
                    ...catalogPayload,
                    currency: catalogForm.currency.trim(),
                    fileName: catalogFiles[0]?.name,
                    filePreview: catalogFilePreviews[0] || null,
                    fileType: catalogFiles[0]?.type,
                    addedAt: new Date().toISOString(),
                },
                ...prev,
            ]);
            setCreateCatalogSuccess(true);
            loadCatalogList();
            setTimeout(closeCreateCatalogModal, 900);
        } catch (error: any) {
            setCreateCatalogError(error?.message || "Failed to create catalog. Please try again.");
        } finally {
            setCreatingCatalog(false);
        }
    };

    const closeUploadCatalogModal = () => {
        setShowUploadCatalogModal(false);
        setUploadCatalogFiles([]);
        setUploadCatalogError(null);
        setUploadCatalogSuccess(false);
    };

    const handleUploadCatalogFilesAdd = (files: FileList | File[] | null) => {
        if (!files) return;
        const newFiles = Array.from(files);
        if (newFiles.length === 0) return;
        setUploadCatalogFiles((prev) => [...prev, ...newFiles]);
        setUploadCatalogError(null);
    };

    const handleRemoveUploadCatalogFile = (index: number) => {
        setUploadCatalogFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUploadCatalogSubmit = async () => {
        if (uploadCatalogFiles.length === 0) {
            setUploadCatalogError("Please add at least one file or image to upload.");
            return;
        }
        setUploadingCatalog(true);
        setUploadCatalogError(null);
        try {
            await new Promise((resolve) => setTimeout(resolve, 600));

            const newItems: CatalogItem[] = await Promise.all(
                uploadCatalogFiles.map(
                    (file) =>
                        new Promise<CatalogItem>((resolve) => {
                            const base: CatalogItem = {
                                source: "uploaded",
                                catalogName: file.name,
                                description: "",
                                price: 0,
                                currency: "",
                                unitOfMeasure: "",
                                catalogType: "",
                                segment: 0,
                                segmentTitle: "",
                                family: 0,
                                familyTitle: "",
                                commodity: 0,
                                commodityTitle: "",
                                class: 0,
                                classTitle: "",
                                isPunchOut: true,
                                punchOutUrl: "",
                                fileName: file.name,
                                fileType: file.type,
                                filePreview: null,
                                addedAt: new Date().toISOString(),
                            };
                            if (file.type.startsWith("image/")) {
                                const reader = new FileReader();
                                reader.onload = () => resolve({ ...base, filePreview: reader.result as string });
                                reader.readAsDataURL(file);
                            } else {
                                resolve(base);
                            }
                        })
                )
            );
            setCatalogItems((prev) => [...newItems, ...prev]);
            setUploadCatalogSuccess(true);
            setTimeout(() => {
                closeUploadCatalogModal();
            }, 900);
        } catch (error: any) {
            setUploadCatalogError(error?.message || "Failed to upload files. Please try again.");
        } finally {
            setUploadingCatalog(false);
        }
    };


    // ---- PunchOut Preview Handler ----
    const handlePunchOutPreview = (url: string) => {
        setPunchOutPreviewUrl(url);
        setShowPunchOutModal(true);
        setPunchOutIframeBlocked(false);
    };
    // ---- Unit of Measure options state ----
    const [unitOptions, setUnitOptions] = useState<UnitItem[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(false);

    // ---- Load Units (lazy-load on click/focus) ----
    const loadUnits = async () => {
        if (unitOptions.length > 0 || loadingUnits) return;
        setLoadingUnits(true);
        try {
            const result = await fetchUnits({ index: 0, limit: 100 });
            if (result && 'items' in result && Array.isArray(result.items)) {
                setUnitOptions(result.items);
            }
        } catch (error) {
            console.error("Failed to fetch units", error);
        } finally {
            setLoadingUnits(false);
        }
    };

    return (
        <>
            {/* ---------- Sidebar nav entry ---------- */}
            <div
                className="pud-nav-item"
                onClick={() => setIsCatalogExpanded((prev) => !prev)}
            >
                <span className="pud-nav-icon"><NavIconCatalog /></span>
                <span className="pud-nav-label">Catalog</span>
                <span
                    className="pud-nav-chevron"
                    style={{ transform: isCatalogExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                    <IconChevronRight />
                </span>
            </div>
            {isCatalogExpanded && (
                <div className="pud-nav-subgroup">
                    {isAdmin && (
                        <div className="pud-nav-subitem" onClick={() => setShowCreateCatalogModal(true)}>
                            <span className="pud-nav-icon"><IconPlusCircle /></span>
                            <span className="pud-nav-label">Create Catalog</span>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="pud-nav-subitem" onClick={() => setShowUploadCatalogModal(true)}>
                            <span className="pud-nav-icon"><IconUploadCloud /></span>
                            <span className="pud-nav-label">Upload Catalog</span>
                        </div>
                    )}

                    <div
                        className="pud-nav-subitem"
                        onClick={() => {
                            setShowCatalogListModal(true);
                            onShowCatalogList?.();
                            loadCatalogList();
                        }}
                    >
                        <span className="pud-nav-icon"><IconGrid /></span>
                        <span className="pud-nav-label">Show Catalogs</span>

                    </div>
                </div>
            )}

            {/* ---------- Create Catalog Modal ---------- */}
            {showCreateCatalogModal && (
                <div className="pud-modal-overlay" onClick={closeCreateCatalogModal}>
                    <div className="pud-modal pud-modal-rfq" onClick={(e) => e.stopPropagation()}>
                        <div className="pud-modal-header">
                            <button className="pud-modal-close" onClick={closeCreateCatalogModal} title="Close">
                                <IconClose />
                            </button>
                            <span className="pud-modal-badge">
                                <NavIconCatalog /> New Catalog Item
                            </span>
                            <h2 className="pud-modal-name">Create Catalog</h2>
                            <div className="pud-modal-meta">
                                <span>Add a product or service to your catalog</span>
                            </div>
                        </div>

                        <form onSubmit={handleCreateCatalogSubmit}>
                            <div className="pud-modal-body">
                                {createCatalogSuccess && (
                                    <div className="pud-alert pud-alert-success">
                                        <IconCheckCircle /> Catalog created successfully!
                                    </div>
                                )}
                                {createCatalogError && (
                                    <div className="pud-alert pud-alert-error">{createCatalogError}</div>
                                )}

                                <div className="pud-catalog-form-grid">
                                    {/* ---- Basic Details ---- */}
                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Basic Details</span>
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-form-full">
                                        <label className="pud-catalog-form-label">Catalog Name *</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.catalogName}
                                            onChange={(e) => updateCatalogField("catalogName", e.target.value)}
                                            placeholder="e.g. Ergonomic Office Chair"
                                            required
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-form-full">
                                        <label className="pud-catalog-form-label">Description</label>
                                        <textarea
                                            className="pud-catalog-form-textarea"
                                            value={catalogForm.description}
                                            onChange={(e) => updateCatalogField("description", e.target.value)}
                                            placeholder="Briefly describe this catalog item..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.price}
                                            onChange={(e) => updateCatalogField("price", e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Currency</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.currency}
                                            onChange={(e) => updateCatalogField("currency", e.target.value)}
                                            onClick={loadCurrencies}
                                        >
                                            <option value="">
                                                {loadingCurrencies ? "Loading..." : "Select currency"}
                                            </option>
                                            {currencyOptions.map((c) => (
                                                <option key={c.id} value={c.currencyName}>{c.currencyName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Unit of Measure</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.unitOfMeasure}
                                            onChange={(e) => updateCatalogField("unitOfMeasure", e.target.value)}
                                            onClick={loadUnits}
                                        >
                                            <option value="">
                                                {loadingUnits ? "Loading units..." : "Select unit of measure"}
                                            </option>
                                            {unitOptions.map((unit) => (
                                                <option key={unit.id} value={unit.key}>
                                                    {unit.key}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Catalog Type</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.catalogType}
                                            onChange={(e) => updateCatalogField("catalogType", e.target.value)}
                                            onClick={loadCatalogTypes}
                                        >
                                            <option value="">Select catalog type</option>
                                            {catalogTypeOptions.map((opt) => (
                                                <option key={opt.id} value={opt.key}>{opt.key}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ---- Classification (UNSPSC-style) ---- */}
                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Classification</span>
                                    </div>

                                    {/* SEGMENT */}
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Segment *</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.segment}
                                            onChange={(e) => handleSegmentChange(e.target.value)}
                                            onClick={loadSegments}
                                        >
                                            <option value="">
                                                {loadingSegments ? "Loading segments..." : "Select segment"}
                                            </option>
                                            {segmentOptions.map((seg) => (
                                                <option key={seg.segment} value={seg.segment}>
                                                    {seg.segment} - {seg.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Segment Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.segmentTitle}
                                            readOnly
                                            placeholder="Auto-filled when segment is selected"
                                        />
                                    </div>

                                    {/* FAMILY */}
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Family *</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.family}
                                            onChange={(e) => handleFamilyChange(e.target.value)}
                                            disabled={!catalogForm.segment}
                                        >
                                            <option value="">
                                                {!catalogForm.segment
                                                    ? "Select a segment first"
                                                    : loadingFamilies
                                                        ? "Loading families..."
                                                        : "Select family"
                                                }
                                            </option>
                                            {familyOptions.map((fam) => (
                                                <option key={fam.family} value={fam.family}>
                                                    {fam.family} - {fam.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Family Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.familyTitle}
                                            readOnly
                                            placeholder="Auto-filled when family is selected"
                                        />
                                    </div>

                                    {/* CLASS */}
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Class *</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.class}
                                            onChange={(e) => handleClassChange(e.target.value)}
                                            disabled={!catalogForm.family}
                                        >
                                            <option value="">
                                                {!catalogForm.family
                                                    ? "Select a family first"
                                                    : loadingClasses
                                                        ? "Loading classes..."
                                                        : "Select class"
                                                }
                                            </option>
                                            {classOptions.map((cls) => (
                                                <option key={cls.class} value={cls.class}>
                                                    {cls.class} - {cls.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Class Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.classTitle}
                                            readOnly
                                            placeholder="Auto-filled when class is selected"
                                        />
                                    </div>

                                    {/* COMMODITY */}
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Commodity *</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.commodity}
                                            onChange={(e) => handleCommodityChange(e.target.value)}
                                            disabled={!catalogForm.class}
                                        >
                                            <option value="">
                                                {!catalogForm.class
                                                    ? "Select a class first"
                                                    : loadingCommodities
                                                        ? "Loading commodities..."
                                                        : "Select commodity"
                                                }
                                            </option>
                                            {commodityOptions.map((com) => (
                                                <option key={com.commodity} value={com.commodity}>
                                                    {com.commodity} - {com.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Commodity Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.commodityTitle}
                                            readOnly
                                            placeholder="Auto-filled when commodity is selected"
                                        />
                                    </div>

                                    {/* ---- PunchOut ---- */}
                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">PunchOut</span>
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-checkbox-field pud-catalog-form-full">
                                        <input
                                            type="checkbox"
                                            id="isPunchOut"
                                            checked={catalogForm.isPunchOut}
                                            onChange={(e) => updateCatalogField("isPunchOut", e.target.checked)}
                                        />
                                        <label htmlFor="isPunchOut">This is a PunchOut catalog item</label>
                                    </div>

                                    {catalogForm.isPunchOut && (
                                        <div className="pud-catalog-form-field pud-catalog-form-full">
                                            <label className="pud-catalog-form-label">PunchOut URL *</label>
                                            <input
                                                type="url"
                                                className="pud-catalog-form-input"
                                                value={catalogForm.punchOutUrl}
                                                onChange={(e) => updateCatalogField("punchOutUrl", e.target.value)}
                                                placeholder="https://supplier.example.com/punchout"
                                                required={catalogForm.isPunchOut}
                                            />
                                        </div>
                                    )}

                                    {/* ---- Attachment ---- */}
                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Attachment</span>
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-form-full">
                                        <label className="pud-catalog-form-label">Upload Images *</label>
                                        <div
                                            className={`pud-catalog-dropzone${isDraggingCatalogFile ? " pud-catalog-dropzone-active" : ""}`}
                                            onClick={() => catalogFileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsDraggingCatalogFile(true); }}
                                            onDragLeave={() => setIsDraggingCatalogFile(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDraggingCatalogFile(false);
                                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                    handleCatalogFilesAdd(e.dataTransfer.files);
                                                }
                                            }}
                                        >
                                            <input
                                                ref={catalogFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                style={{ display: "none" }}
                                                onChange={(e) => {
                                                    handleCatalogFilesAdd(e.target.files);
                                                    e.target.value = "";
                                                }}
                                            />
                                            {catalogFilePreviews.length > 0 ? (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: "10px",
                                                        justifyContent: "center",
                                                        width: "100%",
                                                    }}
                                                >
                                                    {catalogFilePreviews.map((preview, index) => (
                                                        <div
                                                            key={index}
                                                            style={{ position: "relative" }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <img
                                                                src={preview}
                                                                alt={`Catalog preview ${index + 1}`}
                                                                className="pud-catalog-dropzone-preview"
                                                                style={{ width: "84px", height: "84px", objectFit: "cover", borderRadius: "8px" }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCatalogFile(index)}
                                                                title="Remove image"
                                                                style={{
                                                                    position: "absolute",
                                                                    top: "-6px",
                                                                    right: "-6px",
                                                                    width: "20px",
                                                                    height: "20px",
                                                                    borderRadius: "50%",
                                                                    border: "none",
                                                                    background: "#ef4444",
                                                                    color: "#fff",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    cursor: "pointer",
                                                                    padding: 0,
                                                                }}
                                                            >
                                                                <IconClose style={{ width: "11px", height: "11px" }} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); catalogFileInputRef.current?.click(); }}
                                                        style={{
                                                            width: "84px",
                                                            height: "84px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            border: "1.5px dashed #94a3b8",
                                                            borderRadius: "8px",
                                                            cursor: "pointer",
                                                            color: "#64748b",
                                                        }}
                                                        title="Add more images"
                                                    >
                                                        <IconPlusCircle style={{ width: "20px", height: "20px" }} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pud-catalog-dropzone-icon"><IconUploadCloudLarge /></div>
                                            )}
                                            <div className="pud-catalog-dropzone-text">
                                                {catalogFiles.length > 0
                                                    ? `${catalogFiles.length} image${catalogFiles.length > 1 ? "s" : ""} selected`
                                                    : "Click to upload or drag & drop images here"}
                                            </div>
                                            <div className="pud-catalog-dropzone-subtext">
                                                PNG, JPG, GIF or WEBP — you can select multiple images
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pud-modal-footer">
                                <button
                                    type="button"
                                    className="pud-btn pud-btn-outline"
                                    onClick={closeCreateCatalogModal}
                                    style={{ marginRight: "10px" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pud-btn pud-btn-message"
                                    disabled={creatingCatalog || catalogFiles.length === 0}
                                    style={{ background: "#2563eb", color: "#ffffff" }}
                                >
                                    {creatingCatalog ? "Saving..." : "Save Catalog"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ---------- Upload Catalog Modal ---------- */}
            {showUploadCatalogModal && (
                <div className="pud-modal-overlay" onClick={closeUploadCatalogModal}>
                    <div className="pud-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pud-modal-header">
                            <button className="pud-modal-close" onClick={closeUploadCatalogModal} title="Close">
                                <IconClose />
                            </button>
                            <span className="pud-modal-badge">
                                <IconUploadCloud /> Bulk Upload
                            </span>
                            <h2 className="pud-modal-name">Upload Catalog</h2>
                            <div className="pud-modal-meta">
                                <span>Add files or images to your catalog</span>
                            </div>
                        </div>

                        <div className="pud-modal-body">
                            {uploadCatalogSuccess && (
                                <div className="pud-alert pud-alert-success">
                                    <IconCheckCircle /> Files uploaded successfully!
                                </div>
                            )}
                            {uploadCatalogError && (
                                <div className="pud-alert pud-alert-error">{uploadCatalogError}</div>
                            )}

                            <div
                                className={`pud-catalog-dropzone pud-catalog-dropzone-large${isDraggingUploadFiles ? " pud-catalog-dropzone-active" : ""}`}
                                onClick={() => uploadCatalogInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingUploadFiles(true); }}
                                onDragLeave={() => setIsDraggingUploadFiles(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDraggingUploadFiles(false);
                                    handleUploadCatalogFilesAdd(e.dataTransfer.files);
                                }}
                            >
                                <input
                                    ref={uploadCatalogInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        handleUploadCatalogFilesAdd(e.target.files);
                                        e.target.value = "";
                                    }}
                                />
                                <div className="pud-catalog-dropzone-icon"><IconUploadCloudLarge /></div>
                                <div className="pud-catalog-dropzone-text">
                                    Click to upload or drag & drop files/images here
                                </div>
                                <div className="pud-catalog-dropzone-subtext">
                                    Supports images, PDF, Word, Excel and CSV files
                                </div>
                            </div>

                            {uploadCatalogFiles.length > 0 && (
                                <div className="pud-catalog-file-list">
                                    {uploadCatalogFiles.map((file, index) => (
                                        <div className="pud-catalog-file-item" key={`${file.name}-${index}`}>
                                            {file.type.startsWith("image/") ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="pud-catalog-file-thumb"
                                                />
                                            ) : (
                                                <div className="pud-catalog-file-icon"><IconFileGeneric /></div>
                                            )}
                                            <div className="pud-catalog-file-info">
                                                <div className="pud-catalog-file-name">{file.name}</div>
                                                <div className="pud-catalog-file-size">{formatFileSize(file.size)}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="pud-catalog-file-remove"
                                                onClick={() => handleRemoveUploadCatalogFile(index)}
                                                title="Remove"
                                            >
                                                <IconClose />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pud-modal-footer">
                            <button
                                type="button"
                                className="pud-btn pud-btn-outline"
                                onClick={closeUploadCatalogModal}
                                style={{ marginRight: "10px" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="pud-btn pud-btn-message"
                                disabled={uploadingCatalog || uploadCatalogFiles.length === 0}
                                onClick={handleUploadCatalogSubmit}
                                style={{ background: "#2563eb", color: "#ffffff" }}
                            >
                                {uploadingCatalog ? "Uploading..." : `Upload ${uploadCatalogFiles.length > 0 ? `(${uploadCatalogFiles.length})` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------- PDF Preview Modal ---------- */}


            {/* ---------- PunchOut Preview Modal ---------- */}
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
                                        <IconExternalLink style={{ marginRight: "6px" }} /> Open in New Tab
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

            {/* ---------- Show Catalogs: full-page view ---------- */}
            {showCatalogListModal && fullViewContainer && createPortal(
                <>
                    {selectedCatalogItem ? (
                        /* ===================== Catalog Detail Page ===================== */
                        <>
                            <div className="pud-catalog-fullview-header">
                                <div>
                                    <button
                                        type="button"
                                        className="pud-btn pud-btn-outline"
                                        onClick={closeCatalogDetail}
                                    >
                                        <IconChevronLeft /> Back to Catalogs
                                    </button>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "32px",
                                    alignItems: "flex-start",
                                    padding: "8px 4px 32px",
                                }}
                            >
                                {/* ---- Left: Image gallery ---- */}
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
                                        {loadingSelectedImages ? (
                                            <div className="pud-spinner" />
                                        ) : selectedCatalogImages.length > 0 ? (
                                            <img
                                                src={selectedCatalogImages[selectedImageIndex]}
                                                alt={selectedCatalogItem.catalogName}
                                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                            />
                                        ) : (
                                            <div style={{ color: "#94a3b8" }}><IconGridLarge /></div>
                                        )}

                                        {selectedCatalogImages.length > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={goToPrevImage}
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
                                                    onClick={goToNextImage}
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

                                    {selectedCatalogImages.length > 1 && (
                                        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                                            {selectedCatalogImages.map((src, idx) => (
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

                                {/* ---- Right: Details ---- */}
                                <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
                                    <h1 className="pud-title" style={{ marginBottom: "6px" }}>{selectedCatalogItem.catalogName}</h1>

                                    {selectedCatalogItem.catalogType && (
                                        <span className="pud-catalog-card-tag" style={{ display: "inline-block", marginBottom: "12px" }}>
                                            {selectedCatalogItem.catalogType}
                                        </span>
                                    )}

                                    {selectedCatalogItem.description && (
                                        <p className="pud-catalog-card-desc" style={{ fontSize: "14px", lineHeight: 1.6, marginBottom: "18px" }}>
                                            {selectedCatalogItem.description}
                                        </p>
                                    )}

                                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "18px" }}>
                                        {!!selectedCatalogItem.price && (
                                            <span className="pud-catalog-card-price" style={{ fontSize: "22px" }}>
                                                {selectedCatalogItem.currency ? `${selectedCatalogItem.currency} ` : ""}
                                                {Number(selectedCatalogItem.price).toFixed(2)}
                                            </span>
                                        )}
                                        {selectedCatalogItem.unitOfMeasure && (
                                            <span className="pud-catalog-card-uom">per {selectedCatalogItem.unitOfMeasure}</span>
                                        )}
                                    </div>

                                    {selectedCatalogItem.isPunchOut && selectedCatalogItem.punchOutUrl && (
                                        <button
                                            className="pud-btn pud-btn-message"
                                            onClick={() => handlePunchOutPreview(selectedCatalogItem.punchOutUrl)}
                                            style={{ background: "#2563eb", color: "#ffffff", marginBottom: "20px" }}
                                        >
                                            <IconExternalLink style={{ marginRight: "6px" }} /> View Catalog
                                        </button>
                                    )}

                                    {(selectedCatalogItem.segmentTitle || selectedCatalogItem.familyTitle || selectedCatalogItem.classTitle || selectedCatalogItem.commodityTitle) && (
                                        <div className="pud-catalog-card-classification" style={{ marginBottom: "18px" }}>
                                            <div className="pud-catalog-form-section-title" style={{ marginBottom: "8px" }}>Classification</div>
                                            {selectedCatalogItem.segmentTitle && (
                                                <div className="pud-catalog-classification-row">
                                                    <span className="pud-catalog-classification-label">Segment:</span>
                                                    <span className="pud-catalog-classification-value">{selectedCatalogItem.segment} - {selectedCatalogItem.segmentTitle}</span>
                                                </div>
                                            )}
                                            {selectedCatalogItem.familyTitle && (
                                                <div className="pud-catalog-classification-row">
                                                    <span className="pud-catalog-classification-label">Family:</span>
                                                    <span className="pud-catalog-classification-value">{selectedCatalogItem.family} - {selectedCatalogItem.familyTitle}</span>
                                                </div>
                                            )}
                                            {selectedCatalogItem.classTitle && (
                                                <div className="pud-catalog-classification-row">
                                                    <span className="pud-catalog-classification-label">Class:</span>
                                                    <span className="pud-catalog-classification-value">{selectedCatalogItem.class} - {selectedCatalogItem.classTitle}</span>
                                                </div>
                                            )}
                                            {selectedCatalogItem.commodityTitle && (
                                                <div className="pud-catalog-classification-row">
                                                    <span className="pud-catalog-classification-label">Commodity:</span>
                                                    <span className="pud-catalog-classification-value">{selectedCatalogItem.commodity} - {selectedCatalogItem.commodityTitle}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedCatalogItem.assets && selectedCatalogItem.assets.length > 0 && (
                                        <div className="pud-catalog-card-assets">
                                            <div className="pud-catalog-form-section-title" style={{ marginBottom: "8px" }}>
                                                Attached Files ({selectedCatalogItem.assets.length})
                                            </div>
                                            {selectedCatalogItem.assets.map((asset) => (
                                                <div className="pud-catalog-card-asset" key={asset.id}>
                                                    <span className="pud-catalog-asset-filename">
                                                        {asset.fileName}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="pud-catalog-fullview-header">
                                <div>
                                    <h1 className="pud-title">Your Catalogs</h1>
                                    <p className="pud-subtitle">
                                        <IconGrid /> {catalogList.length} {catalogList.length === 1 ? "Item" : "Items"} in your supplier catalog
                                    </p>
                                </div>
                                <div className="pud-catalog-fullview-actions">
                                    <button
                                        type="button"
                                        className="pud-btn pud-btn-outline"
                                        onClick={() => {
                                            setShowCatalogListModal(false);
                                            onCloseCatalogList?.();
                                        }}
                                    >
                                        <IconChevronRight /> Back to Dashboard
                                    </button>
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            className="pud-btn pud-btn-message"
                                            onClick={() => setShowCreateCatalogModal(true)}
                                            style={{ background: "#2563eb", color: "#ffffff" }}
                                        >
                                            + Add Catalog
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loadingCatalogList ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
                                    <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <div className="pud-spinner" />
                                        <span>Loading your catalogs...</span>
                                    </div>
                                </div>
                            ) : catalogListError ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px', padding: '16px' }}>
                                    <div style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                                        {catalogListError}
                                        <div style={{ marginTop: '12px' }}>
                                            <button
                                                type="button"
                                                className="pud-btn pud-btn-outline"
                                                onClick={loadCatalogList}
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : catalogList.length === 0 ? (
                                <div className="pud-catalog-empty-state">
                                    <div className="pud-catalog-dropzone-icon"><IconGridLarge /></div>
                                    <div className="pud-catalog-dropzone-text">No catalogs yet</div>
                                    <div className="pud-catalog-dropzone-subtext">
                                        {isAdmin
                                            ? 'Use "Create Catalog" or "Upload Catalog" to add your first item.'
                                            : 'No catalogs are currently available.'
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div className="pud-catalog-grid">
                                    {catalogList.map((item) => (
                                        <div
                                            className="pud-catalog-card"
                                            key={item.id}
                                            onClick={() => openCatalogDetail(item)}
                                            style={{ cursor: "pointer" }}
                                            role="button"
                                            title={`View ${item.catalogName}`}
                                        >
                                            <div className="pud-catalog-card-media">
                                                {(() => {
                                                    const firstAssetId = item.assets && item.assets[0]?.id;
                                                    const imageSrc = firstAssetId ? catalogAssetImages[firstAssetId] : undefined;
                                                    return imageSrc ? (
                                                        <img src={imageSrc} alt={item.catalogName} />
                                                    ) : (
                                                        <div className="pud-catalog-card-media-placeholder"><IconFileGeneric /></div>
                                                    );
                                                })()}
                                                {item.assets && item.assets.length > 1 && (
                                                    <span className="pud-catalog-card-source">
                                                        {item.assets.length} Photos
                                                    </span>
                                                )}
                                            </div>
                                            <div className="pud-catalog-card-body">
                                                <div className="pud-catalog-card-name" title={item.catalogName}>{item.catalogName}</div>
                                                {item.description && (
                                                    <div className="pud-catalog-card-desc">{item.description}</div>
                                                )}
                                                <div className="pud-catalog-card-meta">
                                                    {!!item.price && (
                                                        <span className="pud-catalog-card-price">
                                                            {item.currency ? `${item.currency} ` : ""}{Number(item.price).toFixed(2)}
                                                        </span>
                                                    )}
                                                    {item.unitOfMeasure && (
                                                        <span className="pud-catalog-card-uom">{item.unitOfMeasure}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>,
                fullViewContainer
            )}
        </>
    );
};

export default Catalog;