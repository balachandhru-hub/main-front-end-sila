import React, { useRef, useState } from "react";
import "./Create.RFQ.css";

/* ---------------------------------- Types ---------------------------------- */

interface LineItem {
    id: string;
    itemName: string;
    description: string;
    quantity: number;
    uom: string;
    price: string;
    materialCode: string;
}

type StepKey = "details" | "suppliers" | "summary";

type FieldType = "Text" | "Dropdown" | "Radio" | "Checkbox";

const fieldTypeLabels: Record<FieldType, string> = {
    Text: "Text Field",
    Dropdown: "Dropdown Field",
    Radio: "Radio Button",
    Checkbox: "Checkbox Field",
};

interface CustomField {
    id: string;
    label: string;
    type: FieldType;
    options: string[];
}

interface Supplier {
    id: string;
    name: string;
    email: string;
    category: string;
    verified: boolean;
}

/* ---------------------------------- Icons ---------------------------------- */

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

/* ---------------------------------- Static data ---------------------------------- */

const steps: { key: StepKey; label: string }[] = [
    { key: "details", label: "1. RFQ Details" },
    { key: "suppliers", label: "2. Select Suppliers" },
    { key: "summary", label: "3. Summary & Dispatch" },
];

const initialLineItems: LineItem[] = [
    { id: "li-1", itemName: "Laptop", description: "Dell Latitude 5450 / 32GB RAM / 512GB SSD", quantity: 25, uom: "EA", price: "", materialCode: "MAT-IT-501" },
    { id: "li-2", itemName: "Mouse", description: "Wireless Optical Ergonomic Mouse", quantity: 25, uom: "EA", price: "", materialCode: "MAT-IT-502" },
    { id: "li-3", itemName: "Keyboard", description: "Mechanical Keyboard Blue Switches Silent", quantity: 25, uom: "EA", price: "", materialCode: "MAT-IT-503" },
];

const uomOptions = ["EA", "BOX", "SET", "PACK", "UNIT"];

const departmentOptions = ["IT", "Procurement", "Finance", "Operations", "Human Resources"];
const costCenterOptions = ["CC-1001 - IT Infrastructure", "CC-2002 - Admin & Facilities", "CC-3003 - Operations"];
const commodityOptions = ["Hardware", "Software", "Professional Services", "Consumables"];
const currencyOptions = ["AED", "USD", "EUR", "INR", "GBP"];
const regionOptions = ["MENA", "APAC", "EMEA", "Americas"];
const materialCodeOptions = ["MAT-IT-501", "MAT-IT-502", "MAT-IT-503", "MAT-IT-504", "MAT-IT-505"];
const fieldTypeOptions: FieldType[] = ["Text", "Dropdown", "Radio", "Checkbox"];

const initialCustomFields: CustomField[] = [
    { id: "cf-1", label: "How much is the delivery charge?", type: "Text", options: [] },
    {
        id: "cf-2",
        label: "Is there any additional tax?",
        type: "Radio",
        options: ["Yes there is additional tax available", "No there is no additional tax"],
    },
];

const initialSuppliers: Supplier[] = [
    { id: "sup-1", name: "ABC Technologies", email: "contact@abctech.com", category: "IT Hardware", verified: true },
    { id: "sup-2", name: "XYZ Solutions", email: "sales@xyzsolutions.com", category: "IT Hardware", verified: true },
    { id: "sup-3", name: "Nova Enterprises", email: "info@novaent.com", category: "IT Hardware", verified: false },
    { id: "sup-4", name: "Apex Global Furnishing", email: "orders@apexglobal.com", category: "Office Furniture", verified: true },
    { id: "sup-5", name: "Delta Corp Industries", email: "vendor@deltacorp.com", category: "IT Hardware", verified: false },
];

const registrationTemplateOptions = [
    "Standard Vendor Registration",
    "Quick Onboarding Form",
    "IT Hardware Vendor Verification",
];

/* ---------------------------------- Component ---------------------------------- */

const CreateRFQ: React.FC = () => {
    const [activeStep, setActiveStep] = useState<StepKey>("details");

    // Create RFQ form state
    const [rfqTitle, setRfqTitle] = useState("IT Hardware Refresh - Head Office");
    const [department, setDepartment] = useState("");
    const [costCenter, setCostCenter] = useState("");
    const [family, setFamily] = useState("");
    const [segment, setSegment] = useState("");
    const [commodity, setCommodity] = useState("");
    const [currency, setCurrency] = useState("");
    const [region, setRegion] = useState("");
    const [nameOfCreator, setNameOfCreator] = useState("John");
    const [description, setDescription] = useState(
        "Bulk procurement of high-quality workstations, standard precision mice, and custom mechanical keyboards."
    );
    const [deliveryLocation, setDeliveryLocation] = useState("Bengaluru Office, Karnataka,  India");
    const [startDateTime, setStartDateTime] = useState("2026-07-15T17:30");
    const [endDateTime, setEndDateTime] = useState("2026-07-15T17:40");
    const [deliveryTargetDate, setDeliveryTargetDate] = useState("2026-07-19");

    const [techSpecFile, setTechSpecFile] = useState<string | null>("Specific fil...");
    const [termsFile, setTermsFile] = useState<string | null>("Terms & Co...");

    const techSpecInputRef = useRef<HTMLInputElement>(null);
    const termsInputRef = useRef<HTMLInputElement>(null);

    const [lotOption, setLotOption] = useState(false);
    const [totalBudget, setTotalBudget] = useState("25000 AED");

    const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldType, setNewFieldType] = useState<FieldType>("Text");
    const [newFieldOptions, setNewFieldOptions] = useState("");

    const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);
    const [newItemName, setNewItemName] = useState("");
    const [newItemDesc, setNewItemDesc] = useState("");
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemUom, setNewItemUom] = useState("EA");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemMaterialCode, setNewItemMaterialCode] = useState(materialCodeOptions[0]);

    // Step 2: Select Suppliers state
    const [suppliers] = useState<Supplier[]>(initialSuppliers);
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(["sup-1", "sup-2", "sup-3"]);
    const [supplierCategoryFilter, setSupplierCategoryFilter] = useState("All Suppliers");
    const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
    const [registrationTemplate, setRegistrationTemplate] = useState("");
    const supplierRegistrationLink = "https://supplier.company.com/register";

    // Step 3: Summary & Dispatch state
    const [rfqNumber, setRfqNumber] = useState("");

    const formatDateTimeLabel = (value: string) => {
        if (!value) return "";
        const [datePart, timePart] = value.split("T");
        if (!datePart) return value;
        const [y, m, d] = datePart.split("-");
        if (!timePart) return `${d}/${m}/${y}`;
        let [hh, mm] = timePart.split(":").map(Number);
        const suffix = hh >= 12 ? "PM" : "AM";
        hh = hh % 12 || 12;
        return `${d}/${m}/${y} ~ ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${suffix}`;
    };

    const formatDateLabel = (value: string) => {
        if (!value) return "";
        const [y, m, d] = value.split("-");
        return `${d}/${m}/${y}`;
    };

    const handleAddLineItem = () => {
        if (!newItemName.trim()) return;
        const item: LineItem = {
            id: `li-${Date.now()}`,
            itemName: newItemName.trim(),
            description: newItemDesc.trim(),
            quantity: newItemQty || 1,
            uom: newItemUom,
            price: newItemPrice.trim(),
            materialCode: newItemMaterialCode,
        };
        setLineItems((prev) => [...prev, item]);
        setNewItemName("");
        setNewItemDesc("");
        setNewItemQty(1);
        setNewItemUom("EA");
        setNewItemPrice("");
        setNewItemMaterialCode(materialCodeOptions[0]);
    };

    const handleRemoveLineItem = (id: string) => {
        setLineItems((prev) => prev.filter((li) => li.id !== id));
    };

    const handleAddCustomField = () => {
        if (!newFieldLabel.trim()) return;
        const needsOptions = newFieldType !== "Text";
        const options = needsOptions
            ? newFieldOptions
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : [];
        const field: CustomField = {
            id: `cf-${Date.now()}`,
            label: newFieldLabel.trim(),
            type: newFieldType,
            options,
        };
        setCustomFields((prev) => [...prev, field]);
        setNewFieldLabel("");
        setNewFieldType("Text");
        setNewFieldOptions("");
    };

    const handleRemoveCustomField = (id: string) => {
        setCustomFields((prev) => prev.filter((f) => f.id !== id));
    };

    const handleFileChosen = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFile: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            setFile(file.name.length > 12 ? `${file.name.slice(0, 10)}...` : file.name);
        }
        e.target.value = "";
    };

    const handleNext = () => {
        if (activeStep === "details") setActiveStep("suppliers");
        else if (activeStep === "suppliers") setActiveStep("summary");
    };

    const supplierCategories = Array.from(new Set(suppliers.map((s) => s.category)));

    const filteredSuppliers = suppliers.filter((s) => {
        const matchesCategory = supplierCategoryFilter === "All Suppliers" || s.category === supplierCategoryFilter;
        const q = supplierSearchQuery.trim().toLowerCase();
        const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
    });

    const toggleSupplier = (id: string) => {
        setSelectedSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const selectedSuppliers = suppliers.filter((s) => selectedSupplierIds.includes(s.id));
    const verifiedSelectedCount = selectedSuppliers.filter((s) => s.verified).length;
    const unverifiedSelectedCount = selectedSuppliers.length - verifiedSelectedCount;
    const hasUnverifiedSelected = unverifiedSelectedCount > 0;
    const targetCategory = family || "IT Hardware";

    const handleSubmitRFQ = () => {
        if (selectedSupplierIds.length === 0) return;
        const generatedNumber = `RFQ-${Math.floor(1000 + Math.random() * 9000)}`;
        setRfqNumber(generatedNumber);
        setActiveStep("summary");
    };

    const handleReset = () => {
        setActiveStep("details");
    };

    return (
        <div className="bd-rfq-card">
            {/* Card header */}
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
                    {/* RFQ Title */}
                    <div className="bd-field">
                        <label className="bd-label">RFQ Title</label>
                        <input
                            className="bd-input"
                            type="text"
                            value={rfqTitle}
                            onChange={(e) => setRfqTitle(e.target.value)}
                        />
                    </div>

                    {/* Department / Cost Center */}
                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Department</label>
                            <select className="bd-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                                <option value="">Select Department</option>
                                {departmentOptions.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Cost Center</label>
                            <select className="bd-select" value={costCenter} onChange={(e) => setCostCenter(e.target.value)}>
                                <option value="">Select Cost Center</option>
                                {costCenterOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Family / Segment */}
                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Family</label>
                            <select className="bd-select" value={family} onChange={(e) => setFamily(e.target.value)}>
                                <option value="">Select Family</option>
                                <option value="IT Hardware">IT Hardware</option>
                                <option value="Office Supplies">Office Supplies</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Logistics">Logistics</option>
                            </select>
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Segment</label>
                            <select className="bd-select" value={segment} onChange={(e) => setSegment(e.target.value)}>
                                <option value="">Select Segment</option>
                                <option value="Computing Devices">Computing Devices</option>
                                <option value="Peripherals">Peripherals</option>
                                <option value="Accessories">Accessories</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bd-field">
                        <label className="bd-label">Description</label>
                        <textarea
                            className="bd-textarea"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Commodity / Currency */}
                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Commodity</label>
                            <select className="bd-select" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                                <option value="">Select Commodity</option>
                                {commodityOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Currency</label>
                            <select className="bd-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                <option value="">Select Currency</option>
                                {currencyOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Region / Name of Creator */}
                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Region</label>
                            <select className="bd-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                                <option value="">Select Region</option>
                                {regionOptions.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Name of Creator</label>
                            <input
                                className="bd-input"
                                type="text"
                                value={nameOfCreator}
                                onChange={(e) => setNameOfCreator(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Delivery Location / Start Date */}
                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">Delivery Location</label>
                            <input
                                className="bd-input"
                                type="text"
                                value={deliveryLocation}
                                onChange={(e) => setDeliveryLocation(e.target.value)}
                            />
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Start Date &amp; Time</label>
                            <div className="bd-input-icon-wrap">
                                <input
                                    className="bd-input bd-input-with-icon"
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
                                    onChange={(e) => setStartDateTime(e.target.value)}
                                />
                                <span className="bd-input-icon">
                                    <IconCalendar />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* End Date / Delivery Target Date */}
                    <div className="bd-row-2">
                        <div className="bd-field">
                            <label className="bd-label">End Date &amp; Time</label>
                            <div className="bd-input-icon-wrap">
                                <input
                                    className="bd-input bd-input-with-icon"
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
                                    onChange={(e) => setEndDateTime(e.target.value)}
                                />
                                <span className="bd-input-icon">
                                    <IconCalendar />
                                </span>
                            </div>
                        </div>
                        <div className="bd-field">
                            <label className="bd-label">Delivery Target Date</label>
                            <div className="bd-input-icon-wrap">
                                <input
                                    className="bd-input bd-input-with-icon"
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
                                    onChange={(e) => setDeliveryTargetDate(e.target.value)}
                                />
                                <span className="bd-input-icon">
                                    <IconCalendar />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Attachments / Terms */}
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
                                onChange={(e) => handleFileChosen(e, setTechSpecFile)}
                            />
                            {techSpecFile && (
                                <span className="bd-chip">
                                    {techSpecFile}
                                    <button className="bd-chip-remove" onClick={() => setTechSpecFile(null)} type="button">
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
                                onChange={(e) => handleFileChosen(e, setTermsFile)}
                            />
                            {termsFile && (
                                <span className="bd-chip">
                                    {termsFile}
                                    <button className="bd-chip-remove" onClick={() => setTermsFile(null)} type="button">
                                        ×
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Lot Option toggle */}
                    <div className="bd-toggle-row">
                        <div>
                            <div className="bd-toggle-row-title">Lot Option</div>
                            <div className="bd-toggle-row-desc">
                                Enable item-level price evaluation. When disabled, evaluation is based on Total Budget.
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

                    {/* Total Budget */}
                    {!lotOption && (
                        <div className="bd-field">
                            <label className="bd-label">Total Budget (AED)</label>
                            <input
                                className="bd-input"
                                type="text"
                                value={totalBudget}
                                onChange={(e) => setTotalBudget(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Dynamic Sourcing Requirements */}
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
                                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                                    >
                                        {fieldTypeOptions.map((t) => (
                                            <option key={t} value={t}>
                                                {fieldTypeLabels[t]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bd-item-add-field">
                                    <label className="bd-label-sm">DROPDOWN OPTIONS (COMMA-SEPARATED)</label>
                                    <input
                                        className="bd-input-sm"
                                        type="text"
                                        placeholder="eg. Yes, No"
                                        value={newFieldOptions}
                                        onChange={(e) => setNewFieldOptions(e.target.value)}
                                        disabled={newFieldType === "Text"}
                                    />
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
                                            <div className="bd-dsr-field-type">{fieldTypeLabels[field.type]}</div>
                                            <div className="bd-dsr-field-label">{field.label}</div>
                                            {field.options.length > 0 && (
                                                <div className="bd-dsr-field-options">
                                                    {field.options.map((opt, idx) => (
                                                        <span className="bd-dsr-option-pill" key={idx}>
                                                            {opt}
                                                        </span>
                                                    ))}
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

                    {/* Add line item row */}
                    <div className="bd-item-add-row">
                        <div className="bd-item-add-grid-top">
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">ITEM NAME</label>
                                <input
                                    className="bd-input-sm"
                                    type="text"
                                    placeholder="e.g. Laptop"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                            </div>
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">DESCRIPTION</label>
                                <input
                                    className="bd-input-sm"
                                    type="text"
                                    placeholder="e.g. Dell Latitude 5450, 256GB SSD"
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
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
                                <select
                                    className="bd-select-sm"
                                    value={newItemUom}
                                    onChange={(e) => setNewItemUom(e.target.value)}
                                >
                                    {uomOptions.map((u) => (
                                        <option key={u} value={u}>
                                            {u}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="bd-item-add-grid-bottom">
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">PRICE</label>
                                <input
                                    className="bd-input-sm"
                                    type="text"
                                    placeholder="Enter price"
                                    value={newItemPrice}
                                    onChange={(e) => setNewItemPrice(e.target.value)}
                                />
                            </div>
                            <div className="bd-item-add-field">
                                <label className="bd-label-sm">MATERIAL CODE</label>
                                <select
                                    className="bd-select-sm"
                                    value={newItemMaterialCode}
                                    onChange={(e) => setNewItemMaterialCode(e.target.value)}
                                >
                                    {materialCodeOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button className="bd-btn-add" onClick={handleAddLineItem} type="button">
                                <IconPlus /> Add
                            </button>
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="bd-line-items-label">
                        <IconList /> LINE ITEMS
                    </div>
                    <div className="bd-table-responsive">
                        <table className="bd-table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
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
                                        <td>{li.itemName}</td>
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
                                        <td colSpan={6} className="bd-table-empty">
                                            No line items added yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

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
                                value={supplierCategoryFilter}
                                onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                            >
                                <option value="All Suppliers">All Suppliers</option>
                                {supplierCategories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
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

                    <div className="bd-table-card">
                        <table className="bd-table bd-suppliers-table">
                            <thead>
                                <tr>
                                    <th className="bd-checkbox-cell">Select</th>
                                    <th>Supplier Name</th>
                                    <th>Category</th>
                                    <th>Verification Status</th>
                                    <th>Pipeline Actions On Submit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((s) => (
                                    <tr key={s.id}>
                                        <td className="bd-checkbox-cell">
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.includes(s.id)}
                                                onChange={() => toggleSupplier(s.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="bd-supplier-name">{s.name}</div>
                                            <div className="bd-supplier-email">{s.email}</div>
                                        </td>
                                        <td>
                                            <span className="bd-category-pill">{s.category}</span>
                                        </td>
                                        <td>
                                            {s.verified ? (
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
                                            {s.verified ? (
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
                                {filteredSuppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="bd-table-empty">
                                            No suppliers match your search.
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
                                        <select
                                            className="bd-select"
                                            value={registrationTemplate}
                                            onChange={(e) => setRegistrationTemplate(e.target.value)}
                                        >
                                            <option value="">Select Template</option>
                                            {registrationTemplateOptions.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                        <button type="button" className="bd-btn-view-template">
                                            <IconEye /> View Template
                                        </button>
                                    </div>
                                    <label className="bd-label bd-reg-link-label">Supplier Registration Link</label>
                                    <input className="bd-input bd-reg-link-box" type="text" readOnly value={supplierRegistrationLink} />
                                </div>
                                <div className="bd-onboarding-right">
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
                                </div>
                            </div>
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
                            disabled={selectedSupplierIds.length === 0}
                        >
                            <IconSend /> Submit RFQ
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
                                    <th>Category</th>
                                    <th>Delivery Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSuppliers.map((s) => (
                                    <tr key={s.id}>
                                        <td>{s.name}</td>
                                        <td>{s.category}</td>
                                        <td>
                                            {s.verified ? (
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
        </div>
    );
};

export default CreateRFQ;