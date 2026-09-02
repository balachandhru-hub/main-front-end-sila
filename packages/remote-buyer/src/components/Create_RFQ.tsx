import React, { useRef, useState, useEffect } from "react";
import "./Create.RFQ.css";
import { toastService } from "@vosox/shared-ui";
import { getBuyerProfile, getAllDepartments, getAllCostCenters, getAllItemMasters, createRFQ, getVerifiedSuppliers, getUnspscSegments, getUnspscFamilies, fetchBuyerVerificationTemplates, fetchBuyerVerificationTemplateById } from "../api/Buyerapi";
import type { VerificationTemplate } from "../api/Buyerapi";
import { getCountries, getUnits, getCurrencies, fetchReferenceList } from "../api/masterdataApi";
import type { CreateRFQPayload, RfqDocumentAssetDto, RfqItemDto, RfqQuestionDto, VerifiedSupplierDto, SupplierVerificationType } from "../dto/rfqDto";
import type { UnspscSegmentDto, UnspscFamilyDto } from "../dto/masterDataDto";
import type { CountryDto, UnitDto, CurrencyDto } from "../api/masterdataApi";


const HARDCODED_RFQ_VERIFICATION_TEMPLATE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    uom: string;
    price: string;
    materialCode: string;
}

type StepKey = "details" | "suppliers" | "summary";

type FieldType = "INPUT" | "RADIO_BUTTON" | "CHECK_BOX" | "FILE";

interface CustomField {
    id: string;
    label: string;
    type: FieldType;
    options: string[];
}


const IconCalendar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
);

const IconTrash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const IconPlus = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const IconList = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const IconSourcing = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 2v10l7 4" />
    </svg>
);


const IconArrowRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const IconSearch = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const IconCheckCircle = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="16 9 10.5 15 8 12.5" />
    </svg>
);

const IconXCircle = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
        <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
    </svg>
);

const IconMail = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 6-10 7L2 6" />
    </svg>
);

const IconSend = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

const IconShieldCheck = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#4f46e5" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.8 12l-2.4-2.8.5-3.7-3.6-.9-1.9-3.1-3.4 1.5-3.4-1.5-1.9 3.1-3.6.9.5 3.7-2.4 2.8 2.4 2.8-.5 3.7 3.6.9 1.9 3.1 3.4-1.5 3.4 1.5 1.9-3.1 3.6-.9-.5-3.7 2.4-2.8z" />
        <polyline points="9 12 11 14 15 10" stroke="#ffffff" fill="none" strokeWidth="3" />
    </svg>
);

const IconEye = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconCheckBig = () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconChevronDown = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);


const steps: { key: StepKey; label: string }[] = [
    { key: "details", label: "1. RFQ Details" },
    { key: "suppliers", label: "2. Select Suppliers" },
    { key: "summary", label: "3. Summary & Dispatch" },
];

const initialLineItems: LineItem[] = [];

const initialCustomFields: CustomField[] = [];


const PAGE_LIMIT = 10;

/* ---------------------------------- Helpers ---------------------------------- */

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });

const buildDocumentAsset = async (
    file: File,
    entityId: string,
    assetType: string
): Promise<RfqDocumentAssetDto> => {
    const fileBytes = await fileToBase64(file);
    return {
        entityType: "RFQ",
        entityId: entityId || "",
        assetType,
        fileBytes,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        isSingletonAsset: true,
    };
};


const formatLabel = (value: string | undefined | null): string => {
    if (!value) return "";
    return value
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
        .join(" ");
};


const getMaterialCodeDescription = (m: any): string => {
    if (!m || typeof m === "string") return "";
    return m.description || m.Description || m.itemDescription || m.materialDescription || m.itemMasterDescription || "";
};


function usePaginatedSearchSelect<T>(
    fetcher: (index: number, limit: number, searchTerm?: string) => Promise<{ items: T[]; totalCount: number }>,
    isOpen: boolean,
    searchTerm: string,
    getKey: (item: T) => string,
    limit: number = PAGE_LIMIT
) {
    const [options, setOptions] = useState<T[]>([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const inFlightRef = useRef(false);

    const dedupe = (items: T[]) =>
        Array.from(new Map(items.map((i) => [getKey(i), i])).values());

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            const run = async () => {
                if (inFlightRef.current) return;
                inFlightRef.current = true;
                setLoading(true);
                try {
                    const res = await fetcher(0, limit, searchTerm.trim() || undefined);
                    const items = res?.items || [];
                    setOptions(dedupe(items));
                    setPageIndex(0);
                    setHasMore(items.length === limit);
                } catch (err) {
                    setOptions([]);
                    setHasMore(false);
                } finally {
                    setLoading(false);
                    inFlightRef.current = false;
                }
            };
            run();
        }, 350);
        return () => clearTimeout(timer);
    }, [isOpen, searchTerm]);

    const loadMore = async () => {
        if (inFlightRef.current || loading || !hasMore) return;
        inFlightRef.current = true;
        const nextIndex = pageIndex + 1;
        setLoading(true);
        try {
            const res = await fetcher(nextIndex, limit, searchTerm.trim() || undefined);
            const items = res?.items || [];
            setOptions((prev) => dedupe([...prev, ...items]));
            setPageIndex(nextIndex);
            setHasMore(items.length === limit);
        } catch (err) {
        } finally {
            setLoading(false);
            inFlightRef.current = false;
        }
    };

    return { options, loading, hasMore, loadMore };
}


interface SearchableSelectProps<T> {
    value: string;
    placeholder: string;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    searchTerm: string;
    onSearchChange: (v: string) => void;
    options: T[];
    getOptionLabel: (opt: T) => string;
    getOptionKey: (opt: T) => string;
    onSelect: (opt: T) => void;
    loading: boolean;
    onScrollBottom: () => void;
    searchPlaceholder?: string;
    small?: boolean;
    hideSearch?: boolean;
    disabled?: boolean;
    error?: boolean;
}

function SearchableSelect<T,>({
    value,
    placeholder,
    isOpen,
    onToggle,
    onClose,
    searchTerm,
    onSearchChange,
    options,
    getOptionLabel,
    getOptionKey,
    onSelect,
    loading,
    onScrollBottom,
    searchPlaceholder,
    small,
    hideSearch,
    disabled,
    error,
}: SearchableSelectProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
            onScrollBottom();
        }
    };

    return (
        <div className="bd-custom-select-container" ref={containerRef}>
            <div
                className={`${small ? "bd-input-sm" : "bd-input"} bd-custom-select-trigger${disabled ? " disabled" : ""}${error ? " bd-input-error" : ""}`}
                onClick={() => !disabled && onToggle()}
                style={{ cursor: disabled ? "not-allowed" : "pointer", borderColor: error ? '#ef4444' : undefined }}
            >
                <span className="bd-custom-select-value">{value || placeholder}</span>
                <IconChevronDown />
            </div>
            {isOpen && !disabled && (
                <div className="bd-custom-select-panel">
                    {!hideSearch && (
                        <div className="bd-custom-select-search">
                            <div className="bd-search-wrap">
                                <span className="bd-search-icon">
                                    <IconSearch />
                                </span>
                                <input
                                    className="bd-input bd-search-input"
                                    style={{ width: "100%" }}
                                    type="text"
                                    placeholder={searchPlaceholder || "Search..."}
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                    <ul className="bd-custom-select-menu" onScroll={handleScroll}>
                        {options.map((opt) => (
                            <li
                                key={getOptionKey(opt)}
                                className={`bd-custom-select-option${getOptionLabel(opt) === value ? " selected" : ""}`}
                                onClick={() => onSelect(opt)}
                                title={getOptionLabel(opt)}
                            >
                                {getOptionLabel(opt)}
                            </li>
                        ))}
                        {loading && <li className="bd-custom-select-loading">Loading...</li>}
                        {!loading && options.length === 0 && (
                            <li className="bd-custom-select-empty">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ---------------------------------- Component ---------------------------------- */

const CreateRFQ: React.FC = () => {
    const [activeStep, setActiveStep] = useState<StepKey>("details");

    const [buyerProfileId, setBuyerProfileId] = useState<string>("");

    const [rfqTitle, setRfqTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [departmentOptions, setDepartmentOptions] = useState<any[]>([]);
    const [materialCodeOptions, setMaterialCodeOptions] = useState<any[]>([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const profile = await getBuyerProfile();
                if (profile?.id) {
                    setBuyerProfileId(profile.id);

                    const res = await getAllDepartments(profile.id, 0, 10000);
                    const data = res?.data?.data || res?.data || res || [];
                    setDepartmentOptions(Array.isArray(data) ? data : []);

                    const itemRes = await getAllItemMasters(profile.id, 0, 10000);
                    const itemData = itemRes?.data?.data || itemRes?.data || itemRes || [];
                    setMaterialCodeOptions(Array.isArray(itemData) ? itemData : []);
                }
            } catch (err) {
            
            }
        };
        fetchInitialData();
    }, []);
    const [costCenter, setCostCenter] = useState("");
    const [costCenterOptions, setCostCenterOptions] = useState<any[]>([]);

    useEffect(() => {
        const fetchCostCenters = async () => {
            if (!department) {
                setCostCenterOptions([]);
                return;
            }
            try {
                const res = await getAllCostCenters(department, 0, 10000);
                const data = res?.data?.data || res?.data || res || [];
                setCostCenterOptions(Array.isArray(data) ? data : []);
            } catch (err) {
            
            }
        };
        fetchCostCenters();
    }, [department]);

    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
    const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
    const [departmentLabel, setDepartmentLabel] = useState("");

    const getDeptName = (d: any, idx: number) =>
        typeof d === "string" ? d : (d.department || d.name || d.Name || `Dept ${idx}`);
    const getDeptId = (d: any, idx: number) =>
        typeof d === "string" ? d : (d.id || getDeptName(d, idx));

    const filteredDepartmentOptions = departmentOptions.filter((d, idx) =>
        formatLabel(getDeptName(d, idx)).toLowerCase().includes(departmentSearchTerm.trim().toLowerCase())
    );

    const [isCostCenterDropdownOpen, setIsCostCenterDropdownOpen] = useState(false);
    const [costCenterSearchTerm, setCostCenterSearchTerm] = useState("");
    const [costCenterLabel, setCostCenterLabel] = useState("");

    const getCcName = (c: any, idx: number) =>
        typeof c === "string" ? c : (c.costCenter || c.name || c.Name || `CC ${idx}`);
    const getCcId = (c: any, idx: number) =>
        typeof c === "string" ? c : (c.id || getCcName(c, idx));

    const filteredCostCenterOptions = costCenterOptions.filter((c, idx) =>
        formatLabel(getCcName(c, idx)).toLowerCase().includes(costCenterSearchTerm.trim().toLowerCase())
    );

    const [segmentCode, setSegmentCode] = useState("");
    const [segmentTitle, setSegmentTitle] = useState("");
    const [segmentOptions, setSegmentOptions] = useState<UnspscSegmentDto[]>([]);

    const [familyCode, setFamilyCode] = useState("");
    const [familyTitle, setFamilyTitle] = useState("");
    const [familyOptions, setFamilyOptions] = useState<UnspscFamilyDto[]>([]);

    useEffect(() => {
        const fetchSegments = async () => {
            try {
                const data = await getUnspscSegments(1, 200);
                setSegmentOptions(data);
            } catch (err) {
              
            }
        };
        fetchSegments();
    }, []);

    useEffect(() => {
        const fetchFamilies = async () => {
            if (!segmentCode) {
                setFamilyOptions([]);
                return;
            }
            try {
                const data = await getUnspscFamilies(Number(segmentCode), 1, 200);
                setFamilyOptions(data);
            } catch (err) {
            }
        };
        fetchFamilies();
    }, [segmentCode]);

    const handleSegmentChange = (value: string) => {
        setSegmentCode(value);
        setFamilyCode("");
        setFamilyTitle("");
        const selected = segmentOptions.find((s) => String(s.segment) === value);
        setSegmentTitle(selected?.title || "");
    };

    const handleFamilyChange = (value: string) => {
        setFamilyCode(value);
        const selected = familyOptions.find((f) => String(f.family) === value);
        setFamilyTitle(selected?.title || "");
    };

    const [isSegmentDropdownOpen, setIsSegmentDropdownOpen] = useState(false);
    const [segmentSearchTerm, setSegmentSearchTerm] = useState("");
    const filteredSegmentOptions = segmentOptions.filter((s) =>
        s.title.toLowerCase().includes(segmentSearchTerm.trim().toLowerCase())
    );

    const [isFamilyDropdownOpen, setIsFamilyDropdownOpen] = useState(false);
    const [familySearchTerm, setFamilySearchTerm] = useState("");
    const filteredFamilyOptions = familyOptions.filter((f) =>
        f.title.toLowerCase().includes(familySearchTerm.trim().toLowerCase())
    );
const getCurrenciesSafe = async (
    index: number,
    limit: number
): Promise<{ items: CurrencyDto[]; totalCount: number }> => {
    try {
        const res = await getCurrencies(index, limit);
        if (res && Array.isArray((res as any).items)) {
            return res as { items: CurrencyDto[]; totalCount: number };
        }
    } catch (err) {
       
    }
    return { items: [], totalCount: 0 };
};

const getCountriesSafe = async (
    index: number,
    limit: number,
    searchTerm?: string
): Promise<{ items: CountryDto[]; totalCount: number }> => {
    try {
        const res = await getCountries(index, limit, searchTerm);
        if (res && Array.isArray((res as any).items)) {
            return res as { items: CountryDto[]; totalCount: number };
        }
    } catch (err) {
    }
    return { items: [], totalCount: 0 };
};

const getUnitsSafe = async (
    index: number,
    limit: number,
    searchTerm?: string
): Promise<{ items: UnitDto[]; totalCount: number }> => {
    try {
        const res = await getUnits(index, limit, searchTerm);
        if (res && Array.isArray((res as any).items)) {
            return res as { items: UnitDto[]; totalCount: number };
        }
    } catch (err) {
    }
    return { items: [], totalCount: 0 };
};
    const [currency, setCurrency] = useState("");
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const [currencySearchTerm, setCurrencySearchTerm] = useState("");
    const [region, setRegion] = useState("");
    const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
    const [regionSearchTerm, setRegionSearchTerm] = useState("");

    const [isUomDropdownOpen, setIsUomDropdownOpen] = useState(false);
    const [uomSearchTerm, setUomSearchTerm] = useState("");
    const currencySelect = usePaginatedSearchSelect<CurrencyDto>(getCurrenciesSafe, isCurrencyDropdownOpen, currencySearchTerm, (o) => o.id);
    const regionSelect = usePaginatedSearchSelect<CountryDto>(getCountriesSafe, isRegionDropdownOpen, regionSearchTerm, (o) => o.id);
    const uomSelect = usePaginatedSearchSelect<UnitDto>(getUnitsSafe, isUomDropdownOpen, uomSearchTerm, (o) => o.id);
    const [description, setDescription] = useState("");
    const [deliveryLocation, setDeliveryLocation] = useState("");
    const [startDateTime, setStartDateTime] = useState("");
    const [endDateTime, setEndDateTime] = useState("");
    const [deliveryTargetDate, setDeliveryTargetDate] = useState("");

    const [techSpecFile, setTechSpecFile] = useState<string | null>(null);
    const [termsFile, setTermsFile] = useState<string | null>(null);

    const [techSpecFileObj, setTechSpecFileObj] = useState<File | null>(null);
    const [termsFileObj, setTermsFileObj] = useState<File | null>(null);

    const techSpecInputRef = useRef<HTMLInputElement>(null);
    const termsInputRef = useRef<HTMLInputElement>(null);

    const [lotOption, setLotOption] = useState(false);
    const [totalBudget, setTotalBudget] = useState("");

    const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldType, setNewFieldType] = useState<FieldType>("INPUT");

    const [fieldTypeOptions, setFieldTypeOptions] = useState<any[]>([]);
    const [checkboxOptions, setCheckboxOptions] = useState<string[]>([]);
    const [checkboxOptionInput, setCheckboxOptionInput] = useState("");

    useEffect(() => {
        const loadFieldTypes = async () => {
            try {
                const data = await fetchReferenceList(["QUESTION_TYPE"]);
if (Array.isArray(data)) {
    const filtered = data.filter((item: any) =>
        ["INPUT", "RADIO_BUTTON", "CHECK_BOX", "FILE"].includes(item.key)
    );
    setFieldTypeOptions(filtered);
}
            } catch (err) {
            }
        };
        loadFieldTypes();
    }, []);

    const getFieldTypeLabel = (key: string) =>
        fieldTypeOptions.find((t) => t.key === key)?.description || key;

    const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);
    const [newItemDesc, setNewItemDesc] = useState("");
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemUom, setNewItemUom] = useState("EA");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemMaterialCode, setNewItemMaterialCode] = useState("");

    const handleMaterialCodeChange = (code: string) => {
        setNewItemMaterialCode(code);
        if (!code) return;
        const selected = materialCodeOptions.find((m: any) => {
            const mCode = typeof m === 'string' ? m : (m.materialCode || m.id);
            return mCode === code;
        });
        if (selected) {
            const desc = getMaterialCodeDescription(selected);
            if (desc && !newItemDesc) {
                setNewItemDesc(desc);
            }
        }
    };

    const [suppliers, setSuppliers] = useState<VerifiedSupplierDto[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [suppliersError, setSuppliersError] = useState<string | null>(null);
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
    const [supplierTypeFilter, setSupplierTypeFilter] = useState<"ALL" | SupplierVerificationType>("ALL");
    const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
    const [registrationTemplate, setRegistrationTemplate] = useState("");
    const [registrationTemplateId, setRegistrationTemplateId] = useState("");
    // const supplierRegistrationLink = "https://supplier.company.com/register";

    const [templateOptions, setTemplateOptions] = useState<VerificationTemplate[]>([]);
    const [templatePageIndex, setTemplatePageIndex] = useState(0);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templateHasMore, setTemplateHasMore] = useState(true);
    const [templateSearchTerm, setTemplateSearchTerm] = useState("");
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

    const templateLoadingRef = useRef(false);

    const loadRegistrationTemplates = async (index: number, append: boolean) => {
        if (templateLoadingRef.current) return;
        templateLoadingRef.current = true;
        setTemplateLoading(true);
        try {
            const data = await fetchBuyerVerificationTemplates(index, PAGE_LIMIT);
            if (Array.isArray(data)) {
                setTemplateOptions((prev) => {
                    const base = append ? prev : [];
                    const merged = new Map(base.map((t) => [t.templateId, t]));
                    data.forEach((t) => merged.set(t.templateId, t));
                    return Array.from(merged.values());
                });
                setTemplateHasMore(data.length === PAGE_LIMIT);
                setTemplatePageIndex(index);
            } else {
                if (!append) setTemplateOptions([]);
                setTemplateHasMore(false);
            }
        } catch (err) {
            if (!append) setTemplateOptions([]);
            setTemplateHasMore(false);
        } finally {
            setTemplateLoading(false);
            templateLoadingRef.current = false;
        }
    };

    useEffect(() => {
        if (isTemplateDropdownOpen && templateOptions.length === 0) {
            loadRegistrationTemplates(0, false);
        }
    }, [isTemplateDropdownOpen]);

    const handleTemplateScrollBottom = () => {
        if (templateLoading || !templateHasMore) return;
        loadRegistrationTemplates(templatePageIndex + 1, true);
    };

    const filteredTemplateOptions = templateOptions.filter((t) =>
        t.templateName.toLowerCase().includes(templateSearchTerm.trim().toLowerCase())
    );

    const [isViewTemplateOpen, setIsViewTemplateOpen] = useState(false);
    const [viewTemplateLoading, setViewTemplateLoading] = useState(false);
    const [viewTemplateError, setViewTemplateError] = useState<string | null>(null);
    const [viewTemplateData, setViewTemplateData] = useState<VerificationTemplate | null>(null);

    const handleViewTemplate = async () => {
        if (!registrationTemplateId) return;
        setIsViewTemplateOpen(true);
        setViewTemplateLoading(true);
        setViewTemplateError(null);
        try {
            const data = await fetchBuyerVerificationTemplateById(registrationTemplateId);
            if (data && "statusCode" in data) {
                setViewTemplateError(data.message || "Failed to load template.");
                setViewTemplateData(null);
            } else {
                setViewTemplateData(data as VerificationTemplate);
            }
        } catch (err: any) {
            setViewTemplateError(err?.message || "Failed to load template.");
        } finally {
            setViewTemplateLoading(false);
        }
    };

    const closeViewTemplate = () => {
        setIsViewTemplateOpen(false);
        setViewTemplateData(null);
        setViewTemplateError(null);
    };

    useEffect(() => {
        if (activeStep !== "suppliers") return;
        if (!buyerProfileId) return;

        const timer = setTimeout(() => {
            const fetchSuppliers = async () => {
                setSuppliersLoading(true);
                setSuppliersError(null);
                try {
                    const payload: {
                        index: number;
                        limit: number;
                        searchTerm?: string;
                        segmentCode?: string;
                        familyCode?: string;
                        type?: SupplierVerificationType;
                        buyerId: string;
                    } = {
                        index: 0,
                        limit: 50,
                        buyerId: buyerProfileId,
                    };
                    if (supplierSearchQuery.trim()) payload.searchTerm = supplierSearchQuery.trim();
                    if (supplierTypeFilter !== "ALL") payload.type = supplierTypeFilter;
                    if (segmentCode) payload.segmentCode = segmentCode;
                    if (familyCode) payload.familyCode = familyCode;

                    const data = await getVerifiedSuppliers(payload);
                    
                    const uniqueSuppliers = Array.from(
                        new Map(data.map(s => [s.supplierId, s])).values()
                    );
                    
                    setSuppliers(uniqueSuppliers);
                } catch (err: any) {
                    setSuppliersError(err?.message || "Failed to fetch suppliers.");
                    setSuppliers([]);
                } finally {
                    setSuppliersLoading(false);
                }
            };
            fetchSuppliers();
        }, 350);

        return () => clearTimeout(timer);
    }, [activeStep, buyerProfileId, supplierSearchQuery, supplierTypeFilter, segmentCode, familyCode]);

    const [rfqNumber, setRfqNumber] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});

    const [isSubmittingRFQ, setIsSubmittingRFQ] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const formatDateTimeLabel = (value: string) => {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        const d = String(date.getUTCDate()).padStart(2, "0");
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const y = date.getUTCFullYear();
        let hh = date.getUTCHours();
        const mm = String(date.getUTCMinutes()).padStart(2, "0");
        const suffix = hh >= 12 ? "PM" : "AM";
        hh = hh % 12 || 12;
        return `${d}/${m}/${y} ~ ${String(hh).padStart(2, "0")}:${mm} ${suffix} UTC`;
    };

    const formatDateLabel = (value: string) => {
        if (!value) return "";
        const date = new Date(`${value}T00:00:00Z`);
        if (isNaN(date.getTime())) return value;
        const d = String(date.getUTCDate()).padStart(2, "0");
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const y = date.getUTCFullYear();
        return `${d}/${m}/${y} UTC`;
    };

    const handleAddLineItem = () => {
        if (!newItemDesc.trim()) return;
        const item: LineItem = {
            id: `li-${Date.now()}`,
            description: newItemDesc.trim(),
            quantity: newItemQty || 1,
            uom: newItemUom,
            price: newItemPrice.trim(),
            materialCode: newItemMaterialCode,
        };
        setLineItems((prev) => {
            const next = [...prev, item];
            return next;
        });
        setErrors((p) => { const np = { ...p }; delete np.lineItems; return np; });
        setNewItemDesc("");
        setNewItemQty(1);
        setNewItemUom("EA");
        setNewItemPrice("");
        setNewItemMaterialCode("");
    };

    const handleRemoveLineItem = (id: string) => {
        setLineItems((prev) => prev.filter((li) => li.id !== id));
    };

    const handleAddCheckboxOption = () => {
        const val = checkboxOptionInput.trim();
        if (!val) return;
        if (checkboxOptions.includes(val)) return;
        setCheckboxOptions((prev) => [...prev, val]);
        setCheckboxOptionInput("");
    };

    const handleRemoveCheckboxOption = (idx: number) => {
        setCheckboxOptions((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleAddCustomField = () => {
        if (!newFieldLabel.trim()) return;

        let options: string[] = [];
        if (newFieldType === "RADIO_BUTTON") {
            options = ["Yes", "No"];
        } else if (newFieldType === "CHECK_BOX") {
            options = [...checkboxOptions];
        }

        const field: CustomField = {
            id: `cf-${Date.now()}`,
            label: newFieldLabel.trim(),
            type: newFieldType,
            options,
        };

        setCustomFields((prev) => [...prev, field]);
        setNewFieldLabel("");
        setNewFieldType("INPUT");
        setCheckboxOptions([]);
        setCheckboxOptionInput("");
    };

    const handleRemoveCustomField = (id: string) => {
        setCustomFields((prev) => prev.filter((f) => f.id !== id));
    };

    const handleFileChosen = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFile: React.Dispatch<React.SetStateAction<string | null>>,
        setFileObj: React.Dispatch<React.SetStateAction<File | null>>
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            setFile(file.name.length > 12 ? `${file.name.slice(0, 10)}...` : file.name);
            setFileObj(file);
        }
        e.target.value = "";
    };

    const handleNext = () => {
        if (activeStep === "details") {
            const newErrors: Record<string, string> = {};
            if (!rfqTitle.trim()) newErrors.rfqTitle = "Please enter RFQ Title";
            if (!department) newErrors.department = "Please select Department";
            if (!description.trim()) newErrors.description = "Please enter description";
            if (!currency) newErrors.currency = "Please select Currency";
            if (!region) newErrors.region = "Please select Region";
            if (!deliveryLocation.trim()) newErrors.deliveryLocation = "Please enter delivery location";
            if (!startDateTime) newErrors.startDateTime = "Please select Start Date & Time";
            if (!endDateTime) newErrors.endDateTime = "Please select End Date & Time";
            if (!deliveryTargetDate) newErrors.deliveryTargetDate = "Please select Delivery Target Date";
            if (!lineItems || lineItems.length === 0) newErrors.lineItems = "Please add at least one line item";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                try {
                    if (typeof toastService !== "undefined" && toastService && typeof toastService.error === "function") {
                        toastService.error("Please fill the required fields");
                    }
                } catch (e) {
                }
                return;
            }

            setErrors({});
            setActiveStep("suppliers");
        } else if (activeStep === "suppliers") setActiveStep("summary");
    };

    const toggleSupplier = (id: string) => {
        setSelectedSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const selectedSuppliers = suppliers.filter((s) => selectedSupplierIds.includes(s.supplierId));
    const verifiedSelectedCount = selectedSuppliers.filter((s) => s.isVerified).length;
    const unverifiedSelectedCount = selectedSuppliers.length - verifiedSelectedCount;
    const hasUnverifiedSelected = unverifiedSelectedCount > 0;
    const targetCategory = familyTitle || segmentTitle || "Not set";

    const handleSubmitRFQ = async () => {
        if (selectedSupplierIds.length === 0) return;

        setSubmitError(null);
        setIsSubmittingRFQ(true);

        try {
            const technicalSpecificationDocuments: RfqDocumentAssetDto[] = techSpecFileObj
                ? [await buildDocumentAsset(techSpecFileObj, buyerProfileId, "TechnicalSpecification")]
                : [];

            const termsConditionDocuments: RfqDocumentAssetDto[] = termsFileObj
                ? [await buildDocumentAsset(termsFileObj, buyerProfileId, "TermsAndConditions")]
                : [];

            const questionTypeLegacyMap: Record<string, string> = {
                INPUT: "Text",
                RADIO_BUTTON: "Radio",
                CHECK_BOX: "Checkbox",
            };

            const questions: RfqQuestionDto[] = customFields.map((field, idx) => ({
                question: field.label,
                questionType: questionTypeLegacyMap[field.type] || field.type,
                isRequired: false,
                displayOrder: idx,
                options: field.options,
            }));

            const items: RfqItemDto[] = lineItems.map((li) => ({
                description: li.description,
                quantity: li.quantity,
                uom: li.uom,
                materialCode: li.materialCode,
                materialGroup: "",
                costCenter: costCenter,
                attachments: [],
            }));

            const payload: CreateRFQPayload = {
                title: rfqTitle,
                description,
                department,
                region,
                currency,
                deliveryLocation,
                startDate: new Date(startDateTime).toISOString(),
                endDate: new Date(endDateTime).toISOString(),
                deliveryTargetDate: new Date(deliveryTargetDate).toISOString(),
                budget: Number(totalBudget) || 0,
                addLotOption: lotOption,
                technicalSpecificationDocuments,
                termsConditionDocuments,
                questions,
                items,
                supplierIds: selectedSupplierIds,
                rfqVerificationTemplateId: registrationTemplateId || HARDCODED_RFQ_VERIFICATION_TEMPLATE_ID,
            };

            const response = await createRFQ(payload);
            setRfqNumber(response.id);
            setActiveStep("summary");
        } catch (err: any) {
            setSubmitError(err?.message || "Failed to submit RFQ. Please try again.");
        } finally {
            setIsSubmittingRFQ(false);
        }
    };

    const handleReset = () => {
        setActiveStep("details");
    };

    return (
        <div className="bd-rfq-card">
            <div className="bd-rfq-header">
                <div>
                    <div className="bd-rfq-title">Create Request For Quotation (RFQ)</div>
                    <div className="bd-rfq-subtitle">
                        Draft your requirements, item catalogs, and dispatch directly to approved suppliers.
                    </div>
                </div>
                <div className="bd-stepper">
                    {steps.map((step, idx) => (
                        <React.Fragment key={step.key}>
                            <span className={`bd-step${activeStep === step.key ? " bd-step-active" : ""}`}>
                                {step.label}
                            </span>
                            {idx < steps.length - 1 && (
                                <span className="bd-step-sep">
                                    <IconArrowRight />
                                </span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {activeStep === "details" && (
                <>
                    <div className="bd-field">
                        <label className="bd-label">RFQ Title*</label>
                        <input
                            className={`bd-input ${errors.rfqTitle ? "bd-input-error" : ""}`}
                            style={errors.rfqTitle ? { borderColor: "#ef4444" } : undefined}
                            type="text"
                            value={rfqTitle}
                            onChange={(e) => {
                                setRfqTitle(e.target.value);
                                setErrors((p) => { const np = { ...p }; delete np.rfqTitle; return np; });
                            }}
                            onBlur={() => setErrors((p) => { const np = { ...p }; delete np.rfqTitle; return np; })}
                        />
                        {errors.rfqTitle && <div className="bd-error-text">{errors.rfqTitle}</div>}
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Department*</label>
                            <SearchableSelect<any>
                                value={departmentLabel}
                                placeholder="Select Department"
                                isOpen={isDepartmentDropdownOpen}
                                onToggle={() => setIsDepartmentDropdownOpen((prev) => !prev)}
                                onClose={() => setIsDepartmentDropdownOpen(false)}
                                searchTerm={departmentSearchTerm}
                                onSearchChange={setDepartmentSearchTerm}
                                options={filteredDepartmentOptions}
                                getOptionLabel={(d) => formatLabel(getDeptName(d, departmentOptions.indexOf(d)))}
                                getOptionKey={(d) => getDeptId(d, departmentOptions.indexOf(d))}
                                onSelect={(d) => {
                                    const idx = departmentOptions.indexOf(d);
                                    setDepartment(getDeptId(d, idx));
                                    setDepartmentLabel(formatLabel(getDeptName(d, idx)));
                                    setCostCenter("");
                                    setCostCenterLabel("");
                                    setIsDepartmentDropdownOpen(false);
                                    setDepartmentSearchTerm("");
                                    setErrors((p) => { const np = { ...p }; delete np.department; return np; });
                                }}
                                loading={false}
                                onScrollBottom={() => { }}
                                searchPlaceholder="Search department..."
                                error={!!errors.department}
                            />
                            {errors.department && <div className="bd-error-text">{errors.department}</div>}
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Cost Center</label>
                            <SearchableSelect<any>
                                value={costCenterLabel}
                                placeholder={department ? "Select Cost Center" : "Select Department First"}
                                isOpen={isCostCenterDropdownOpen}
                                onToggle={() => setIsCostCenterDropdownOpen((prev) => !prev)}
                                onClose={() => setIsCostCenterDropdownOpen(false)}
                                searchTerm={costCenterSearchTerm}
                                onSearchChange={setCostCenterSearchTerm}
                                options={filteredCostCenterOptions}
                                getOptionLabel={(c) => formatLabel(getCcName(c, costCenterOptions.indexOf(c)))}
                                getOptionKey={(c) => getCcId(c, costCenterOptions.indexOf(c))}
                                onSelect={(c) => {
                                    const idx = costCenterOptions.indexOf(c);
                                    setCostCenter(getCcId(c, idx));
                                    setCostCenterLabel(formatLabel(getCcName(c, idx)));
                                    setIsCostCenterDropdownOpen(false);
                                    setCostCenterSearchTerm("");
                                }}
                                loading={false}
                                onScrollBottom={() => { }}
                                searchPlaceholder="Search cost center..."
                                disabled={!department}
                            />
                            
                        </div>
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Segment</label>
                            <SearchableSelect<UnspscSegmentDto>
                                value={segmentTitle}
                                placeholder="Select Segment"
                                isOpen={isSegmentDropdownOpen}
                                onToggle={() => setIsSegmentDropdownOpen((prev) => !prev)}
                                onClose={() => setIsSegmentDropdownOpen(false)}
                                searchTerm={segmentSearchTerm}
                                onSearchChange={setSegmentSearchTerm}
                                options={filteredSegmentOptions}
                                getOptionLabel={(o) => o.title}
                                getOptionKey={(o) => String(o.segment)}
                                onSelect={(o) => {
                                    handleSegmentChange(String(o.segment));
                                    setIsSegmentDropdownOpen(false);
                                    setSegmentSearchTerm("");
                                }}
                                loading={false}
                                onScrollBottom={() => { }}
                                searchPlaceholder="Search segment..."
                            />
                            
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Family</label>
                            <SearchableSelect<UnspscFamilyDto>
                                value={familyTitle}
                                placeholder={segmentCode ? "Select Family" : "Select Segment First"}
                                isOpen={isFamilyDropdownOpen}
                                onToggle={() => setIsFamilyDropdownOpen((prev) => !prev)}
                                onClose={() => setIsFamilyDropdownOpen(false)}
                                searchTerm={familySearchTerm}
                                onSearchChange={setFamilySearchTerm}
                                options={filteredFamilyOptions}
                                getOptionLabel={(o) => o.title}
                                getOptionKey={(o) => String(o.family)}
                                onSelect={(o) => {
                                    handleFamilyChange(String(o.family));
                                    setIsFamilyDropdownOpen(false);
                                    setFamilySearchTerm("");
                                }}
                                loading={false}
                                onScrollBottom={() => { }}
                                searchPlaceholder="Search family..."
                                disabled={!segmentCode}
                            />
                            
                        </div>
                    </div>

                    <div className="bd-field">
                        <label className="bd-label">Description*</label>
                        <textarea
                            className={`bd-textarea ${errors.description ? "bd-input-error" : ""}`}
                            style={errors.description ? { borderColor: "#ef4444" } : undefined}
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => setErrors((p) => { const np = { ...p }; delete np.description; return np; })}
                        />
                        {errors.description && <div className="bd-error-text">{errors.description}</div>}
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Currency*</label>
                            <SearchableSelect<CurrencyDto>
                                value={currency}
                                placeholder="Select Currency"
                                isOpen={isCurrencyDropdownOpen}
                                onToggle={() => setIsCurrencyDropdownOpen((prev) => !prev)}
                                onClose={() => setIsCurrencyDropdownOpen(false)}
                                searchTerm={currencySearchTerm}
                                onSearchChange={setCurrencySearchTerm}
                                options={currencySelect.options}
                                getOptionLabel={(o) => o.currencyName}
                                getOptionKey={(o) => o.id}
                                onSelect={(o) => {
                                    setCurrency(o.currencyName);
                                    setIsCurrencyDropdownOpen(false);
                                    setCurrencySearchTerm("");
                                    setErrors((p) => { const np = { ...p }; delete np.currency; return np; });
                                }}
                                loading={currencySelect.loading}
                                onScrollBottom={currencySelect.loadMore}
                                hideSearch
                                error={!!errors.currency}
                            />
                            {errors.currency && <div className="bd-error-text">{errors.currency}</div>}
                        </div>
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Region*</label>
                            <SearchableSelect<CountryDto>
                                value={region}
                                placeholder="Select Region"
                                isOpen={isRegionDropdownOpen}
                                onToggle={() => setIsRegionDropdownOpen((prev) => !prev)}
                                onClose={() => setIsRegionDropdownOpen(false)}
                                searchTerm={regionSearchTerm}
                                onSearchChange={setRegionSearchTerm}
                                options={regionSelect.options}
                                getOptionLabel={(o) => o.countryName}
                                getOptionKey={(o) => o.id}
                                onSelect={(o) => {
                                    setRegion(o.countryName);
                                    setIsRegionDropdownOpen(false);
                                    setRegionSearchTerm("");
                                    setErrors((p) => { const np = { ...p }; delete np.region; return np; });
                                }}
                                loading={regionSelect.loading}
                                onScrollBottom={regionSelect.loadMore}
                                searchPlaceholder="Search country..."
                                error={!!errors.region}
                            />
                            {errors.region && <div className="bd-error-text">{errors.region}</div>}
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Delivery Location*</label>
                            <input
                                className={`bd-input ${errors.deliveryLocation ? "bd-input-error" : ""}`}
                                style={errors.deliveryLocation ? { borderColor: "#ef4444" } : undefined}
                                type="text"
                                value={deliveryLocation}
                                onChange={(e) => {
                                    setDeliveryLocation(e.target.value);
                                    setErrors((p) => { const np = { ...p }; delete np.deliveryLocation; return np; });
                                }}
                            />
                        </div>
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Start Date &amp; Time (UTC)*</label>
                            <div className="bd-input-icon-wrap">
                                <input
                                            className={`bd-input bd-input-with-icon ${errors.startDateTime ? "bd-input-error" : ""}`}
                                            style={errors.startDateTime ? { borderColor: "#ef4444" } : undefined}
                                    type="text"
                                    readOnly
                                    value={formatDateTimeLabel(startDateTime)}
                                    onClick={() =>
                                        (document.getElementById("bd-start-datetime") as HTMLInputElement)?.showPicker?.()
                                    }
                                />
                                <input
                                    id="bd-start-datetime"
                                    type="datetime-local"
                                    className="bd-hidden-date-input"
                                    value={startDateTime}
                                    onChange={(e) => {
                                        setStartDateTime(e.target.value);
                                        setErrors((p) => { const np = { ...p }; delete np.startDateTime; return np; });
                                    }}
                                />
                                <span className="bd-input-icon">
                                    <IconCalendar />
                                </span>
                            </div>
                                {errors.startDateTime && <div className="bd-error-text">{errors.startDateTime}</div>}
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">End Date &amp; Time (UTC)*</label>
                            <div className="bd-input-icon-wrap">
                                <input
                                    className={`bd-input bd-input-with-icon ${errors.endDateTime ? "bd-input-error" : ""}`}
                                    style={errors.endDateTime ? { borderColor: "#ef4444" } : undefined}
                                    type="text"
                                    readOnly
                                    value={formatDateTimeLabel(endDateTime)}
                                    onClick={() =>
                                        (document.getElementById("bd-end-datetime") as HTMLInputElement)?.showPicker?.()
                                    }
                                />
                                <input
                                    id="bd-end-datetime"
                                    type="datetime-local"
                                    className="bd-hidden-date-input"
                                    value={endDateTime}
                                    onChange={(e) => {
                                        setEndDateTime(e.target.value);
                                        setErrors((p) => { const np = { ...p }; delete np.endDateTime; return np; });
                                    }}
                                />
                                <span className="bd-input-icon">
                                    <IconCalendar />
                                </span>
                            </div>
                                {errors.endDateTime && <div className="bd-error-text">{errors.endDateTime}</div>}
                        </div>
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Delivery Target Date (UTC)*</label>
                            <div className="bd-input-icon-wrap">
                                <input
                                        className={`bd-input bd-input-with-icon ${errors.deliveryTargetDate ? "bd-input-error" : ""}`}
                                        style={errors.deliveryTargetDate ? { borderColor: "#ef4444" } : undefined}
                                    type="text"
                                    readOnly
                                    value={formatDateLabel(deliveryTargetDate)}
                                    onClick={() =>
                                        (document.getElementById("bd-target-date") as HTMLInputElement)?.showPicker?.()
                                    }
                                />
                                <input
                                    id="bd-target-date"
                                    type="date"
                                    className="bd-hidden-date-input"
                                    value={deliveryTargetDate}
                                    onChange={(e) => {
                                        setDeliveryTargetDate(e.target.value);
                                        setErrors((p) => { const np = { ...p }; delete np.deliveryTargetDate; return np; });
                                    }}
                                />
                                <span className="bd-input-icon">
                                    <IconCalendar />
                                </span>
                            </div>
                                {errors.deliveryTargetDate && <div className="bd-error-text">{errors.deliveryTargetDate}</div>}
                        </div>
                    </div>

                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Attachments (Technical Specifications)</label>
                            <div className="bd-dropzone" onClick={() => techSpecInputRef.current?.click()}>
                                Click to select file or drag and drop here
                            </div>
                            <input
                                ref={techSpecInputRef}
                                type="file"
                                className="bd-hidden-file-input"
                                onChange={(e) => handleFileChosen(e, setTechSpecFile, setTechSpecFileObj)}
                            />
                            {techSpecFile && (
                                <span className="bd-chip">
                                    {techSpecFile}
                                    <button
                                        className="bd-chip-remove"
                                        onClick={() => {
                                            setTechSpecFile(null);
                                            setTechSpecFileObj(null);
                                        }}
                                        type="button"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Terms &amp; Conditions</label>
                            <div className="bd-dropzone" onClick={() => termsInputRef.current?.click()}>
                                Click to select file or drag and drop here
                            </div>
                            <input
                                ref={termsInputRef}
                                type="file"
                                className="bd-hidden-file-input"
                                onChange={(e) => handleFileChosen(e, setTermsFile, setTermsFileObj)}
                            />
                            {termsFile && (
                                <span className="bd-chip">
                                    {termsFile}
                                    <button
                                        className="bd-chip-remove"
                                        onClick={() => {
                                            setTermsFile(null);
                                            setTermsFileObj(null);
                                        }}
                                        type="button"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bd-toggle-row">
                        <div>
                            <div className="bd-toggle-row-title">Lot Option</div>
                            <div className="bd-toggle-row-desc">
                                Disable item-level price evaluation. When enabled, evaluation is based on Total Budget.
                            </div>
                        </div>
                        <label className="bd-switch">
                            <input
                                type="checkbox"
                                checked={lotOption}
                                onChange={(e) => setLotOption(e.target.checked)}
                            />
                            <span className="bd-switch-slider" />
                        </label>
                    </div>

                    <div className="bd-field">
                        <label className="bd-label">Total Budget</label>
                        <input
                            className="bd-input"
                            type="text"
                            value={totalBudget}
                            onChange={(e) => setTotalBudget(e.target.value)}
                        />
                    </div>
                    <div className="bd-dsr-box">
                        <div className="bd-dsr-header">
                            <IconSourcing /> Dynamic Sourcing Requirements (Flexible Fields)
                        </div>
                        <div className="bd-dsr-sub">
                            Configure additional fields (Text, Dropdown, Radio, Checkbox) for suppliers to submit as part
                            of their compliance checklist.
                        </div>

                        <div className="bd-dsr-builder">
                            <div className="bd-dsr-builder-title">Create Custom Field Definition</div>
                            <div className="bd-dsr-builder-row">
                                <div className="bd-item-add-field">
                                    <label className="bd-label-sm">QUESTION/LABEL</label>
                                    <input
                                        className="bd-input-sm"
                                        type="text"
                                        placeholder="eg. Is the delivery charge separate?..."
                                        value={newFieldLabel}
                                        onChange={(e) => setNewFieldLabel(e.target.value)}
                                    />
                                </div>
                                <div className="bd-item-add-field">
                                    <label className="bd-label-sm">INPUT FIELD TYPE</label>
                                    <select
                                        className="bd-select-sm"
                                        value={newFieldType}
                                        onChange={(e) => {
                                            setNewFieldType(e.target.value as FieldType);
                                            setCheckboxOptions([]);
                                            setCheckboxOptionInput("");
                                        }}
                                    >
                                        {fieldTypeOptions.map((t) => (
                                            <option key={t.id} value={t.key}>
                                                {t.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bd-item-add-field">
                                    <label className="bd-label-sm">OPTIONS</label>

                                    {newFieldType === "INPUT" && (
                                        <input
                                            className="bd-input-sm"
                                            type="text"
                                            disabled
                                            placeholder="No options required"
                                        />
                                    )}

                                    {newFieldType === "FILE" && (
                                        <input
                                            className="bd-input-sm"
                                            type="text"
                                            disabled
                                            placeholder="No options required"
                                        />
                                    )}

                                    {newFieldType === "RADIO_BUTTON" && (
                                        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "6px 0" }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default", fontSize: 13, color: "#374151" }}>
                                                <input type="radio" disabled name="radio-preview" /> Yes
                                            </label>
                                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default", fontSize: 13, color: "#374151" }}>
                                                <input type="radio" disabled name="radio-preview" /> No
                                            </label>
                                        </div>
                                    )}

                                    {newFieldType === "CHECK_BOX" && (
                                        <div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input
                                                    className="bd-input-sm"
                                                    type="text"
                                                    placeholder="Type option..."
                                                    value={checkboxOptionInput}
                                                    onChange={(e) => setCheckboxOptionInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleAddCheckboxOption();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    className="bd-btn-add"
                                                    style={{ padding: "6px 10px", minWidth: "auto" }}
                                                    onClick={handleAddCheckboxOption}
                                                    type="button"
                                                    title="Add option"
                                                >
                                                    <IconPlus />
                                                </button>
                                            </div>
                                            {checkboxOptions.length > 0 && (
                                                <div className="bd-dsr-field-options" style={{ marginTop: 8 }}>
                                                    {checkboxOptions.map((opt, idx) => (
                                                        <span className="bd-dsr-option-pill" key={idx}>
                                                            {opt}
                                                            <button
                                                                className="bd-chip-remove"
                                                                onClick={() => handleRemoveCheckboxOption(idx)}
                                                                type="button"
                                                                style={{ marginLeft: 4 }}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button className="bd-btn-add" onClick={handleAddCustomField} type="button">
                                    <IconPlus /> Add
                                </button>
                            </div>

                            {customFields.length > 0 && (
                                <div className="bd-dsr-fields-list">
                                    {customFields.map((field) => (
                                        <div className="bd-dsr-field-card" key={field.id}>
                                            <button
                                                className="bd-dsr-field-remove"
                                                onClick={() => handleRemoveCustomField(field.id)}
                                                type="button"
                                                title="Remove field"
                                            >
                                                ×
                                            </button>
                                            <div className="bd-dsr-field-type">{getFieldTypeLabel(field.type)}</div>
                                            <div className="bd-dsr-field-label">{field.label}</div>
                                            {field.options.length > 0 && (
                                                <div className="bd-dsr-field-options">
                                                    {field.type === "RADIO_BUTTON" ? (
                                                        field.options.map((opt, idx) => (
                                                            <label
                                                                key={idx}
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 6,
                                                                    marginRight: 12,
                                                                    fontSize: 12,
                                                                    color: "#4b5563",
                                                                }}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    disabled
                                                                    name={`preview-${field.id}`}
                                                                    style={{ margin: 0 }}
                                                                />{" "}
                                                                {opt}
                                                            </label>
                                                        ))
                                                    ) : (
                                                        field.options.map((opt, idx) => (
                                                            <span className="bd-dsr-option-pill" key={idx}>
                                                                {opt}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <hr className="bd-section-divider" />
                    <div className="bd-section-label">Add materials or services required</div>

                    <div className="bd-item-add-row">
                        <div className="bd-item-add-grid-top">
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">DESCRIPTION</label>
                                <input
                                    className="bd-input-sm"
                                    type="text"
                                    placeholder="Select a material code to auto-fill"
                                    value={newItemDesc}
                                    readOnly
                                    style={{ background: "#f8fafc", color: "#6b7280", cursor: "default" }}
                                />
                            </div>
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">QUANTITY</label>
                                <input
                                    className="bd-input-sm"
                                    type="number"
                                    min={1}
                                    value={newItemQty}
                                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                                />
                            </div>
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">UOM</label>
                                <SearchableSelect<UnitDto>
                                    value={newItemUom}
                                    placeholder="Select UOM"
                                    isOpen={isUomDropdownOpen}
                                    onToggle={() => setIsUomDropdownOpen((prev) => !prev)}
                                    onClose={() => setIsUomDropdownOpen(false)}
                                    searchTerm={uomSearchTerm}
                                    onSearchChange={setUomSearchTerm}
                                    options={uomSelect.options}
                                    getOptionLabel={(o) => o.key}
                                    getOptionKey={(o) => o.id}
                                    onSelect={(o) => {
                                        setNewItemUom(o.key);
                                        setIsUomDropdownOpen(false);
                                        setUomSearchTerm("");
                                    }}
                                    loading={uomSelect.loading}
                                    onScrollBottom={uomSelect.loadMore}
                                    searchPlaceholder="Search unit..."
                                    small
                                />
                            </div>
                        </div>
                        <div className="bd-item-add-grid-bottom">
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">MATERIAL CODE</label>
                                <select
                                    className="bd-select-sm"
                                    value={newItemMaterialCode}
                                    onChange={(e) => handleMaterialCodeChange(e.target.value)}
                                >
                                    <option value="">Select Material Code</option>
                                    {materialCodeOptions.map((m: any, idx) => {
                                        const code = typeof m === 'string' ? m : (m.materialCode || m.id || `Code ${idx}`);
                                        return (
                                            <option key={code} value={code}>
                                                {code}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <button className="bd-btn-add" onClick={handleAddLineItem} type="button">
                                <IconPlus /> Add
                            </button>
                        </div>
                    </div>

                    <div className="bd-line-items-label">
                        <IconList /> LINE ITEMS
                    </div>
                    <div className="bd-table-responsive" style={errors.lineItems ? { border: "1px solid #ef4444", padding: 8, borderRadius: 6 } : undefined}>
                        <table className="bd-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Material Code</th>
                                    <th>Quantity</th>
                                    <th>UOM</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((li) => (
                                    <tr key={li.id}>
                                        <td>{li.description}</td>
                                        <td>{li.materialCode}</td>
                                        <td>{li.quantity}</td>
                                        <td>{li.uom}</td>
                                        <td>
                                            <button
                                                className="bd-icon-btn"
                                                onClick={() => handleRemoveLineItem(li.id)}
                                                type="button"
                                                title="Remove item"
                                            >
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {lineItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="bd-table-empty">
                                            No line items added yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {errors.lineItems && <div className="bd-error-text" style={{ marginTop: 8, color: '#ef4444' }}>{errors.lineItems}</div>}

                    <div className="bd-form-footer">
                        <button className="bd-btn-next" onClick={handleNext} type="button">
                            Next
                        </button>
                    </div>
                </>
            )}

            {activeStep === "suppliers" && (
                <div className="bd-suppliers-step">
                    <div className="bd-suppliers-toolbar">
                        <div>
                            <span className="bd-target-badge">Target Category: {targetCategory}</span>
                            <p className="bd-suppliers-tip">
                                System logic will trigger appropriate registration pipelines for unverified vendors.
                            </p>
                        </div>
                        <div className="bd-suppliers-filters">
                            <select
                                className="bd-select bd-category-filter"
                                value={supplierTypeFilter}
                                onChange={(e) => setSupplierTypeFilter(e.target.value as "ALL" | SupplierVerificationType)}
                            >
                                <option value="ALL">All Suppliers</option>
                                <option value="VERIFIED">Verified</option>
                                <option value="UNVERIFIED">Unverified</option>
                            </select>
                            <div className="bd-search-wrap">
                                <span className="bd-search-icon">
                                    <IconSearch />
                                </span>
                                <input
                                    className="bd-input bd-search-input"
                                    type="text"
                                    placeholder="Search supplier by name or id..."
                                    value={supplierSearchQuery}
                                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {suppliersError && (
                        <div className="bd-status-unverified" style={{ marginBottom: 12 }}>
                            {suppliersError}
                        </div>
                    )}

                    <div className="bd-table-card">
                        <table className="bd-table bd-suppliers-table">
                            <thead>
                                <tr>
                                    <th className="bd-checkbox-cell">Select</th>
                                    <th>Supplier Name</th>
                                    <th>SN ID</th>
                                    <th>Email</th>
                                    <th>Verification Status</th>
                                    <th>Pipeline Actions On Submit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map((s) => (
                                    <tr key={s.supplierId}>
                                        <td className="bd-checkbox-cell">
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.includes(s.supplierId)}
                                                onChange={() => toggleSupplier(s.supplierId)}
                                            />
                                        </td>
                                        <td>
                                            <div className="bd-supplier-name">{s.supplierName}</div>
                                        </td>
                                        <td>
                                            <div className="bd-supplier-sn-id">{s.snid}</div>
                                        </td>
                                        <td>
                                            <span className="bd-supplier-email">{s.email}</span>
                                        </td>
                                        <td>
                                            {s.isVerified ? (
                                                <span className="bd-status-verified">
                                                    <IconCheckCircle /> Verified
                                                </span>
                                            ) : (
                                                <span className="bd-status-unverified">
                                                    <IconXCircle /> Not Verified
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {s.isVerified ? (
                                                <span className="bd-pipeline-pill bd-pipeline-pill-green">
                                                    <IconCheckCircle /> Direct RFQ Sent (Instant)
                                                </span>
                                            ) : (
                                                <span className="bd-pipeline-pill bd-pipeline-pill-orange">
                                                    <IconMail /> Send Invitation (Onboarding Verification Flow)
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {!suppliersLoading && suppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="bd-table-empty">
                                            {suppliersError ? "Could not load suppliers." : "No suppliers match your search."}
                                        </td>
                                    </tr>
                                )}
                                {suppliersLoading && (
                                    <tr>
                                        <td colSpan={5} className="bd-table-empty">
                                            Loading suppliers...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {hasUnverifiedSelected && (
                        <div className="bd-onboarding-box">
                            <div className="bd-onboarding-header">
                                <IconShieldCheck /> Supplier Onboarding Required
                            </div>
                            <p className="bd-onboarding-sub">
                                Some selected vendors are unverified. They will receive an invitation to register first.
                            </p>
                            <div className="bd-onboarding-grid">
                                <div className="bd-onboarding-left">
                                    <label className="bd-label">Registration Template*</label>
                                    <div className="bd-template-row">
                                        <SearchableSelect<VerificationTemplate>
                                            value={registrationTemplate}
                                            placeholder="Select Template"
                                            isOpen={isTemplateDropdownOpen}
                                            onToggle={() => setIsTemplateDropdownOpen((prev) => !prev)}
                                            onClose={() => setIsTemplateDropdownOpen(false)}
                                            searchTerm={templateSearchTerm}
                                            onSearchChange={setTemplateSearchTerm}
                                            options={filteredTemplateOptions}
                                            getOptionLabel={(t) => t.templateName}
                                            getOptionKey={(t) => t.templateId}
                                            onSelect={(t) => {
                                                setRegistrationTemplateId(t.templateId);
                                                setRegistrationTemplate(t.templateName);
                                                setIsTemplateDropdownOpen(false);
                                                setTemplateSearchTerm("");
                                            }}
                                            loading={templateLoading}
                                            onScrollBottom={handleTemplateScrollBottom}
                                            searchPlaceholder="Search template..."
                                        />
                                        <button
                                            type="button"
                                            className="bd-btn-view-template"
                                            onClick={handleViewTemplate}
                                            disabled={!registrationTemplateId}
                                        >
                                            <IconEye /> View Template
                                        </button>
                                    </div>
                                    {/* <label className="bd-label bd-reg-link-label">Supplier Registration Link</label>
                                    <input className="bd-input bd-reg-link-box" type="text" readOnly value={supplierRegistrationLink} /> */}
                                </div>
                                {/* <div className="bd-onboarding-right">
                                    <div className="bd-metrics-title">Pipeline Metrics</div>
                                    <div className="bd-metrics-grid">
                                        <div className="bd-metric-card bd-metric-card-green">
                                            <div className="bd-metric-number">{verifiedSelectedCount}</div>
                                            <div className="bd-metric-label">Verified Suppliers</div>
                                        </div>
                                        <div className="bd-metric-card bd-metric-card-orange">
                                            <div className="bd-metric-number">{unverifiedSelectedCount}</div>
                                            <div className="bd-metric-label">Registration Required</div>
                                        </div>
                                    </div>
                                    <p className="bd-metrics-note">
                                        Unverified suppliers will be redirected to complete the selected form before bidding.
                                    </p>
                                </div> */}
                            </div>  
                        </div>
                    )}

                    {submitError && (
                        <div className="bd-status-unverified" style={{ marginBottom: 16 }}>
                            {submitError}
                        </div>
                    )}

                    <div className="bd-form-footer bd-form-footer-split">
                        <button className="bd-btn-back" onClick={() => setActiveStep("details")} type="button">
                            ← Back to details
                        </button>
                        <button
                            className="bd-btn-submit"
                            onClick={handleSubmitRFQ}
                            type="button"
                            disabled={selectedSupplierIds.length === 0 || isSubmittingRFQ}
                        >
                            <IconSend /> {isSubmittingRFQ ? "Submitting..." : "Submit RFQ"}
                        </button>
                    </div>
                </div>
            )}

            {activeStep === "summary" && (
                <div className="bd-success-wrap">
                    <div className="bd-success-icon-circle">
                        <IconCheckBig />
                    </div>
                    <div className="bd-success-title">RFQ Submitted Successfully!</div>
                    <p className="bd-success-sub">
                        The RFQ was registered as <strong>{rfqNumber}</strong>. Interactive logic dispatched notifications to invited vendors.
                    </p>

                    <div className="bd-table-card bd-success-table-card">
                        <table className="bd-table bd-success-table">
                            <thead>
                                <tr>
                                    <th>Supplier Name</th>
                                    <th>Email</th>
                                    <th>Delivery Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSuppliers.map((s) => (
                                    <tr key={s.supplierId}>
                                        <td>{s.supplierName}</td>
                                        <td>{s.email}</td>
                                        <td>
                                            {s.isVerified ? (
                                                <span className="bd-delivery-pill bd-delivery-pill-green">
                                                    <span className="bd-dot" /> RFQ Sent
                                                </span>
                                            ) : (
                                                <span className="bd-delivery-pill bd-delivery-pill-orange">
                                                    <span className="bd-dot" /> Invitation Sent
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {selectedSuppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="bd-table-empty">
                                            No suppliers were selected.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bd-success-footer">
                        <button className="bd-btn-dark" onClick={handleReset} type="button">
                            View RFQs List
                        </button>
                        <button className="bd-btn-back" onClick={handleReset} type="button">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}

            {isViewTemplateOpen && (
                <div className="bd-template-modal-overlay" onClick={closeViewTemplate}>
                    <div className="bd-template-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="bd-template-modal-header">
                            <div>
                                <div className="bd-template-modal-title">
                                    {viewTemplateData?.templateName || "Registration Template"}
                                </div>
                                <div className="bd-template-modal-subtitle">
                                    {viewTemplateData?.templateType ? `${viewTemplateData.templateType} • ` : ""}
                                    Code: {viewTemplateData?.templateCode || "-"}
                                </div>
                            </div>
                            <button type="button" className="bd-template-modal-close" onClick={closeViewTemplate}>
                                Close
                            </button>
                        </div>

                        <div className="bd-template-modal-body">
                            {viewTemplateLoading && (
                                <div className="bd-template-modal-status">Loading template...</div>
                            )}
                            {!viewTemplateLoading && viewTemplateError && (
                                <div className="bd-template-modal-status bd-template-modal-error">{viewTemplateError}</div>
                            )}
                            {!viewTemplateLoading && !viewTemplateError && viewTemplateData && (
                                viewTemplateData.questions && viewTemplateData.questions.length > 0 ? (
                                    viewTemplateData.questions
                                        .slice()
                                        .sort((a, b) => a.displayOrder - b.displayOrder)
                                        .map((q) => (
                                            <div className="bd-template-question-card" key={q.questionId}>
                                                <div className="bd-template-question-label">{q.question}</div>
                                                <div className="bd-template-question-meta">Type: {q.questionType}</div>
                                                {q.options && q.options.length > 0 && (
                                                    <div className="bd-template-question-meta">
                                                        Options: {q.options.join(", ")}
                                                    </div>
                                                )}
                                                {q.isRequired && (
                                                    <div className="bd-template-question-mandatory">MANDATORY</div>
                                                )}
                                            </div>
                                        ))
                                ) : (
                                    <div className="bd-template-modal-status">No questions configured for this template.</div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateRFQ;