import React, { useState, useRef, useEffect } from "react";
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
    fetchSupplierCatalogDetail,
    fetchSupplierAsset,
    fetchUnits,
    type CatalogDetailResponseItem,
} from "../api/supplierApi";
import { isErrorResponse, Button, EmptyState, Loader, Pagination, Dropdown } from '@vosox/shared-ui';
import type { DropdownValue, DropdownLoadParams, DropdownLoadResult } from '@vosox/shared-ui';
import type { CatalogAssetDto, CatalogDetailDto, CurrencyItem, SupplierCatalogListItem } from "../dto/supplierDto";

// Page size used by every async (paginated) Dropdown
const DROPDOWN_PAGE_SIZE = 40;

const toDropdownValue = (value: string): DropdownValue | null =>
    value ? { name: value, value } : null;

const toIdTitleDropdownValue = (id: string, title: string): DropdownValue | null =>
    id ? { name: title || id, value: id } : null;

// The Dropdown's search box is a plain text input; inside a <form>, Enter on it
// would otherwise submit the form instead of just filtering the option list.
const preventEnterSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
};

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

interface CatalogProps {
    onShowCatalogList?: () => void;
    fullViewContainer?: HTMLDivElement | null;
    isAdmin?: boolean;
}

const Catalog: React.FC<CatalogProps> = ({
    onShowCatalogList,
    fullViewContainer,
    isAdmin = false
}) => {
    const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
    const [showCreateCatalogModal, setShowCreateCatalogModal] = useState(false);
    const [showUploadCatalogModal, setShowUploadCatalogModal] = useState(false);
    const [showCatalogListModal, setShowCatalogListModal] = useState(false);
    const [_catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

    const [showPunchOutFullPage, setShowPunchOutFullPage] = useState(false);
    const [punchOutPreviewUrl, setPunchOutPreviewUrl] = useState<string>("");
    const [punchOutIframeBlocked, setPunchOutIframeBlocked] = useState(false);

    const [catalogList, setCatalogList] = useState<SupplierCatalogListItem[]>([]);
    const [loadingCatalogList, setLoadingCatalogList] = useState(false);
    const [catalogListError, setCatalogListError] = useState<string | null>(null);

    const CATALOG_PAGE_SIZE = 10;
    const [catalogPage, setCatalogPage] = useState(0);
    const catalogTotalPages = Math.max(1, Math.ceil(catalogList.length / CATALOG_PAGE_SIZE));
    const pagedCatalogList = catalogList.slice(
        catalogPage * CATALOG_PAGE_SIZE,
        catalogPage * CATALOG_PAGE_SIZE + CATALOG_PAGE_SIZE
    );

    const [catalogAssetImages, setCatalogAssetImages] = useState<Record<string, string>>({});

    // ✅ NEW STATE: Catalog Detail API
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogDetailResponseItem | null>(null);
    const [loadingCatalogDetail, setLoadingCatalogDetail] = useState(false);
    const [catalogDetailError, setCatalogDetailError] = useState<string | null>(null);

    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [loadingSelectedImages, setLoadingSelectedImages] = useState(false);

    const loadCatalogAssetImage = async (assetId: string) => {
        if (!assetId || catalogAssetImages[assetId]) return;
        try {
            const asset: any = await fetchSupplierAsset(assetId);
            if (!asset) {
                return;
            }

            // ✅ Check for error response
            if (asset.statusCode && asset.statusCode >= 400) {
                return;
            }

            let src: string | null = null;

            // ✅ Try multiple approaches to get image source
            if (asset.fileBytes) {
                const mime = asset.contentType || asset.mimeType || "image/jpeg";
                src = `data:${mime};base64,${asset.fileBytes}`;
            } else if (asset.url) {
                src = asset.url;
            } else if (asset.fileUrl) {
                src = asset.fileUrl;
            } else if (asset.downloadUrl) {
                src = asset.downloadUrl;
            }

            if (src) {
                setCatalogAssetImages((prev) => ({ ...prev, [assetId]: src as string }));
            }
        } catch (error) {
        }
    };

    const loadCatalogList = async () => {
        setLoadingCatalogList(true);
        setCatalogListError(null);
        try {
            const data = await fetchSupplierCatalog();
            if (Array.isArray(data)) {
                setCatalogList(data);
                setCatalogPage(0);
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

    useEffect(() => {
        if (fullViewContainer) {
            loadCatalogList();
        }
    }, [fullViewContainer]);

    // ✅ UPDATED: Handler to fetch catalog details from API
    const openCatalogDetail = async (catalogId: string) => {
        setLoadingCatalogDetail(true);
        setCatalogDetailError(null);
        setSelectedCatalogItem(null);
        setSelectedImageIndex(0);

        try {
            const response = await fetchSupplierCatalogDetail(catalogId);

            // ✅ Check if error response
            if (isErrorResponse(response)) {
                setCatalogDetailError(
                    response.description || response.message || 'Failed to load catalog details.'
                );
                return;
            }

            // ✅ Handle array response - get first item
            if (Array.isArray(response) && response.length > 0) {
                setSelectedCatalogItem(response[0]);
                
                // Load images for the detailed catalog
                const assetIds = (response[0].asset || []).map((a) => a.id).filter(Boolean) as string[];
                if (assetIds.length > 0) {
                    setLoadingSelectedImages(true);
                    try {
                        await Promise.all(assetIds.map((id) => loadCatalogAssetImage(id)));
                    } finally {
                        setLoadingSelectedImages(false);
                    }
                }
            } else {
                setCatalogDetailError('No catalog details found.');
            }
        } catch (error: any) {
            setCatalogDetailError(error.message || 'Failed to load catalog details.');
        } finally {
            setLoadingCatalogDetail(false);
        }
    };

    const closeCatalogDetail = () => {
        setSelectedCatalogItem(null);
        setSelectedImageIndex(0);
        setShowPunchOutFullPage(false);
        setCatalogDetailError(null);
    };

    // ✅ Get images from selected catalog detail
    const selectedCatalogImages: string[] = selectedCatalogItem
        ? ((selectedCatalogItem.asset || [])
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

    const [catalogForm, setCatalogForm] = useState<CatalogFormState>(emptyCatalogForm);
    const [catalogFiles, setCatalogFiles] = useState<File[]>([]);
    const [catalogFilePreviews, setCatalogFilePreviews] = useState<string[]>([]);
    const [isDraggingCatalogFile, setIsDraggingCatalogFile] = useState(false);
    const [creatingCatalog, setCreatingCatalog] = useState(false);
    const [createCatalogError, setCreateCatalogError] = useState<string | null>(null);
    const [createCatalogSuccess, setCreateCatalogSuccess] = useState(false);
    const catalogFileInputRef = useRef<HTMLInputElement>(null);

    // ---- Async loader for the Catalog Type Dropdown (reference-list API has no paging or search, so search client-side) ----
    const loadCatalogTypeOptions = async ({ search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        const types = await fetchMetadataReferenceList(['CATALOG_TYPE']);
        if (!Array.isArray(types)) {
            return { options: [], hasMore: false };
        }
        const searchTerm = search.trim().toLowerCase();
        return {
            options: types
                .filter((opt) => !searchTerm || opt.key.toLowerCase().includes(searchTerm))
                .map((opt) => ({ name: opt.key, value: opt.key })),
            hasMore: false,
        };
    };

    // ---- Async paginated loader for the Currency Dropdown (server has no search param, so search client-side) ----
    // `index` is an offset: 0, then 0 + 40, then 0 + 40 + 40, ...
    const fetchCurrencyPage = async (index: number): Promise<CurrencyItem[]> => {
        const result = await fetchCurrencies({ index, limit: DROPDOWN_PAGE_SIZE });
        return result && 'items' in result && Array.isArray(result.items) ? result.items : [];
    };

    const loadCurrencyOptions = async ({ page, search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        const toOption = (c: CurrencyItem) => ({ name: c.currencyName, value: c.currencyName });
        const searchTerm = search.trim().toLowerCase();

        if (searchTerm) {
            // Page through every currency so a match on a later page isn't missed, then filter here
            const matches: CurrencyItem[] = [];
            let index = 0;
            let items: CurrencyItem[];
            do {
                items = await fetchCurrencyPage(index);
                matches.push(...items.filter((c) => c.currencyName.toLowerCase().includes(searchTerm)));
                index += items.length;
            } while (items.length === DROPDOWN_PAGE_SIZE);
            return { options: matches.map(toOption), hasMore: false };
        }

        const items = await fetchCurrencyPage(page * DROPDOWN_PAGE_SIZE);
        return { options: items.map(toOption), hasMore: items.length === DROPDOWN_PAGE_SIZE };
    };

    // ---- Async paginated loader for the Unit of Measure Dropdown (`index` is an offset: 0, 40, 80, ...) ----
    const loadUnitOptions = async ({ page, search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        const result = await fetchUnits({
            index: page * DROPDOWN_PAGE_SIZE,
            limit: DROPDOWN_PAGE_SIZE,
            searchTerm: search.trim() || undefined,
        });
        const items = result && 'items' in result && Array.isArray(result.items) ? result.items : [];
        return {
            options: items.map((unit) => ({ name: unit.key, value: unit.key })),
            hasMore: items.length === DROPDOWN_PAGE_SIZE,
        };
    };

    // ---- Async paginated loader for the Segment Dropdown (`pageIndex` is an offset: 0, 40, 80, ...) ----
    const loadSegmentOptions = async ({ page, search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        const segments = await fetchSegments({
            pageIndex: page * DROPDOWN_PAGE_SIZE,
            pageSize: DROPDOWN_PAGE_SIZE,
            searchTerm: search.trim() || undefined,
        });
        if (!Array.isArray(segments)) {
            return { options: [], hasMore: false };
        }
        return {
            options: segments.map((seg) => ({ name: seg.title, value: String(seg.segment) })),
            hasMore: segments.length === DROPDOWN_PAGE_SIZE,
        };
    };

    // fetchFamilies supports pagination but not a search param, so each page is
    // fetched as-is and filtered client-side before being handed to the Dropdown.
    const loadFamilyOptions = async ({ page, search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        if (!catalogForm.segment) {
            return { options: [], hasMore: false };
        }
        const pageIndex = page * DROPDOWN_PAGE_SIZE; // index of the first item on the page: 0, 40, 80, ...
        const families = await fetchFamilies(Number(catalogForm.segment), { pageIndex, pageSize: DROPDOWN_PAGE_SIZE });
        if (!Array.isArray(families)) {
            return { options: [], hasMore: false };
        }
        const searchTerm = search.trim().toLowerCase();
        const options = families
            .filter((fam) => !searchTerm || fam.title.toLowerCase().includes(searchTerm))
            .map((fam) => ({ name: fam.title, value: String(fam.family) }));
        return { options, hasMore: families.length === DROPDOWN_PAGE_SIZE };
    };

    const loadClassOptions = async ({ page, search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        if (!catalogForm.family) {
            return { options: [], hasMore: false };
        }
        const pageIndex = page * DROPDOWN_PAGE_SIZE;
        const classes = await fetchClassifications(Number(catalogForm.family), { pageIndex, pageSize: DROPDOWN_PAGE_SIZE });
        if (!Array.isArray(classes)) {
            return { options: [], hasMore: false };
        }
        const searchTerm = search.trim().toLowerCase();
        const options = classes
            .filter((cls) => !searchTerm || cls.classTitle.toLowerCase().includes(searchTerm))
            .map((cls) => ({ name: cls.classTitle, value: String(cls.class) }));
        return { options, hasMore: classes.length === DROPDOWN_PAGE_SIZE };
    };

    const loadCommodityOptions = async ({ page, search }: DropdownLoadParams): Promise<DropdownLoadResult> => {
        if (!catalogForm.class) {
            return { options: [], hasMore: false };
        }
        const pageIndex = page * DROPDOWN_PAGE_SIZE;
        const commodities = await fetchCommodities(Number(catalogForm.class), { pageIndex, pageSize: DROPDOWN_PAGE_SIZE });
        if (!Array.isArray(commodities)) {
            return { options: [], hasMore: false };
        }
        const searchTerm = search.trim().toLowerCase();
        const options = commodities
            .filter((com) => !searchTerm || com.commodityTitle.toLowerCase().includes(searchTerm))
            .map((com) => ({ name: com.commodityTitle, value: String(com.commodity) }));
        return { options, hasMore: commodities.length === DROPDOWN_PAGE_SIZE };
    };

    const handleSegmentChange = (val: DropdownValue | null) => {
        updateCatalogField("segment", val?.value ?? "");
        updateCatalogField("segmentTitle", val?.name ?? "");
        updateCatalogField("family", "");
        updateCatalogField("familyTitle", "");
        updateCatalogField("class", "");
        updateCatalogField("classTitle", "");
        updateCatalogField("commodity", "");
        updateCatalogField("commodityTitle", "");
    };

    const handleFamilyChange = (val: DropdownValue | null) => {
        updateCatalogField("family", val?.value ?? "");
        updateCatalogField("familyTitle", val?.name ?? "");
        updateCatalogField("class", "");
        updateCatalogField("classTitle", "");
        updateCatalogField("commodity", "");
        updateCatalogField("commodityTitle", "");
    };

    const handleClassChange = (val: DropdownValue | null) => {
        updateCatalogField("class", val?.value ?? "");
        updateCatalogField("classTitle", val?.name ?? "");
        updateCatalogField("commodity", "");
        updateCatalogField("commodityTitle", "");
    };

    const handleCommodityChange = (val: DropdownValue | null) => {
        updateCatalogField("commodity", val?.value ?? "");
        updateCatalogField("commodityTitle", val?.name ?? "");
    };

    const updateCatalogField = <K extends keyof CatalogFormState>(field: K, value: CatalogFormState[K]) => {
        setCatalogForm((prev) => ({ ...prev, [field]: value }));
    };

    const isNonCatalogType = (catalogForm.catalogType || "").toString().toLowerCase().includes("non");

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
                useAuthStore.getState().organizationId || "";

            if (!organizationId) {
                throw new Error("Organization ID not found. Please log in again.");
            }
            const entityTypesRaw = await fetchMetadataReferenceList(['ENTITY_TYPE']);
            const entityTypes = Array.isArray(entityTypesRaw) ? entityTypesRaw : [];
            const supplierEntityId = entityTypes.find((e) => e.key === 'SUPPLIER')?.id || '59476530-3c10-438b-b3b3-9db9e96e8d93';
            const entityType = entityTypes.find((e) => e.key === 'SUPPLIER')?.key || 'SUPPLIER';

            const assets: CatalogAssetDto[] = await Promise.all(
                catalogFiles.map(async (file) => {
                    const fileBytes = await fileToBase64(file);
                    return {
                        entityType: entityType,
                        entityId: supplierEntityId,
                        assetType: "CATALOG_ATTACHMENT",
                        fileBytes: fileBytes,
                        fileName: file.name,
                        contentType: file.type,
                        // Never a singleton: that would deactivate files this catalog still links to.
                        isSingletonAsset: false,
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

    const handlePunchOutPreview = (url: string) => {
        setPunchOutPreviewUrl(url);
        setShowPunchOutFullPage(true);
        setPunchOutIframeBlocked(false);
    };

    return (
        <>
            <div
                className="pud-nav-item"
                onClick={() => setIsCatalogExpanded((prev) => !prev)}
            >
                <span className="pud-nav-icon"><NavIconCatalog /></span>
                <span className="pud-nav-label">Catalog</span>
                <span className="pud-nav-chevron">
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

            {/* Create Catalog Modal */}
            {showCreateCatalogModal && createPortal(
                <div className="pud-modal-overlay" onClick={closeCreateCatalogModal}>
                    <div
                        className="pud-modal pud-modal-catalog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pud-create-catalog-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="pud-modal-header">
                            <button type="button" className="pud-modal-close" onClick={closeCreateCatalogModal} title="Close" aria-label="Close">
                                <IconClose />
                            </button>
                            <span className="pud-modal-badge">
                                <NavIconCatalog /> New Catalog Item
                            </span>
                            <h2 className="pud-modal-name" id="pud-create-catalog-title">Create Catalog</h2>
                            <div className="pud-modal-meta">
                                <span>Add a product or service to your catalog</span>
                            </div>
                        </div>

                        <form onSubmit={handleCreateCatalogSubmit} className="pud-modal-form">
                            <div className="pud-modal-body">
                                {createCatalogSuccess && (
                                    <div className="pud-alert pud-alert-success" role="status">
                                        <IconCheckCircle /> Catalog created successfully!
                                    </div>
                                )}
                                {createCatalogError && (
                                    <div className="pud-alert pud-alert-error" role="alert">{createCatalogError}</div>
                                )}

                                <div className="pud-catalog-form-grid">
                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Basic Details</span>
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-form-full">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-catalog-name">Catalog Name<span className="sila-required" aria-hidden="true">*</span></label>
                                        <input
                                            id="catalog-catalog-name"
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.catalogName}
                                            onChange={(e) => updateCatalogField("catalogName", e.target.value)}
                                            placeholder="e.g. Ergonomic Office Chair"
                                            required
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-form-full">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-description">Description</label>
                                        <textarea
                                            id="catalog-description"
                                            className="pud-catalog-form-textarea"
                                            value={catalogForm.description}
                                            onChange={(e) => updateCatalogField("description", e.target.value)}
                                            placeholder="Briefly describe this catalog item..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-price">Price</label>
                                        <input
                                            id="catalog-price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.price}
                                            onChange={(e) => updateCatalogField("price", e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Currency"
                                            placeholder="Select currency"
                                            isClearable
                                            isAsync
                                            loadOptions={loadCurrencyOptions}
                                            value={toDropdownValue(catalogForm.currency)}
                                            onChange={(val) => updateCatalogField("currency", val?.value ?? "")}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Unit of Measure"
                                            placeholder="Select unit of measure"
                                            isClearable
                                            isAsync
                                            loadOptions={loadUnitOptions}
                                            value={toDropdownValue(catalogForm.unitOfMeasure)}
                                            onChange={(val) => updateCatalogField("unitOfMeasure", val?.value ?? "")}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Catalog Type"
                                            placeholder="Select catalog type"
                                            isClearable
                                            isAsync
                                            loadOptions={loadCatalogTypeOptions}
                                            value={toDropdownValue(catalogForm.catalogType)}
                                            onChange={(val) => updateCatalogField("catalogType", val?.value ?? "")}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Classification</span>
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Segment"
                                            placeholder="Select segment"
                                            isRequired
                                            isClearable
                                            isAsync
                                            loadOptions={loadSegmentOptions}
                                            value={toIdTitleDropdownValue(catalogForm.segment, catalogForm.segmentTitle)}
                                            onChange={handleSegmentChange}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-segment-title">Segment Title</label>
                                        <input
                                            id="catalog-segment-title"
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.segmentTitle}
                                            readOnly
                                            placeholder="Auto-filled when segment is selected"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Family"
                                            placeholder={!catalogForm.segment ? "Select a segment first" : "Select family"}
                                            isRequired
                                            isClearable
                                            isDisable={!catalogForm.segment}
                                            isAsync
                                            loadOptions={loadFamilyOptions}
                                            cacheUniques={[catalogForm.segment]}
                                            value={toIdTitleDropdownValue(catalogForm.family, catalogForm.familyTitle)}
                                            onChange={handleFamilyChange}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-family-title">Family Title</label>
                                        <input
                                            id="catalog-family-title"
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.familyTitle}
                                            readOnly
                                            placeholder="Auto-filled when family is selected"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Class"
                                            placeholder={!catalogForm.family ? "Select a family first" : "Select class"}
                                            isRequired
                                            isClearable
                                            isDisable={!catalogForm.family}
                                            isAsync
                                            loadOptions={loadClassOptions}
                                            cacheUniques={[catalogForm.family]}
                                            value={toIdTitleDropdownValue(catalogForm.class, catalogForm.classTitle)}
                                            onChange={handleClassChange}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-class-title">Class Title</label>
                                        <input
                                            id="catalog-class-title"
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.classTitle}
                                            readOnly
                                            placeholder="Auto-filled when class is selected"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field" onKeyDown={preventEnterSubmit}>
                                        <Dropdown
                                            label="Commodity"
                                            placeholder={!catalogForm.class ? "Select a class first" : "Select commodity"}
                                            isRequired
                                            isClearable
                                            isDisable={!catalogForm.class}
                                            isAsync
                                            loadOptions={loadCommodityOptions}
                                            cacheUniques={[catalogForm.class]}
                                            value={toIdTitleDropdownValue(catalogForm.commodity, catalogForm.commodityTitle)}
                                            onChange={handleCommodityChange}
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label" htmlFor="catalog-commodity-title">Commodity Title</label>
                                        <input
                                            id="catalog-commodity-title"
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.commodityTitle}
                                            readOnly
                                            placeholder="Auto-filled when commodity is selected"
                                        />
                                    </div>

                                    {isNonCatalogType && (
                                        <>
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
                                                    <label className="pud-catalog-form-label" htmlFor="catalog-punchout-url">PunchOut URL<span className="sila-required" aria-hidden="true">*</span></label>
                                                    <input
                                                        id="catalog-punchout-url"
                                                        type="url"
                                                        className="pud-catalog-form-input"
                                                        value={catalogForm.punchOutUrl}
                                                        onChange={(e) => updateCatalogField("punchOutUrl", e.target.value)}
                                                        placeholder="https://supplier.example.com/punchout"
                                                        required={catalogForm.isPunchOut}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Attachment</span>
                                    </div>

                                    <div className="pud-catalog-form-field pud-catalog-form-full">
                                        <span className="pud-catalog-form-label" id="catalog-upload-images-label">Upload Images<span className="sila-required" aria-hidden="true">*</span></span>
                                        <div
                                            className={`pud-catalog-dropzone${isDraggingCatalogFile ? " pud-catalog-dropzone-active" : ""}`}
                                            role="button"
                                            tabIndex={0}
                                            aria-labelledby="catalog-upload-images-label"
                                            onClick={() => catalogFileInputRef.current?.click()}
                                            onKeyDown={(e) => {
                                                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                                                    e.preventDefault();
                                                    catalogFileInputRef.current?.click();
                                                }
                                            }}
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
                                                onChange={(e) => {
                                                    handleCatalogFilesAdd(e.target.files);
                                                    e.target.value = "";
                                                }}
                                            />
                                            {catalogFilePreviews.length > 0 ? (
                                                <div className="pud-file">
                                                    {catalogFilePreviews.map((preview, index) => (
                                                        <div key={index} className="map" onClick={(e) => e.stopPropagation()}>
                                                            <img
                                                                src={preview}
                                                                alt={`Catalog preview ${index + 1}`}
                                                                className="pud-catalog-dropzone-preview"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCatalogFile(index)}
                                                                title="Remove image"
                                                                aria-label={`Remove image ${index + 1}`}
                                                                className="pud-file-button"
                                                            >
                                                                <IconClose className="closeIcon" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); catalogFileInputRef.current?.click(); }}
                                                        className="pud-add-img"
                                                        title="Add more images"
                                                        aria-label="Add more images"
                                                    >
                                                        <IconPlusCircle className="iconPlus" />
                                                    </button>
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
                                <button type="button" className="pud-btn pud-btn-outline sila-btn sila-btn--secondary" onClick={closeCreateCatalogModal}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pud-btn pud-btn-message sila-btn sila-btn--primary"
                                    disabled={creatingCatalog || catalogFiles.length === 0}
                                >
                                    {creatingCatalog ? "Saving..." : "Save Catalog"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Upload Catalog Modal */}
            {showUploadCatalogModal && createPortal(
                <div className="pud-modal-overlay" onClick={closeUploadCatalogModal}>
                    <div
                        className="pud-modal pud-modal-upload"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pud-upload-catalog-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="pud-modal-header">
                            <button type="button" className="pud-modal-close" onClick={closeUploadCatalogModal} title="Close" aria-label="Close">
                                <IconClose />
                            </button>
                            <span className="pud-modal-badge">
                                <IconUploadCloud /> Bulk Upload
                            </span>
                            <h2 className="pud-modal-name" id="pud-upload-catalog-title">Upload Catalog</h2>
                            <div className="pud-modal-meta">
                                <span>Add files or images to your catalog</span>
                            </div>
                        </div>

                        <div className="pud-modal-body">
                            {uploadCatalogSuccess && (
                                <div className="pud-alert pud-alert-success" role="status">
                                    <IconCheckCircle /> Files uploaded successfully!
                                </div>
                            )}
                            {uploadCatalogError && (
                                <div className="pud-alert pud-alert-error" role="alert">{uploadCatalogError}</div>
                            )}

                            <div
                                className={`pud-catalog-dropzone pud-catalog-dropzone-large${isDraggingUploadFiles ? " pud-catalog-dropzone-active" : ""}`}
                                role="button"
                                tabIndex={0}
                                aria-label="Choose files to upload"
                                onClick={() => uploadCatalogInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                                        e.preventDefault();
                                        uploadCatalogInputRef.current?.click();
                                    }
                                }}
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
                                                aria-label={`Remove ${file.name}`}
                                            >
                                                <IconClose />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pud-modal-footer">
                            <button type="button" className="pud-btn pud-btn-outline sila-btn sila-btn--secondary" onClick={closeUploadCatalogModal}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="pud-btn pud-btn-message sila-btn sila-btn--primary"
                                disabled={uploadingCatalog || uploadCatalogFiles.length === 0}
                                onClick={handleUploadCatalogSubmit}
                            >
                                {uploadingCatalog ? "Uploading..." : `Upload ${uploadCatalogFiles.length > 0 ? `(${uploadCatalogFiles.length})` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Catalog List Portal */}
            {(showCatalogListModal || !!fullViewContainer) && fullViewContainer && createPortal(
                <>
                    {selectedCatalogItem ? (
                        showPunchOutFullPage ? (
                            <>
                                <div className="pud-catalog-fullview-header">
                                    <div>
                                        <button
                                            type="button"
                                            className="pud-btn pud-btn-outline sila-btn sila-btn--secondary"
                                            onClick={() => setShowPunchOutFullPage(false)}
                                        >
                                            <IconChevronLeft /> Back to {selectedCatalogItem.catalogName}
                                        </button>
                                    </div>
                                    <div className="pud-catalog-fullview-actions">
                                        <span className="pud-modal-badge">
                                            <IconExternalLink /> PunchOut Catalog
                                        </span>
                                    </div>
                                </div>

                                <div className="pud-punchout-fullpage-body">
                                    <h1 className="pud-title">{selectedCatalogItem.catalogName}</h1>
                                    {selectedCatalogItem.description && (
                                        <p className="pud-subtitle">{selectedCatalogItem.description}</p>
                                    )}
                                    <div className="pud-punchout-fullpage-viewer">
                                        {punchOutIframeBlocked ? (
                                            <div className="pud-punchout-blocked">
                                                <div className="pud-punchout-blocked-text">
                                                    <p className="pud-punchout-blocked-title">Website Cannot Be Embedded</p>
                                                    <p className="pud-punchout-blocked-desc">
                                                        This website has restricted embedding for security reasons.
                                                    </p>
                                                </div>
                                                <a
                                                    href={punchOutPreviewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pud-btn pud-btn-message sila-btn sila-btn--primary"
                                                >
                                                    <IconExternalLink /> Open in New Tab
                                                </a>
                                            </div>
                                        ) : (
                                            <iframe
                                                src={punchOutPreviewUrl}
                                                className="pud-punchout-iframe"
                                                title="PunchOut Catalog"
                                                onError={() => setPunchOutIframeBlocked(true)}
                                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
                                            />
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="pud-catalog-fullview-header">
                                    <div>
                                        <button
                                            type="button"
                                            className="pud-btn pud-btn-outline sila-btn sila-btn--secondary"
                                            onClick={closeCatalogDetail}
                                        >
                                            <IconChevronLeft /> Back to Catalog
                                        </button>
                                    </div>
                                </div>

                                <div className="pud-catalog-detail-layout">
                                    <div className="pud-catalog-detail-media">
                                        <div className="pud-catalog-detail-image-frame">
                                            {loadingCatalogDetail || loadingSelectedImages ? (
                                                <div className="pud-spinner" />
                                            ) : catalogDetailError ? (
                                                <EmptyState
                                                    variant="error"
                                                    title={catalogDetailError}
                                                    action={
                                                        <button
                                                            type="button"
                                                            className="pud-btn pud-btn-outline sila-btn sila-btn--secondary"
                                                            onClick={() => selectedCatalogItem && openCatalogDetail(selectedCatalogItem.catalogId)}
                                                        >
                                                            Retry Loading
                                                        </button>
                                                    }
                                                />
                                            ) : selectedCatalogImages.length > 0 ? (
                                                <img
                                                    src={selectedCatalogImages[selectedImageIndex]}
                                                    alt={selectedCatalogItem.catalogName}
                                                    className="pud-catalog-detail-image"
                                                />
                                            ) : (
                                                <div className="pud-catalog-detail-placeholder"><IconGridLarge /></div>
                                            )}

                                            {selectedCatalogImages.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={goToPrevImage}
                                                        title="Previous image"
                                                        aria-label="Previous image"
                                                        className="pud-catalog-image-nav pud-catalog-image-nav-prev"
                                                    >
                                                        <IconChevronLeft />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={goToNextImage}
                                                        title="Next image"
                                                        aria-label="Next image"
                                                        className="pud-catalog-image-nav pud-catalog-image-nav-next"
                                                    >
                                                        <IconChevronRight />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {selectedCatalogImages.length > 1 && (
                                            <div className="pud-catalog-thumb-row">
                                                {selectedCatalogImages.map((src, idx) => (
                                                    <button
                                                        type="button"
                                                        key={idx}
                                                        onClick={() => setSelectedImageIndex(idx)}
                                                        className={`pud-catalog-thumb${idx === selectedImageIndex ? " pud-catalog-thumb-active" : ""}`}
                                                        aria-label={`Show image ${idx + 1}`}
                                                        aria-pressed={idx === selectedImageIndex}
                                                    >
                                                        <img src={src} alt="" className="pud-catalog-thumb-img" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pud-catalog-detail-info">
                                        <h1 className="pud-title">{selectedCatalogItem.catalogName}</h1>

                                        {selectedCatalogItem.catalogType && (
                                            <span className="pud-catalog-card-tag">
                                                {selectedCatalogItem.catalogType}
                                            </span>
                                        )}

                                        {selectedCatalogItem.description && (
                                            <p className="pud-catalog-card-desc pud-catalog-detail-desc">
                                                {selectedCatalogItem.description}
                                            </p>
                                        )}

                                        <div className="pud-catalog-detail-price-row">
                                            {!!selectedCatalogItem.price && (
                                                <span className="pud-catalog-card-price pud-catalog-detail-price">
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
                                                type="button"
                                                className="pud-btn pud-btn-message sila-btn sila-btn--primary pud-catalog-detail-cta"
                                                onClick={() => handlePunchOutPreview(selectedCatalogItem.punchOutUrl)}
                                            >
                                                <IconExternalLink /> View Catalog
                                            </button>
                                        )}

                                        {/* ✅ FIXED: Show classification even if titles are null */}
                                        {(selectedCatalogItem.segment || selectedCatalogItem.family || selectedCatalogItem.class || selectedCatalogItem.commodity) && (
                                            <div className="pud-catalog-card-classification">
                                                <div className="pud-catalog-form-section-title">Classification</div>
                                                {selectedCatalogItem.segment && (
                                                    <div className="pud-catalog-classification-row">
                                                        <span className="pud-catalog-classification-label">Segment:</span>
                                                        <span className="pud-catalog-classification-value">
                                                            {selectedCatalogItem.segment}
                                                            {selectedCatalogItem.segmentTitle && ` - ${selectedCatalogItem.segmentTitle}`}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedCatalogItem.family && (
                                                    <div className="pud-catalog-classification-row">
                                                        <span className="pud-catalog-classification-label">Family:</span>
                                                        <span className="pud-catalog-classification-value">
                                                            {selectedCatalogItem.family}
                                                            {selectedCatalogItem.familyTitle && ` - ${selectedCatalogItem.familyTitle}`}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedCatalogItem.class && (
                                                    <div className="pud-catalog-classification-row">
                                                        <span className="pud-catalog-classification-label">Class:</span>
                                                        <span className="pud-catalog-classification-value">
                                                            {selectedCatalogItem.class}
                                                            {selectedCatalogItem.classTitle && ` - ${selectedCatalogItem.classTitle}`}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedCatalogItem.commodity && (
                                                    <div className="pud-catalog-classification-row">
                                                        <span className="pud-catalog-classification-label">Commodity:</span>
                                                        <span className="pud-catalog-classification-value">
                                                            {selectedCatalogItem.commodity}
                                                            {selectedCatalogItem.commodityTitle && ` - ${selectedCatalogItem.commodityTitle}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        <>
                            <div className="pud-catalog-fullview-header">
                                <div>
                                    <h1 className="pud-title">Your Catalogs</h1>
                                    <p className="pud-subtitle pud-catalog-count">
                                        <IconGrid aria-hidden="true" /> {catalogList.length} {catalogList.length === 1 ? "Item" : "Items"} in your supplier catalog
                                    </p>
                                </div>
                                <div className="pud-catalog-fullview-actions">
                                    {isAdmin && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowUploadCatalogModal(true)}
                                        >
                                            <IconUploadCloud /> Upload Catalog
                                        </Button>
                                    )}
                                    {isAdmin && (
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={() => setShowCreateCatalogModal(true)}
                                        >
                                            + Add Catalog
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {loadingCatalogList ? (
                                <div className="pud-catalog-state-center">
                                    <Loader size={24} message="Loading your catalogs..." />
                                </div>
                            ) : catalogListError ? (
                                <div className="pud-catalog-state-center pud-catalog-state-padded">
                                    <EmptyState
                                        variant="error"
                                        title={catalogListError}
                                        action={
                                            <button
                                                type="button"
                                                className="pud-btn pud-btn-outline sila-btn sila-btn--secondary"
                                                onClick={loadCatalogList}
                                            >
                                                Retry
                                            </button>
                                        }
                                    />
                                </div>
                            ) : catalogList.length === 0 ? (
                                <div className="pud-catalog-empty-state">
                                    <EmptyState
                                        icon={<IconGrid />}
                                        title="No catalogs yet"
                                        description={isAdmin
                                            ? 'Use "Create Catalog" or "Upload Catalog" to add your first item.'
                                            : 'No catalogs are currently available.'
                                        }
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="pud-catalog-grid">
                                        {pagedCatalogList.map((item) => (
                                            <div
                                                className="pud-catalog-card"
                                                key={item.id}
                                                onClick={() => openCatalogDetail(item.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        openCatalogDetail(item.id);
                                                    }
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                title={`View ${item.catalogName}`}
                                            >
                                                <div className="pud-catalog-card-media">
                                                    {(() => {
                                                        const firstAssetId = item.assets && item.assets[0]?.id;
                                                        const imageSrc = firstAssetId ? catalogAssetImages[firstAssetId] : undefined;
                                                        return imageSrc ? (
                                                            <img src={imageSrc} alt={item.catalogName} />
                                                        ) : (
                                                            <div className="pud-catalog-card-media-placeholder" aria-hidden="true"><IconFileGeneric /></div>
                                                        );
                                                    })()}
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

                                    {catalogList.length > CATALOG_PAGE_SIZE && (
                                        <Pagination
                                            className="pud-catalog-pagination"
                                            page={catalogPage + 1}
                                            totalPages={catalogTotalPages}
                                            onPrevious={() => setCatalogPage((p) => Math.max(0, p - 1))}
                                            onNext={() => setCatalogPage((p) => Math.min(catalogTotalPages - 1, p + 1))}
                                        />
                                    )}
                                </>
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