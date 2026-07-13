import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import "./BuyerProfile.css";

interface BusinessInfo {
    industry: string;
    businessType: string;
    employeeCount: string;
    annualTurnover: string;
    currency: string;
    yearEstablished: string;
    website: string;
    companyDescription: string;
}

interface Registration {
    id: string;
    type: string;
    number: string;
    name: string;
    expiryDate: string;
    attachmentName: string;
}

interface BankAccount {
    id: string;
    accountHolderName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
    swiftCode: string;
    iban: string;
    currency: string;
    isPrimary: boolean;
}

interface DispatchLocation {
    id: string;
    locationName: string;
    contactPerson: string;
    country: string;
    state: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    pinZip: string;
    contactEmail: string;
    contactPhone: string;
    isDefault: boolean;
}

interface Agreements {
    infoAccurate: boolean;
    agreeTerms: boolean;
    authorizeVerification: boolean;
}

interface BuyerProfileProps {
    onComplete?: (data: {
        businessInfo: BusinessInfo;
        registrations: Registration[];
        bankAccounts: BankAccount[];
        dispatchLocations: DispatchLocation[];
    }) => Promise<void> | void;
    onboardingData?: {
        organizationName: string;
        email: string;
        phone: string;
        country: string;
        addressLine1: string;
        addressLine2: string;
        city: string;
        state: string;
        pinCode: string;
    } | null;
}


const STEP_LABELS = [
    "Business Information",
    "Registrations & Certifications",
    "Bank Account Information",
    "Dispatch Locations",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

const INDUSTRIES = [
    "Manufacturing",
    "Textiles & Apparel",
    "Electronics",
    "Automotive",
    "Chemicals",
    "Food & Beverage",
    "Pharmaceuticals",
    "Construction",
    "Logistics",
    "Other",
];

const BUSINESS_TYPES = [
    "Manufacturer",
    "Trader / Distributor",
    "Wholesaler",
    "Retailer",
    "Service Provider",
    "Exporter / Importer",
];

const REGISTRATION_TYPES = ["GST", "PAN", "IEC", "MSME / Udyam", "ISO Certificate", "Other"];

const YEARS = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i));


const emptyBusinessInfo: BusinessInfo = {
    industry: "",
    businessType: "",
    employeeCount: "",
    annualTurnover: "",
    currency: "INR",
    yearEstablished: "",
    website: "",
    companyDescription: "",
};

const emptyRegistrationDraft = {
    type: "GST",
    number: "",
    name: "",
    expiryDate: "",
    attachmentName: "",
};

const emptyBankDraft = {
    accountHolderName: "",
    bankName: "",
    branchName: "",
    accountNumber: "",
    ifscCode: "",
    swiftCode: "",
    iban: "",
    currency: "INR",
    isPrimary: false,
};

const emptyLocationDraft = {
    locationName: "",
    contactPerson: "",
    country: "",
    state: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    pinZip: "",
    contactEmail: "",
    contactPhone: "",
    isDefault: false,
};

function makeId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    const last4 = accountNumber.slice(-4);
    return "X".repeat(accountNumber.length - 4) + last4;
}


