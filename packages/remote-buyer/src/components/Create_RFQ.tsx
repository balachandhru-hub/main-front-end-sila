import React, { useRef, useState } from "react";
import "./Create.RFQ.css";

/* ---------------------------------- Types ---------------------------------- */

interface LineItem {
    id: string;
    itemName: string;
    description: string;
    quantity: number;
    uom: string;
}

type StepKey = "details" | "suppliers" | "summary";

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

const IconChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

/* ---------------------------------- Static data ---------------------------------- */

const steps: { key: StepKey; label: string }[] = [
    { key: "details", label: "1. RFQ Details" },
    { key: "suppliers", label: "2. Select Suppliers" },
    { key: "summary", label: "3. Summary & Dispatch" },
];

const initialLineItems: LineItem[] = [
    { id: "li-1", itemName: "Laptop", description: "Dell Latitude 5450 / 32GB RAM / 512GB SSD", quantity: 25, uom: "EA" },
    { id: "li-2", itemName: "Mouse", description: "Wireless Optical Ergonomic Mouse", quantity: 25, uom: "EA" },
    { id: "li-3", itemName: "Keyboard", description: "Mechanical Keyboard Blue Switches Silent", quantity: 25, uom: "EA" },
];

const uomOptions = ["EA", "BOX", "SET", "PACK", "UNIT"];

/* ---------------------------------- Component ---------------------------------- */

const CreateRFQ: React.FC = () => {
    const [activeStep, setActiveStep] = useState<StepKey>("details");

    // Create RFQ form state
    const [rfqTitle, setRfqTitle] = useState("IT Hardware Refresh - Head Office");
    const [family, setFamily] = useState("");
    const [segment, setSegment] = useState("");
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

    const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);
    const [newItemName, setNewItemName] = useState("");
    const [newItemDesc, setNewItemDesc] = useState("");
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemUom, setNewItemUom] = useState("EA");

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
        };
        setLineItems((prev) => [...prev, item]);
        setNewItemName("");
        setNewItemDesc("");
        setNewItemQty(1);
        setNewItemUom("EA");
    };

    const handleRemoveLineItem = (id: string) => {
        setLineItems((prev) => prev.filter((li) => li.id !== id));
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
                                    <IconChevronRight />
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

                    {/* Add line item row */}
                    <div className="bd-item-add-row">
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
                        <div className="bd-item-add-field bd-item-add-field-wide">
                            <label className="bd-label-sm">DESCRIPTION</label>
                            <input
                                className="bd-input-sm"
                                type="text"
                                placeholder="e.g. Dell Latitude 5450, 256GB SSD"
                                value={newItemDesc}
                                onChange={(e) => setNewItemDesc(e.target.value)}
                            />
                        </div>
                        <div className="bd-item-add-field bd-item-add-field-narrow">
                            <label className="bd-label-sm">QUANTITY</label>
                            <input
                                className="bd-input-sm"
                                type="number"
                                min={1}
                                value={newItemQty}
                                onChange={(e) => setNewItemQty(Number(e.target.value))}
                            />
                        </div>
                        <div className="bd-item-add-field bd-item-add-field-narrow">
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
                        <button className="bd-btn-add" onClick={handleAddLineItem} type="button">
                            <IconPlus /> Add
                        </button>
                    </div>

                    {/* Line items table */}
                    <div className="bd-line-items-label">
                        <IconList /> LINE ITEMS
                    </div>
                    <table className="bd-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Description</th>
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

                    <div className="bd-form-footer">
                        <button className="bd-btn-next" onClick={handleNext} type="button">
                            Next
                        </button>
                    </div>
                </>
            )}

            {activeStep === "suppliers" && (
                <div className="bd-placeholder-step">
                    <div className="bd-placeholder-title">Select Suppliers</div>
                    <p className="bd-placeholder-text">
                        Choose approved suppliers to send this RFQ to. This step is coming soon.
                    </p>
                    <div className="bd-form-footer bd-form-footer-split">
                        <button className="bd-btn-back" onClick={() => setActiveStep("details")} type="button">
                            Back
                        </button>
                        <button className="bd-btn-next" onClick={handleNext} type="button">
                            Next
                        </button>
                    </div>
                </div>
            )}

            {activeStep === "summary" && (
                <div className="bd-placeholder-step">
                    <div className="bd-placeholder-title">Summary &amp; Dispatch</div>
                    <p className="bd-placeholder-text">
                        Review your RFQ details before dispatching to selected suppliers. This step is coming soon.
                    </p>
                    <div className="bd-form-footer bd-form-footer-split">
                        <button className="bd-btn-back" onClick={() => setActiveStep("suppliers")} type="button">
                            Back
                        </button>
                        <button className="bd-btn-next" type="button">
                            Dispatch RFQ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateRFQ;