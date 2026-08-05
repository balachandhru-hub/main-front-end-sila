import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import "./Catalog.css";
import { useAuthStore } from "../../../host-app/src/store/useAuthStore";
import { createSupplierCatalog } from "../api/supplierApi";
import type { CatalogAssetDto, CatalogDetailDto } from "../dto/supplierDto";
import { fetchMetadataReferenceList } from "../api/supplierApi"

/* ============================== Types ============================== */

export interface CatalogItem {
    source: "created" | "uploaded";
    catalogName: string;
    description: string;
    price: number;
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
    unitOfMeasure: "PCS",
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

const unitOfMeasureOptions = ["PCS", "SET", "BOX", "UNIT", "KG", "METER", "LITER", "HOUR"];

/* ============================== Helpers ============================== */

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatCatalogDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return "";
    }
};

// Converts a File to a raw base64 string (strips the "data:...;base64," prefix)
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

const NavIconCatalog = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);

const IconChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const IconPlusCircle = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

const IconUploadCloud = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 16.5v.01" />
        <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 18h11.5z" />
        <path d="M12 12v7" />
        <path d="m9.5 14.5 2.5-2.5 2.5 2.5" />
    </svg>
);

const IconUploadCloudLarge = () => (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 18h11.5z" />
        <path d="M12 12v7" />
        <path d="m9.5 14.5 2.5-2.5 2.5 2.5" />
    </svg>
);

const IconGrid = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const IconGridLarge = () => (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const IconClose = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconCheckCircle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const IconTrash = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const IconFileGeneric = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
    </svg>
);

/* ============================== Component ============================== */

interface CatalogProps {
    /** Called when "Show Catalogs" is clicked, so the parent dashboard can
     *  switch its main content area to the full catalog list view — the
     *  same pattern BuyerDashboard uses for its other sidebar nav items. */
    onShowCatalogList?: () => void;
    /** Called when the user leaves the full catalog list view. */
    onCloseCatalogList?: () => void;
    /** DOM node (rendered by the parent, inside the main content area) that
     *  the full catalog list view is portaled into. Null/undefined while
     *  the view isn't active. */
    fullViewContainer?: HTMLDivElement | null;
}

const Catalog: React.FC<CatalogProps> = ({ onShowCatalogList, onCloseCatalogList, fullViewContainer }) => {
    // ---- Sidebar expansion + modal visibility ----
    const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
    const [showCreateCatalogModal, setShowCreateCatalogModal] = useState(false);
    const [showUploadCatalogModal, setShowUploadCatalogModal] = useState(false);
    const [showCatalogListModal, setShowCatalogListModal] = useState(false);
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

    // ---- Create Catalog form state ----
    const [catalogForm, setCatalogForm] = useState<CatalogFormState>(emptyCatalogForm);
    const [catalogFile, setCatalogFile] = useState<File | null>(null);
    const [catalogFilePreview, setCatalogFilePreview] = useState<string | null>(null);
    const [isDraggingCatalogFile, setIsDraggingCatalogFile] = useState(false);
    const [creatingCatalog, setCreatingCatalog] = useState(false);
    const [createCatalogError, setCreateCatalogError] = useState<string | null>(null);
    const [createCatalogSuccess, setCreateCatalogSuccess] = useState(false);
    const catalogFileInputRef = useRef<HTMLInputElement>(null);
    const [catalogTypeOptions, setCatalogTypeOptions] = useState<Array<{ id: string; key: string }>>([]);
    const loadCatalogTypes = async () => {
        const types = await fetchMetadataReferenceList(['CATALOG_TYPE']);
        setCatalogTypeOptions(types);
    };

    const updateCatalogField = <K extends keyof CatalogFormState>(field: K, value: CatalogFormState[K]) => {
        setCatalogForm((prev) => ({ ...prev, [field]: value }));
    };

    // ---- Upload Catalog (bulk file/image upload) state ----
    const [uploadCatalogFiles, setUploadCatalogFiles] = useState<File[]>([]);
    const [isDraggingUploadFiles, setIsDraggingUploadFiles] = useState(false);
    const [uploadingCatalog, setUploadingCatalog] = useState(false);
    const [uploadCatalogError, setUploadCatalogError] = useState<string | null>(null);
    const [uploadCatalogSuccess, setUploadCatalogSuccess] = useState(false);
    const uploadCatalogInputRef = useRef<HTMLInputElement>(null);

    const closeCreateCatalogModal = () => {
        setShowCreateCatalogModal(false);
        setCatalogForm(emptyCatalogForm);
        setCatalogFile(null);
        setCatalogFilePreview(null);
        setCreateCatalogError(null);
        setCreateCatalogSuccess(false);
    };

    const handleCatalogFileSelect = (file: File | null) => {
        setCatalogFile(file);
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = () => setCatalogFilePreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setCatalogFilePreview(null);
        }
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
        setCreatingCatalog(true);
        setCreateCatalogError(null);
        try {
            // organizationId comes from the logged-in user's token claim, mirrored into the auth store
            const organizationId =
                useAuthStore.getState().organizationId || sessionStorage.getItem("vosox_organization_id") || "";

            if (!organizationId) {
                throw new Error("Organization ID not found. Please log in again.");
            }

            const entityTypes = await fetchMetadataReferenceList(['ENTITY_TYPE']);
            const supplierEntityId = entityTypes.find((e) => e.key === 'SUPPLIER')?.id || '59476530-3c10-438b-b3b3-9db9e96e8d93';
            const entityType = entityTypes.find((e) => e.key === 'SUPPLIER')?.key || 'SUPPLIER';
            let assets: CatalogAssetDto[] = [];
            if (catalogFile) {
                const fileBytes = await fileToBase64(catalogFile);
                assets = [
                    {
                        entityType: entityType,
                        entityId: supplierEntityId,
                        assetType: "CATALOG_ATTACHMENT",
                        fileBytes: fileBytes,
                        fileName: catalogFile.name,
                        contentType: catalogFile.type,
                        isSingletonAsset: true,
                    },
                ];
            }

            const catalogPayload: CatalogDetailDto = {
                catalogName: catalogForm.catalogName.trim(),
                description: catalogForm.description.trim(),
                price: Number(catalogForm.price) || 0,
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
            };

            await createSupplierCatalog({
                organizationId,
                catalog: catalogPayload,
            });

            setCatalogItems((prev) => [
                {
                    source: "created",
                    ...catalogPayload,
                    fileName: catalogFile?.name,
                    filePreview: catalogFilePreview,
                    fileType: catalogFile?.type,
                    addedAt: new Date().toISOString(),
                },
                ...prev,
            ]);
            setCreateCatalogSuccess(true);
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
            // TODO: replace with real catalog upload API call once the endpoint is available
            // const formData = new FormData();
            // uploadCatalogFiles.forEach((f) => formData.append("files", f));
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
                    <div className="pud-nav-subitem" onClick={() => setShowCreateCatalogModal(true)}>
                        <span className="pud-nav-icon"><IconPlusCircle /></span>
                        <span className="pud-nav-label">Create Catalog</span>
                    </div>
                    <div className="pud-nav-subitem" onClick={() => setShowUploadCatalogModal(true)}>
                        <span className="pud-nav-icon"><IconUploadCloud /></span>
                        <span className="pud-nav-label">Upload Catalog</span>
                    </div>
                    <div
                        className="pud-nav-subitem"
                        onClick={() => {
                            setShowCatalogListModal(true);
                            onShowCatalogList?.();
                        }}
                    >
                        <span className="pud-nav-icon"><IconGrid /></span>
                        <span className="pud-nav-label">Show Catalogs</span>
                        {catalogItems.length > 0 && (
                            <span className="pud-nav-subitem-count">{catalogItems.length}</span>
                        )}
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
                                        <label className="pud-catalog-form-label">Price ($)</label>
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
                                        <label className="pud-catalog-form-label">Unit of Measure</label>
                                        <select
                                            className="pud-catalog-form-select"
                                            value={catalogForm.unitOfMeasure}
                                            onChange={(e) => updateCatalogField("unitOfMeasure", e.target.value)}
                                        >
                                            {unitOfMeasureOptions.map((uom) => (
                                                <option key={uom} value={uom}>{uom}</option>
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
                                            {catalogTypeOptions.map((opt) => (
                                                <option key={opt.id} value={opt.key}>{opt.key}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ---- Classification (UNSPSC-style) ---- */}
                                    <div className="pud-catalog-form-section">
                                        <span className="pud-catalog-form-section-title">Classification</span>
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Segment</label>
                                        <input
                                            type="number"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.segment}
                                            onChange={(e) => updateCatalogField("segment", e.target.value)}
                                            placeholder="e.g. 44000000"
                                        />
                                    </div>
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Segment Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.segmentTitle}
                                            onChange={(e) => updateCatalogField("segmentTitle", e.target.value)}
                                            placeholder="e.g. Office Equipment"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Family</label>
                                        <input
                                            type="number"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.family}
                                            onChange={(e) => updateCatalogField("family", e.target.value)}
                                            placeholder="e.g. 44120000"
                                        />
                                    </div>
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Family Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.familyTitle}
                                            onChange={(e) => updateCatalogField("familyTitle", e.target.value)}
                                            placeholder="e.g. Office Furniture"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Commodity</label>
                                        <input
                                            type="number"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.commodity}
                                            onChange={(e) => updateCatalogField("commodity", e.target.value)}
                                            placeholder="e.g. 44121700"
                                        />
                                    </div>
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Commodity Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.commodityTitle}
                                            onChange={(e) => updateCatalogField("commodityTitle", e.target.value)}
                                            placeholder="e.g. Seating"
                                        />
                                    </div>

                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Class</label>
                                        <input
                                            type="number"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.class}
                                            onChange={(e) => updateCatalogField("class", e.target.value)}
                                            placeholder="e.g. 44121701"
                                        />
                                    </div>
                                    <div className="pud-catalog-form-field">
                                        <label className="pud-catalog-form-label">Class Title</label>
                                        <input
                                            type="text"
                                            className="pud-catalog-form-input"
                                            value={catalogForm.classTitle}
                                            onChange={(e) => updateCatalogField("classTitle", e.target.value)}
                                            placeholder="e.g. Office Chairs"
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
                                        <label className="pud-catalog-form-label">Upload File / Image</label>
                                        <div
                                            className={`pud-catalog-dropzone${isDraggingCatalogFile ? " pud-catalog-dropzone-active" : ""}`}
                                            onClick={() => catalogFileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsDraggingCatalogFile(true); }}
                                            onDragLeave={() => setIsDraggingCatalogFile(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDraggingCatalogFile(false);
                                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                    handleCatalogFileSelect(e.dataTransfer.files[0]);
                                                }
                                            }}
                                        >
                                            <input
                                                ref={catalogFileInputRef}
                                                type="file"
                                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                                style={{ display: "none" }}
                                                onChange={(e) => handleCatalogFileSelect(e.target.files ? e.target.files[0] : null)}
                                            />
                                            {catalogFilePreview ? (
                                                <img src={catalogFilePreview} alt="Catalog preview" className="pud-catalog-dropzone-preview" />
                                            ) : (
                                                <div className="pud-catalog-dropzone-icon"><IconUploadCloudLarge /></div>
                                            )}
                                            <div className="pud-catalog-dropzone-text">
                                                {catalogFile ? catalogFile.name : "Click to upload or drag & drop a file/image here"}
                                            </div>
                                            {catalogFile && (
                                                <button
                                                    type="button"
                                                    className="pud-catalog-dropzone-remove"
                                                    onClick={(e) => { e.stopPropagation(); handleCatalogFileSelect(null); }}
                                                >
                                                    <IconTrash /> Remove
                                                </button>
                                            )}
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
                                    disabled={creatingCatalog}
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

            {/* ---------- Show Catalogs: full-page view ----------
                Portaled into the main content area (rendered by the parent
                dashboard) instead of a modal, so it opens exactly like the
                other sidebar options do — a full-width page swap. */}
            {showCatalogListModal && fullViewContainer && createPortal(
                <>
                    <div className="pud-catalog-fullview-header">
                        <div>
                            <h1 className="pud-title">Your Catalogs</h1>
                            <p className="pud-subtitle">
                                <IconGrid /> {catalogItems.length} {catalogItems.length === 1 ? "Item" : "Items"} created or uploaded to your catalog
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
                            <button
                                type="button"
                                className="pud-btn pud-btn-message"
                                onClick={() => setShowCreateCatalogModal(true)}
                                style={{ background: "#2563eb", color: "#ffffff" }}
                            >
                                + Add Catalog
                            </button>
                        </div>
                    </div>

                    {catalogItems.length === 0 ? (
                        <div className="pud-catalog-empty-state">
                            <div className="pud-catalog-dropzone-icon"><IconGridLarge /></div>
                            <div className="pud-catalog-dropzone-text">No catalogs yet</div>
                            <div className="pud-catalog-dropzone-subtext">
                                Use "Create Catalog" or "Upload Catalog" to add your first item.
                            </div>
                        </div>
                    ) : (
                        <div className="pud-catalog-grid">
                            {catalogItems.map((item) => (
                                <div className="pud-catalog-card">
                                    <div className="pud-catalog-card-media">
                                        {item.filePreview ? (
                                            <img src={item.filePreview} alt={item.catalogName} />
                                        ) : (
                                            <div className="pud-catalog-card-media-placeholder"><IconFileGeneric /></div>
                                        )}
                                        <span className={`pud-catalog-card-source pud-catalog-card-source-${item.source}`}>
                                            {item.source === "created" ? "Created" : "Uploaded"}
                                        </span>
                                    </div>
                                    <div className="pud-catalog-card-body">
                                        <div className="pud-catalog-card-name" title={item.catalogName}>{item.catalogName}</div>
                                        {item.description && (
                                            <div className="pud-catalog-card-desc">{item.description}</div>
                                        )}
                                        <div className="pud-catalog-card-meta">
                                            {!!item.price && (
                                                <span className="pud-catalog-card-price">${Number(item.price).toFixed(2)}</span>
                                            )}
                                            {item.unitOfMeasure && (
                                                <span className="pud-catalog-card-uom">{item.unitOfMeasure}</span>
                                            )}
                                        </div>
                                        {(item.classTitle || item.catalogType || item.isPunchOut) && (
                                            <div className="pud-catalog-card-badges">
                                                {item.catalogType && <span className="pud-catalog-card-tag">{item.catalogType}</span>}
                                                {item.classTitle && <span className="pud-catalog-card-tag">{item.classTitle}</span>}
                                                {item.isPunchOut && <span className="pud-catalog-card-tag pud-catalog-card-tag-punchout">PunchOut</span>}
                                            </div>
                                        )}
                                        <div className="pud-catalog-card-date">Added {formatCatalogDate(item.addedAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>,
                fullViewContainer
            )}
        </>
    );
};

export default Catalog;