export default function BuyerProfile({ onComplete, onboardingData }: BuyerProfileProps) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [furthestStep, setFurthestStep] = useState<number>(1);

    const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(emptyBusinessInfo);

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [registrationDraft, setRegistrationDraft] = useState(emptyRegistrationDraft);

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [bankDraft, setBankDraft] = useState(emptyBankDraft);

    const [dispatchLocations, setDispatchLocations] = useState<DispatchLocation[]>([]);
    const [locationDraft, setLocationDraft] = useState(emptyLocationDraft);
    const [hasAutoFilled, setHasAutoFilled] = useState(false);

    const [agreements, setAgreements] = useState<Agreements>({
        infoAccurate: false,
        agreeTerms: false,
        authorizeVerification: false,
    });

    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ============================================================================
    // Auto-fill input fields from onboarding data
    // ============================================================================
    useEffect(() => {
        if (onboardingData && !hasAutoFilled && dispatchLocations.length === 0) {
            setLocationDraft({
                locationName: onboardingData.organizationName || 'Main Office',
                contactPerson: '',
                country: onboardingData.country || '',
                state: onboardingData.state || '',
                addressLine1: onboardingData.addressLine1 || '',
                addressLine2: onboardingData.addressLine2 || '',
                city: onboardingData.city || '',
                pinZip: onboardingData.pinCode || '',
                contactEmail: onboardingData.email || '',
                contactPhone: onboardingData.phone || '',
                isDefault: true,
            });
            setHasAutoFilled(true);
        }
    }, [onboardingData, hasAutoFilled, dispatchLocations.length]);

    /* ---------------------------- navigation --------------------------- */

    function goToStep(step: number) {
        if (step <= furthestStep) {
            setCurrentStep(step);
        }
    }

    function handleNext() {
        const next = Math.min(currentStep + 1, STEP_LABELS.length);
        setCurrentStep(next);
        setFurthestStep((prev) => Math.max(prev, next));
    }

    function handleBack() {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    }

    /* ------------------------- step 1 handlers -------------------------- */

    function updateBusinessInfo<K extends keyof BusinessInfo>(field: K, value: BusinessInfo[K]) {
        setBusinessInfo((prev) => ({ ...prev, [field]: value }));
    }

    /* ------------------------- step 2 handlers -------------------------- */

    function updateRegistrationDraft(field: keyof typeof registrationDraft, value: string) {
        setRegistrationDraft((prev) => ({ ...prev, [field]: value }));
    }

    function handleRegistrationFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            updateRegistrationDraft("attachmentName", file.name);
        }
    }

    function addRegistration() {
        if (!registrationDraft.number || !registrationDraft.name) return;
        setRegistrations((prev) => [...prev, { id: makeId(), ...registrationDraft }]);
        setRegistrationDraft(emptyRegistrationDraft);
    }

    function removeRegistration(id: string) {
        setRegistrations((prev) => prev.filter((r) => r.id !== id));
    }

    /* ------------------------- step 3 handlers -------------------------- */

    function updateBankDraft<K extends keyof typeof bankDraft>(field: K, value: (typeof bankDraft)[K]) {
        setBankDraft((prev) => ({ ...prev, [field]: value }));
    }

    function addBankAccount() {
        if (!bankDraft.accountHolderName || !bankDraft.bankName || !bankDraft.accountNumber) return;
        setBankAccounts((prev) => [...prev, { id: makeId(), ...bankDraft }]);
        setBankDraft(emptyBankDraft);
    }

    function removeBankAccount(id: string) {
        setBankAccounts((prev) => prev.filter((b) => b.id !== id));
    }

    /* ------------------------- step 4 handlers -------------------------- */

    function updateLocationDraft<K extends keyof typeof locationDraft>(
        field: K,
        value: (typeof locationDraft)[K]
    ) {
        // Block editing if auto-filled and not yet added to table
        if (hasAutoFilled) return;
        setLocationDraft((prev) => ({ ...prev, [field]: value }));
    }

    function addLocation() {
        if (!locationDraft.locationName || !locationDraft.addressLine1 || !locationDraft.city) return;
        
        setDispatchLocations((prev) => [...prev, { 
            id: makeId(), 
            ...locationDraft 
        }]);
        
        // Clear fields and remove read-only after first add
        setLocationDraft(emptyLocationDraft);
        setHasAutoFilled(false);
    }

    function removeLocation(id: string) {
        setDispatchLocations((prev) => prev.filter((l) => l.id !== id));
    }

    function updateAgreement(field: keyof Agreements, value: boolean) {
        setAgreements((prev) => ({ ...prev, [field]: value }));
    }

    const canSubmit =
        agreements.infoAccurate && agreements.agreeTerms && agreements.authorizeVerification;

    async function handleSubmitProfile(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;

        setError(null);
        setSubmitting(true);

        try {
            // If there's a location in draft (auto-filled or manually entered), add it first
            const finalLocations = [...dispatchLocations];
            if (locationDraft.locationName && locationDraft.addressLine1 && locationDraft.city) {
                finalLocations.push({ id: makeId(), ...locationDraft });
            }

            if (onComplete) {
                await onComplete({
                    businessInfo,
                    registrations,
                    bankAccounts,
                    dispatchLocations: finalLocations,
                });
                setSubmitted(true);
            } else {
                setSubmitted(true);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit profile. Please try again.');
            console.error('Error submitting profile:', err);
        } finally {
            setSubmitting(false);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Render helpers                                                     */
    /* ------------------------------------------------------------------ */

    function renderStepIndicator() {
        return (
            <nav className="bp-sidebar" aria-label="Profile setup steps">
                {STEP_LABELS.map((label, idx) => {
                    const stepNum = idx + 1;
                    const isComplete = stepNum < furthestStep || (submitted && stepNum <= STEP_LABELS.length);
                    const isCurrent = stepNum === currentStep && !submitted;
                    const isClickable = stepNum <= furthestStep;

                    let circleClass = "bp-step-circle";
                    if (isComplete) circleClass += " bp-step-complete";
                    else if (isCurrent) circleClass += " bp-step-current";

                    let labelClass = "bp-step-label";
                    if (isComplete) labelClass += " bp-step-complete-label";
                    else if (isCurrent) labelClass += " bp-step-current-label";

                    return (
                        <button
                            type="button"
                            key={label}
                            className={`bp-step-item ${isClickable ? "bp-step-clickable" : ""}`}
                            onClick={() => isClickable && goToStep(stepNum)}
                            disabled={!isClickable}
                        >
                            <span className={circleClass}>{isComplete ? "✓" : stepNum}</span>
                            <span className={labelClass}>{label}</span>
                        </button>
                    );
                })}
            </nav>
        );
    }

    function renderStep1() {
        return (
            <div className="bp-panel">
                <h2 className="bp-panel-title">Step 1: Business Information</h2>
                <div className="bp-divider" />
                <div className="bp-form-grid">
                    <div className="bp-field">
                        <label htmlFor="industry">
                            Industry<span className="bp-required">*</span>
                        </label>
                        <select
                            id="industry"
                            value={businessInfo.industry}
                            onChange={(e) => updateBusinessInfo("industry", e.target.value)}
                        >
                            <option value="">Select Industry</option>
                            {INDUSTRIES.map((i) => (
                                <option key={i} value={i}>
                                    {i}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bp-field">
                        <label htmlFor="businessType">
                            Business Type<span className="bp-required">*</span>
                        </label>
                        <select
                            id="businessType"
                            value={businessInfo.businessType}
                            onChange={(e) => updateBusinessInfo("businessType", e.target.value)}
                        >
                            <option value="">Select Business Type</option>
                            {BUSINESS_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bp-field">
                        <label htmlFor="employeeCount">Employee Count</label>
                        <input
                            id="employeeCount"
                            type="number"
                            min={0}
                            value={businessInfo.employeeCount}
                            onChange={(e) => updateBusinessInfo("employeeCount", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="annualTurnover">Annual Turnover</label>
                        <input
                            id="annualTurnover"
                            type="number"
                            min={0}
                            value={businessInfo.annualTurnover}
                            onChange={(e) => updateBusinessInfo("annualTurnover", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="currency">Currency</label>
                        <select
                            id="currency"
                            value={businessInfo.currency}
                            onChange={(e) => updateBusinessInfo("currency", e.target.value)}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bp-field">
                        <label htmlFor="yearEstablished">Year Established</label>
                        <select
                            id="yearEstablished"
                            value={businessInfo.yearEstablished}
                            onChange={(e) => updateBusinessInfo("yearEstablished", e.target.value)}
                        >
                            <option value="">Select Year</option>
                            {YEARS.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bp-field bp-field-wide">
                        <label htmlFor="website">Website</label>
                        <input
                            id="website"
                            type="url"
                            placeholder="https://"
                            value={businessInfo.website}
                            onChange={(e) => updateBusinessInfo("website", e.target.value)}
                        />
                    </div>

                    <div className="bp-field bp-field-wide">
                        <label htmlFor="companyDescription">Company Description</label>
                        <textarea
                            id="companyDescription"
                            rows={4}
                            placeholder="Tell buyers about your company, products, services and capabilities..."
                            value={businessInfo.companyDescription}
                            onChange={(e) => updateBusinessInfo("companyDescription", e.target.value)}
                        />
                    </div>
                </div>

                <div className="bp-actions bp-actions-right">
                    <button type="button" className="bp-btn bp-btn-primary" onClick={handleNext}>
                        Next
                    </button>
                </div>
            </div>
        );
    }

    function renderStep2() {
        return (
            <div className="bp-panel">
                <h2 className="bp-panel-title">Step 2: Registrations &amp; Certifications</h2>
                <div className="bp-divider" />
                <div className="bp-form-grid">
                    <div className="bp-field">
                        <label htmlFor="regType">Registration Type</label>
                        <select
                            id="regType"
                            value={registrationDraft.type}
                            onChange={(e) => updateRegistrationDraft("type", e.target.value)}
                        >
                            {REGISTRATION_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bp-field">
                        <label htmlFor="regNumber">Registration Number</label>
                        <input
                            id="regNumber"
                            type="text"
                            value={registrationDraft.number}
                            onChange={(e) => updateRegistrationDraft("number", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="regName">Registration Name</label>
                        <input
                            id="regName"
                            type="text"
                            value={registrationDraft.name}
                            onChange={(e) => updateRegistrationDraft("name", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="regExpiry">Expiry Date</label>
                        <input
                            id="regExpiry"
                            type="date"
                            value={registrationDraft.expiryDate}
                            onChange={(e) => updateRegistrationDraft("expiryDate", e.target.value)}
                        />
                    </div>

                    <div className="bp-field bp-field-wide">
                        <label htmlFor="regUpload">Upload Certificate</label>
                        <label className="bp-dropzone" htmlFor="regUpload">
                            {registrationDraft.attachmentName || "Click to select file or drag and drop certificate here"}
                        </label>
                        <input
                            id="regUpload"
                            type="file"
                            className="bp-hidden-file-input"
                            onChange={handleRegistrationFile}
                        />
                    </div>
                </div>

                <div className="bp-actions bp-actions-right">
                    <button type="button" className="bp-btn bp-btn-primary" onClick={addRegistration}>
                        + Add Registration
                    </button>
                </div>

                <table className="bp-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Number</th>
                            <th>Name</th>
                            <th>Expiry Date</th>
                            <th>Attachments</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.length === 0 ? (
                            <tr>
                                <td className="bp-empty-row" colSpan={6}>
                                    No registrations added yet.
                                </td>
                            </tr>
                        ) : (
                            registrations.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.type}</td>
                                    <td>{r.number}</td>
                                    <td>{r.name}</td>
                                    <td>{r.expiryDate}</td>
                                    <td>
                                        {r.attachmentName ? (
                                            <span className="bp-pill">
                                                {r.attachmentName.length > 10
                                                    ? `${r.attachmentName.slice(0, 8)}...`
                                                    : r.attachmentName}{" "}
                                                <span className="bp-pill-icon">ⓘ</span>
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="bp-icon-btn"
                                            aria-label={`Remove ${r.name}`}
                                            onClick={() => removeRegistration(r.id)}
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="bp-actions bp-actions-right">
                    <button type="button" className="bp-btn bp-btn-secondary" onClick={handleBack}>
                        Back
                    </button>
                    <button type="button" className="bp-btn bp-btn-primary" onClick={handleNext}>
                        Next
                    </button>
                </div>
            </div>
        );
    }

    function renderStep3() {
        return (
            <div className="bp-panel">
                <h2 className="bp-panel-title">Step 3: Bank Account Information</h2>
                <div className="bp-divider" />
                <div className="bp-form-grid">
                    <div className="bp-field">
                        <label htmlFor="acctHolder">
                            Account Holder Name<span className="bp-required">*</span>
                        </label>
                        <input
                            id="acctHolder"
                            type="text"
                            value={bankDraft.accountHolderName}
                            onChange={(e) => updateBankDraft("accountHolderName", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="bankName">
                            Bank Name<span className="bp-required">*</span>
                        </label>
                        <input
                            id="bankName"
                            type="text"
                            value={bankDraft.bankName}
                            onChange={(e) => updateBankDraft("bankName", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="branchName">
                            Branch Name<span className="bp-required">*</span>
                        </label>
                        <input
                            id="branchName"
                            type="text"
                            value={bankDraft.branchName}
                            onChange={(e) => updateBankDraft("branchName", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="acctNumber">
                            Account Number<span className="bp-required">*</span>
                        </label>
                        <input
                            id="acctNumber"
                            type="text"
                            value={bankDraft.accountNumber}
                            onChange={(e) => updateBankDraft("accountNumber", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="ifsc">
                            IFSC Code<span className="bp-required">*</span>
                        </label>
                        <input
                            id="ifsc"
                            type="text"
                            value={bankDraft.ifscCode}
                            onChange={(e) => updateBankDraft("ifscCode", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="swift">SWIFT Code</label>
                        <input
                            id="swift"
                            type="text"
                            value={bankDraft.swiftCode}
                            onChange={(e) => updateBankDraft("swiftCode", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="iban">IBAN</label>
                        <input
                            id="iban"
                            type="text"
                            value={bankDraft.iban}
                            onChange={(e) => updateBankDraft("iban", e.target.value)}
                        />
                    </div>

                    <div className="bp-field">
                        <label htmlFor="bankCurrency">
                            Currency<span className="bp-required">*</span>
                        </label>
                        <select
                            id="bankCurrency"
                            value={bankDraft.currency}
                            onChange={(e) => updateBankDraft("currency", e.target.value)}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bp-actions bp-actions-between">
                    <label className="bp-checkbox-label">
                        <input
                            type="checkbox"
                            checked={bankDraft.isPrimary}
                            onChange={(e) => updateBankDraft("isPrimary", e.target.checked)}
                        />
                        Primary Bank Account
                    </label>
                    <button type="button" className="bp-btn bp-btn-primary" onClick={addBankAccount}>
                        + Add Account
                    </button>
                </div>

                <table className="bp-table">
                    <thead>
                        <tr>
                            <th>Bank Name</th>
                            <th>Account Holder Name</th>
                            <th>Account Number</th>
                            <th>Currency</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bankAccounts.length === 0 ? (
                            <tr>
                                <td className="bp-empty-row" colSpan={5}>
                                    No bank accounts added yet.
                                </td>
                            </tr>
                        ) : (
                            bankAccounts.map((b) => (
                                <tr key={b.id}>
                                    <td>
                                        {b.bankName}
                                        {b.isPrimary && <span className="bp-tag">Primary</span>}
                                    </td>
                                    <td>{b.accountHolderName}</td>
                                    <td>{maskAccountNumber(b.accountNumber)}</td>
                                    <td>{b.currency}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="bp-icon-btn"
                                            aria-label={`Remove ${b.bankName} account`}
                                            onClick={() => removeBankAccount(b.id)}
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="bp-actions bp-actions-right">
                    <button type="button" className="bp-btn bp-btn-secondary" onClick={handleBack}>
                        Back
                    </button>
                    <button type="button" className="bp-btn bp-btn-primary" onClick={handleNext}>
                        Next
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================================
    // UPDATED: Step 4 with read-only fields when auto-filled
    // ============================================================================
    function renderStep4() {
        const isReadOnly = hasAutoFilled;

        return (
            <div className="bp-panel">
                <h2 className="bp-panel-title">Step 4: Dispatch Locations</h2>
                <div className="bp-divider" />
                
                {isReadOnly && (
                    <div style={{ 
                        backgroundColor: '#e7f3ff', 
                        border: '1px solid #0d6efd', 
                        borderRadius: '6px', 
                        padding: '10px 15px', 
                        marginBottom: '15px',
                        color: '#084298',
                        fontSize: '0.9rem'
                    }}>
                        ℹ️ These fields are auto-filled from your onboarding details. Click "+ Add Location" to confirm, then you can add more locations manually.
                    </div>
                )}

                <form onSubmit={handleSubmitProfile}>
                    <div className="bp-form-grid">
                        <div className="bp-field">
                            <label htmlFor="locName">
                                Location Name<span className="bp-required">*</span>
                            </label>
                            <input
                                id="locName"
                                type="text"
                                value={locationDraft.locationName}
                                onChange={(e) => updateLocationDraft("locationName", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>

                        <div className="bp-field">
                            <label htmlFor="contactPerson">Contact Person</label>
                            <input
                                id="contactPerson"
                                type="text"
                                value={locationDraft.contactPerson}
                                onChange={(e) => updateLocationDraft("contactPerson", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>

                        <div className="bp-field">
                            <label htmlFor="country">
                                Country<span className="bp-required">*</span>
                            </label>
                            <select
                                id="country"
                                value={locationDraft.country}
                                onChange={(e) => {
                                    updateLocationDraft("country", e.target.value);
                                    updateLocationDraft("state", "");
                                    updateLocationDraft("city", "");
                                }}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            >
                                <option value="">Select Country</option>
                                {Country.getAllCountries().map((c) => (
                                    <option key={c.isoCode} value={c.isoCode}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="bp-field">
                            <label htmlFor="state">
                                State<span className="bp-required">*</span>
                            </label>
                            <select
                                id="state"
                                value={locationDraft.state}
                                onChange={(e) => {
                                    updateLocationDraft("state", e.target.value);
                                    updateLocationDraft("city", "");
                                }}
                                disabled={isReadOnly || !locationDraft.country}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            >
                                <option value="">Select State</option>
                                {locationDraft.country && State.getStatesOfCountry(locationDraft.country).map((s) => (
                                    <option key={s.isoCode} value={s.isoCode}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="bp-field">
                            <label htmlFor="addr1">
                                Address Line 1<span className="bp-required">*</span>
                            </label>
                            <input
                                id="addr1"
                                type="text"
                                value={locationDraft.addressLine1}
                                onChange={(e) => updateLocationDraft("addressLine1", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>

                        <div className="bp-field">
                            <label htmlFor="addr2">Address Line 2</label>
                            <input
                                id="addr2"
                                type="text"
                                value={locationDraft.addressLine2}
                                onChange={(e) => updateLocationDraft("addressLine2", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>

                        <div className="bp-field">
                            <label htmlFor="city">
                                City<span className="bp-required">*</span>
                            </label>
                            <select
                                id="city"
                                value={locationDraft.city}
                                onChange={(e) => updateLocationDraft("city", e.target.value)}
                                disabled={isReadOnly || !locationDraft.state}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            >
                                <option value="">Select City</option>
                                {locationDraft.state && City.getCitiesOfState(locationDraft.country, locationDraft.state).map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="bp-field">
                            <label htmlFor="pinZip">
                                PIN / ZIP Code<span className="bp-required">*</span>
                            </label>
                            <input
                                id="pinZip"
                                type="text"
                                value={locationDraft.pinZip}
                                onChange={(e) => updateLocationDraft("pinZip", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>

                        <div className="bp-field">
                            <label htmlFor="contactEmail">Contact Email ID</label>
                            <input
                                id="contactEmail"
                                type="email"
                                value={locationDraft.contactEmail}
                                onChange={(e) => updateLocationDraft("contactEmail", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>

                        <div className="bp-field">
                            <label htmlFor="contactPhone">Contact Phone Number</label>
                            <input
                                id="contactPhone"
                                type="tel"
                                value={locationDraft.contactPhone}
                                onChange={(e) => updateLocationDraft("contactPhone", e.target.value)}
                                disabled={isReadOnly}
                                style={isReadOnly ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                            />
                        </div>
                    </div>

                    <div className="bp-actions bp-actions-between">
                        <label className="bp-checkbox-label" style={isReadOnly ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
                            <input
                                type="checkbox"
                                checked={locationDraft.isDefault}
                                onChange={(e) => updateLocationDraft("isDefault", e.target.checked)}
                                disabled={isReadOnly}
                            />
                            Default Dispatch Location
                        </label>
                        <button 
                            type="button" 
                            className="bp-btn bp-btn-primary" 
                            onClick={addLocation}
                        >
                            + Add Location
                        </button>
                    </div>

                    <table className="bp-table">
                        <thead>
                            <tr>
                                <th>Location Name</th>
                                <th>City</th>
                                <th>Contact Person</th>
                                <th>State</th>
                                <th>Phone Number</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dispatchLocations.length === 0 ? (
                                <tr>
                                    <td className="bp-empty-row" colSpan={6}>
                                        No dispatch locations added yet.
                                    </td>
                                </tr>
                            ) : (
                                dispatchLocations.map((l) => (
                                    <tr key={l.id}>
                                        <td>
                                            {l.locationName}
                                            {l.isDefault && <span className="bp-tag">Default</span>}
                                        </td>
                                        <td>{l.city}</td>
                                        <td>{l.contactPerson}</td>
                                        <td>{State.getStateByCodeAndCountry(l.state, l.country)?.name || l.state}</td>
                                        <td>{l.contactPhone}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="bp-icon-btn"
                                                aria-label={`Remove ${l.locationName}`}
                                                onClick={() => removeLocation(l.id)}
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className="bp-agreements">
                        <label className="bp-checkbox-label">
                            <input
                                type="checkbox"
                                checked={agreements.infoAccurate}
                                onChange={(e) => updateAgreement("infoAccurate", e.target.checked)}
                            />
                            I certify that the information provided is true and accurate.
                        </label>
                        <label className="bp-checkbox-label">
                            <input
                                type="checkbox"
                                checked={agreements.agreeTerms}
                                onChange={(e) => updateAgreement("agreeTerms", e.target.checked)}
                            />
                            I agree to the <a href="#terms">Terms &amp; Conditions.</a>
                        </label>
                        <label className="bp-checkbox-label">
                            <input
                                type="checkbox"
                                checked={agreements.authorizeVerification}
                                onChange={(e) => updateAgreement("authorizeVerification", e.target.checked)}
                            />
                            I authorize CAS to verify the submitted documents.
                        </label>
                    </div>

                    {error && (
                        <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem', border: '1px solid #f87171' }}>
                            {error}
                        </div>
                    )}

                    <div className="bp-actions bp-actions-right">
                        <button type="button" className="bp-btn bp-btn-secondary" onClick={handleBack} disabled={submitting}>
                            Back
                        </button>
                        <button type="submit" className="bp-btn bp-btn-primary" disabled={!canSubmit || submitting}>
                            {submitting ? 'Submitting...' : 'Submit Profile'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    function renderCurrentStep() {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
                return renderStep4();
            default:
                return null;
        }
    }

    if (submitted) {
        return (
            <div className="bp-page">
                <header className="bp-header">
                    <div className="bp-logo">
                        V<span className="bp-logo-accent">◎</span>SX
                        <div className="bp-logo-tagline">Vendor Sourcing &amp; Onboarding Suite</div>
                    </div>
                </header>
                <main className="bp-main bp-main-centered">
                    <div className="bp-success-card">
                        <div className="bp-success-icon">✓</div>
                        <h2>Profile submitted</h2>
                        <p>Your buyer profile has been submitted for verification. We'll notify you once it's reviewed.</p>
                        <button
                            type="button"
                            className="bp-btn bp-btn-primary"
                            onClick={() => navigate('/buyer/dashboard')}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="bp-page">
            <header className="bp-header">
                <div className="bp-logo">
                    V<span className="bp-logo-accent">◎</span>SX
                    <div className="bp-logo-tagline">Vendor Sourcing &amp; Onboarding Suite</div>
                </div>
            </header>
            <main className="bp-main">
                <aside className="bp-sidebar-wrap">{renderStepIndicator()}</aside>
                <section className="bp-content">{renderCurrentStep()}</section>
            </main>
        </div>
    );
}