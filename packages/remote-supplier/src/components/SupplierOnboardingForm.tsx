import React, { useState, useRef, useEffect } from 'react';
import { fetchOnboardingDetails } from '../api/supplierApi';
import { Country, State, City } from 'country-state-city';
import './SupplierOnboardingForm.css';

export const fileToBase64 = (file: File): Promise<string> => {
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

// Step 1: Business Information
export interface Step1Data {
  industry: string;
  businessType: string;
  employeeCount: string;
  annualTurnover: string;
  currency: string;
  yearEstablished: string;
  website: string;
  companyDescription: string;
}

export const initialStep1Data: Step1Data = {
  industry: '',
  businessType: '',
  employeeCount: '',
  annualTurnover: '',
  currency: 'INR',
  yearEstablished: '',
  website: '',
  companyDescription: '',
};

// Step 2: Registrations & Certifications
export interface RegistrationEntry {
  id: string;
  type: string;
  number: string;
  name: string;
  expiryDate: string;
  certificateFile: File | null;
  certificateFileName: string | null;
}

export interface Step2Data {
  registrations: RegistrationEntry[];
}

export const initialStep2Data: Step2Data = {
  registrations: [],
};

// Step 3: Bank Account Information
export interface BankAccountEntry {
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

export interface Step3Data {
  accounts: BankAccountEntry[];
}

export const initialStep3Data: Step3Data = {
  accounts: [],
};

// Step 4: Dispatch Locations
export interface DispatchLocationEntry {
  id: string;
  locationName: string;
  contactPerson: string;
  country: string;
  state: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pinCode: string;
  contactEmail: string;
  contactPhone: string;
  isDefault: boolean;
}

export interface Step4Data {
  locations: DispatchLocationEntry[];
  certifyTrue: boolean;
  agreeTerms: boolean;
  authorizeVerify: boolean;
}

export const initialStep4Data: Step4Data = {
  locations: [],
  certifyTrue: false,
  agreeTerms: false,
  authorizeVerify: false,
};

// ============================================================================
// HELPER COMPONENTS & CONSTANTS
// ============================================================================

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const INDUSTRY_OPTIONS = [
  'Manufacturing',
  'Textiles & Apparel',
  'Electronics',
  'Automotive',
  'Food & Beverage',
  'Chemicals',
  'Construction',
  'Other',
];

const BUSINESS_TYPE_OPTIONS = [
  'Manufacturer',
  'Trader / Distributor',
  'Service Provider',
  'Exporter',
  'Importer',
];

const REGISTRATION_TYPE_OPTIONS = ['GST', 'PAN', 'IEC', 'MSME / Udyam', 'ISO Certificate', 'Other'];
const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP'];
const YEAR_OPTIONS = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i));

interface StepMeta {
  id: number;
  label: string;
}

const STEPS: StepMeta[] = [
  { id: 1, label: 'Business Information' },
  { id: 2, label: 'Registrations & Certifications' },
  { id: 3, label: 'Bank Account Information' },
  { id: 4, label: 'Dispatch Locations' },
];

// ============================================================================
// STEP 1 COMPONENT: Step1BusinessInfo
// ============================================================================

interface Step1BusinessInfoProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onValidationChange?: (isValid: boolean) => void;
  onboardingData?: any;
}

const Step1BusinessInfo: React.FC<Step1BusinessInfoProps> = ({
  data,
  onChange,
  onValidationChange,
  onboardingData,
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleField = <K extends keyof Step1Data>(field: K, value: Step1Data[K]) => {
    onChange({ ...data, [field]: value });
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const errors: Record<string, string> = {};
  if (!data.industry.trim()) errors.industry = 'Industry is required';
  if (!data.businessType.trim()) errors.businessType = 'Business Type is required';

  const isValid = Object.keys(errors).length === 0;

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const getFieldError = (field: string) => {
    if (!touched[field]) return null;
    return errors[field] || null;
  };

  const industryError = getFieldError('industry');
  const businessTypeError = getFieldError('businessType');

  return (
    <>
      <div className="vob-card">
        <h2 className="vob-title">Step 1: Business Information</h2>

        <div className="vob-grid">
          <div className="vob-field">
            <label className="vob-label vob-label--required">Industry</label>
            <select
              data-field="industry"
              className={`vob-select ${industryError ? 'vob-select--error' : ''}`}
              value={data.industry}
              onChange={(e) => handleField('industry', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, industry: true }))}
            >
              <option value="">Select Industry</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {industryError && <span className="vob-error-text">{industryError}</span>}
          </div>

          <div className="vob-field">
            <label className="vob-label vob-label--required">Business Type</label>
            <select
              data-field="businessType"
              className={`vob-select ${businessTypeError ? 'vob-select--error' : ''}`}
              value={data.businessType}
              onChange={(e) => handleField('businessType', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, businessType: true }))}
            >
              <option value="">Select Business Type</option>
              {BUSINESS_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {businessTypeError && <span className="vob-error-text">{businessTypeError}</span>}
          </div>

          <div className="vob-field">
            <label className="vob-label">Employee Count</label>
            <input
              type="number"
              min="0"
              placeholder="Employee Count"
              className="vob-input"
              value={data.employeeCount}
              onChange={(e) => handleField('employeeCount', e.target.value)}
            />
          </div>

          <div className="vob-field">
            <label className="vob-label">Annual Turnover</label>
            <input
              type="text"
              placeholder="Annual Turnover"
              className="vob-input"
              value={data.annualTurnover}
              onChange={(e) => handleField('annualTurnover', e.target.value)}
            />
          </div>

          <div className="vob-field">
            <label className="vob-label">Currency</label>
            <select
              className="vob-select"
              value={data.currency}
              onChange={(e) => handleField('currency', e.target.value)}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="vob-field">
            <label className="vob-label">Year Established</label>
            <select
              className="vob-select"
              value={data.yearEstablished}
              onChange={(e) => handleField('yearEstablished', e.target.value)}
            >
              <option value="">Select Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="vob-field vob-field--full">
            <label className="vob-label">Website</label>
            <input
              type="url"
              placeholder="https://"
              className="vob-input"
              value={data.website}
              onChange={(e) => handleField('website', e.target.value)}
            />
          </div>

          <div className="vob-field vob-field--full">
            <label className="vob-label">Company Description</label>
            <textarea
              rows={4}
              placeholder="Tell buyers about your company, products, services and capabilities..."
              className="vob-textarea"
              value={data.companyDescription}
              onChange={(e) => handleField('companyDescription', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vob-card">
        <h2 className="vob-title">Company Information</h2>
        {onboardingData ? (
          <div className="vob-grid">
            <div className="vob-info-group">
              <div className="vob-info-label">Organization Name</div>
              <div className="vob-info-value">{onboardingData.organizationName || '-'}</div>
            </div>
            <div className="vob-info-group">
              <div className="vob-info-label">Email</div>
              <div className="vob-info-value">{onboardingData.email || '-'}</div>
            </div>
            <div className="vob-info-group">
              <div className="vob-info-label">Phone</div>
              <div className="vob-info-value">{onboardingData.phone || '-'}</div>
            </div>
            <div className="vob-info-group">
              <div className="vob-info-label">Country</div>
              <div className="vob-info-value">{onboardingData.country || '-'}</div>
            </div>
            <div className="vob-info-group">
              <div className="vob-info-label">City</div>
              <div className="vob-info-value">{onboardingData.city || '-'}</div>
            </div>
            <div className="vob-info-group">
              <div className="vob-info-label">State</div>
              <div className="vob-info-value">{onboardingData.state || '-'}</div>
            </div>
            <div className="vob-info-group">
              <div className="vob-info-label">PIN / ZIP Code</div>
              <div className="vob-info-value">{onboardingData.pinCode || '-'}</div>
            </div>

            <div className="vob-info-divider" />

            <div className="vob-field--full">
              <div className="vob-info-label">Address</div>
              <div className="vob-address-block">
                {onboardingData.addressLine1 && <div>{onboardingData.addressLine1}</div>}
                {onboardingData.addressLine2 && <div>{onboardingData.addressLine2}</div>}
                {(onboardingData.city || onboardingData.state || onboardingData.pinCode) && (
                  <div>
                    {onboardingData.city}
                    {onboardingData.city && onboardingData.state && ', '}
                    {onboardingData.state}
                    {(onboardingData.city || onboardingData.state) && onboardingData.pinCode && ' - '}
                    {onboardingData.pinCode}
                  </div>
                )}
                {onboardingData.country && <div>{onboardingData.country}</div>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#868e96', fontSize: '13px' }}>Loading company information...</div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// STEP 2 COMPONENT: Step2Registrations
// ============================================================================

interface Step2RegistrationsProps {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface Step2Draft {
  type: string;
  number: string;
  name: string;
  expiryDate: string;
  certificateFile: File | null;
}

const emptyStep2Draft: Step2Draft = {
  type: 'GST',
  number: '',
  name: '',
  expiryDate: '',
  certificateFile: null,
};

const Step2Registrations: React.FC<Step2RegistrationsProps> = ({ data, onChange, onValidationChange }) => {
  const [draft, setDraft] = useState<Step2Draft>(emptyStep2Draft);
  const [dragActive, setDragActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDraftField = <K extends keyof Step2Draft>(field: K, value: Step2Draft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFormError(null);
  };

  const handleFileSelect = (file: File | null) => {
    handleDraftField('certificateFile', file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) handleFileSelect(file);
  };

  const handleAddRegistration = () => {
    setFormError(null);
    if (!draft.number.trim() || !draft.name.trim()) {
      setFormError('Registration Number and Registration Name are required');
      return;
    }

    const newEntry: RegistrationEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: draft.type,
      number: draft.number.trim(),
      name: draft.name.trim(),
      expiryDate: draft.expiryDate,
      certificateFile: draft.certificateFile,
      certificateFileName: draft.certificateFile?.name ?? null,
    };

    onChange({ registrations: [...data.registrations, newEntry] });
    setDraft(emptyStep2Draft);
    setTouched({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (id: string) => {
    onChange({ registrations: data.registrations.filter((r) => r.id !== id) });
  };

  const isValid = data.registrations.length > 0;

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const numberError = touched.number && !draft.number.trim() ? 'Registration Number is required' : null;
  const nameError = touched.name && !draft.name.trim() ? 'Registration Name is required' : null;

  return (
    <div className="vob-card">
      <h2 className="vob-title">Step 2: Registrations & Certifications</h2>

      {formError && <div className="vob-error-banner">{formError}</div>}

      <div className="vob-grid">
        <div className="vob-field">
          <label className="vob-label">Registration Type</label>
          <select
            className="vob-select"
            value={draft.type}
            onChange={(e) => handleDraftField('type', e.target.value)}
          >
            {REGISTRATION_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Registration Number</label>
          <input
            data-field="number"
            type="text"
            placeholder="Registration Number"
            className={`vob-input ${numberError ? 'vob-input--error' : ''}`}
            value={draft.number}
            onChange={(e) => handleDraftField('number', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, number: true }))}
          />
          {numberError && <span className="vob-error-text">{numberError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Registration Name</label>
          <input
            data-field="name"
            type="text"
            placeholder="Registration Name"
            className={`vob-input ${nameError ? 'vob-input--error' : ''}`}
            value={draft.name}
            onChange={(e) => handleDraftField('name', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          />
          {nameError && <span className="vob-error-text">{nameError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label">Expiry Date</label>
          <input
            type="date"
            className="vob-input"
            value={draft.expiryDate}
            onChange={(e) => handleDraftField('expiryDate', e.target.value)}
          />
        </div>
      </div>

      <label className="vob-label">Upload Certificate</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`vob-upload-area ${dragActive ? 'vob-upload-area--active' : ''}`}
      >
        <span className={draft.certificateFile ? 'vob-upload-filename' : 'vob-upload-text'}>
          {draft.certificateFile
            ? draft.certificateFile.name
            : 'Click to select file or drag and drop certificate here'}
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="vob-upload-input"
        onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
      />

      <div className="vob-action-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleAddRegistration}
          className="vob-btn vob-btn--primary vob-btn--sm"
        >
          + Add Registration
        </button>
      </div>

      {data.registrations.length === 0 && (
        <div className="vob-empty-state">
          No registrations added yet. Please add at least one registration to proceed.
        </div>
      )}

      {data.registrations.length > 0 && (
        <div className="vob-table-wrapper">
          <table className="vob-table">
            <thead className="vob-thead">
              <tr>
                <th className="vob-th">Type</th>
                <th className="vob-th">Number</th>
                <th className="vob-th">Name</th>
                <th className="vob-th">Expiry Date</th>
                <th className="vob-th">Attachments</th>
                <th className="vob-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.registrations.map((reg) => (
                <tr key={reg.id}>
                  <td className="vob-td">{reg.type}</td>
                  <td className="vob-td">{reg.number}</td>
                  <td className="vob-td">{reg.name}</td>
                  <td className="vob-td">{reg.expiryDate || '—'}</td>
                  <td className="vob-td">
                    {reg.certificateFileName ? (
                      <span className="vob-badge vob-badge--attachment">
                        {reg.certificateFileName}
                      </span>
                    ) : (
                      <span className="vob-attachment-none">None</span>
                    )}
                  </td>
                  <td className="vob-td">
                    <button
                      type="button"
                      onClick={() => handleRemove(reg.id)}
                      className="vob-btn-icon"
                      aria-label="Remove registration"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STEP 3 COMPONENT: Step3BankInfo
// ============================================================================

interface Step3BankInfoProps {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface Step3Draft {
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

const emptyStep3Draft: Step3Draft = {
  accountHolderName: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  ifscCode: '',
  swiftCode: '',
  iban: '',
  currency: 'INR',
  isPrimary: false,
};

const Step3BankInfo: React.FC<Step3BankInfoProps> = ({ data, onChange, onValidationChange }) => {
  const [draft, setDraft] = useState<Step3Draft>(emptyStep3Draft);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleDraftField = <K extends keyof Step3Draft>(field: K, value: Step3Draft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFormError(null);
  };

  const handleAddAccount = () => {
    setFormError(null);
    if (
      !draft.accountHolderName.trim() ||
      !draft.bankName.trim() ||
      !draft.branchName.trim() ||
      !draft.accountNumber.trim() ||
      !draft.ifscCode.trim()
    ) {
      setFormError('Account Holder Name, Bank Name, Branch Name, Account Number, and IFSC Code are required.');
      return;
    }

    const isFirstAccount = data.accounts.length === 0;
    const shouldBePrimary = isFirstAccount || draft.isPrimary;

    const newEntry: BankAccountEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      accountHolderName: draft.accountHolderName.trim(),
      bankName: draft.bankName.trim(),
      branchName: draft.branchName.trim(),
      accountNumber: draft.accountNumber.trim(),
      ifscCode: draft.ifscCode.trim(),
      swiftCode: draft.swiftCode.trim(),
      iban: draft.iban.trim(),
      currency: draft.currency,
      isPrimary: shouldBePrimary,
    };

    const updatedAccounts = shouldBePrimary
      ? data.accounts.map((acc) => ({ ...acc, isPrimary: false }))
      : data.accounts;

    onChange({ accounts: [...updatedAccounts, newEntry] });
    setDraft(emptyStep3Draft);
    setTouched({});
  };

  const handleRemove = (id: string) => {
    const removedAccount = data.accounts.find((acc) => acc.id === id);
    let remainingAccounts = data.accounts.filter((acc) => acc.id !== id);

    if (removedAccount?.isPrimary && remainingAccounts.length > 0) {
      remainingAccounts = remainingAccounts.map((acc, index) =>
        index === 0 ? { ...acc, isPrimary: true } : acc
      );
    }

    onChange({ accounts: remainingAccounts });
  };

  const isValid = data.accounts.length > 0;

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const accountHolderNameError = touched.accountHolderName && !draft.accountHolderName.trim() ? 'Account Holder Name is required' : null;
  const bankNameError = touched.bankName && !draft.bankName.trim() ? 'Bank Name is required' : null;
  const branchNameError = touched.branchName && !draft.branchName.trim() ? 'Branch Name is required' : null;
  const accountNumberError = touched.accountNumber && !draft.accountNumber.trim() ? 'Account Number is required' : null;
  const ifscCodeError = touched.ifscCode && !draft.ifscCode.trim() ? 'IFSC Code is required' : null;

  return (
    <div className="vob-card">
      <h2 className="vob-title">Step 3: Bank Account Information</h2>

      {formError && <div className="vob-error-banner">{formError}</div>}

      <div className="vob-grid">
        <div className="vob-field">
          <label className="vob-label vob-label--required">Account Holder Name</label>
          <input
            data-field="accountHolderName"
            type="text"
            placeholder="Account Holder Name"
            className={`vob-input ${accountHolderNameError ? 'vob-input--error' : ''}`}
            value={draft.accountHolderName}
            onChange={(e) => handleDraftField('accountHolderName', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, accountHolderName: true }))}
          />
          {accountHolderNameError && <span className="vob-error-text">{accountHolderNameError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Bank Name</label>
          <input
            data-field="bankName"
            type="text"
            placeholder="Bank Name"
            className={`vob-input ${bankNameError ? 'vob-input--error' : ''}`}
            value={draft.bankName}
            onChange={(e) => handleDraftField('bankName', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, bankName: true }))}
          />
          {bankNameError && <span className="vob-error-text">{bankNameError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Branch Name</label>
          <input
            data-field="branchName"
            type="text"
            placeholder="Branch Name"
            className={`vob-input ${branchNameError ? 'vob-input--error' : ''}`}
            value={draft.branchName}
            onChange={(e) => handleDraftField('branchName', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, branchName: true }))}
          />
          {branchNameError && <span className="vob-error-text">{branchNameError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Account Number</label>
          <input
            data-field="accountNumber"
            type="text"
            placeholder="Account Number"
            className={`vob-input ${accountNumberError ? 'vob-input--error' : ''}`}
            value={draft.accountNumber}
            onChange={(e) => handleDraftField('accountNumber', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, accountNumber: true }))}
          />
          {accountNumberError && <span className="vob-error-text">{accountNumberError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">IFSC Code</label>
          <input
            data-field="ifscCode"
            type="text"
            placeholder="IFSC Code"
            className={`vob-input ${ifscCodeError ? 'vob-input--error' : ''}`}
            value={draft.ifscCode}
            onChange={(e) => handleDraftField('ifscCode', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, ifscCode: true }))}
          />
          {ifscCodeError && <span className="vob-error-text">{ifscCodeError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label">SWIFT Code</label>
          <input
            type="text"
            placeholder="SWIFT Code"
            className="vob-input"
            value={draft.swiftCode}
            onChange={(e) => handleDraftField('swiftCode', e.target.value)}
          />
        </div>

        <div className="vob-field">
          <label className="vob-label">IBAN</label>
          <input
            type="text"
            placeholder="IBAN"
            className="vob-input"
            value={draft.iban}
            onChange={(e) => handleDraftField('iban', e.target.value)}
          />
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Currency</label>
          <select
            className="vob-select"
            value={draft.currency}
            onChange={(e) => handleDraftField('currency', e.target.value)}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="vob-action-row">
          <label className="vob-checkbox-wrapper">
            <input
              type="checkbox"
              className="vob-checkbox"
              checked={draft.isPrimary}
              onChange={(e) => handleDraftField('isPrimary', e.target.checked)}
            />
            <span className="vob-checkbox-label">Primary Bank Account</span>
          </label>

          <button
            type="button"
            onClick={handleAddAccount}
            className="vob-btn vob-btn--primary vob-btn--sm"
          >
            + Add Account
          </button>
        </div>
      </div>

      {data.accounts.length === 0 && (
        <div className="vob-empty-state">
          No bank accounts added yet. Please add at least one bank account to proceed.
        </div>
      )}

      {data.accounts.length > 0 && (
        <div className="vob-table-wrapper">
          <table className="vob-table">
            <thead className="vob-thead">
              <tr>
                <th className="vob-th">Bank Name</th>
                <th className="vob-th">Account Holder Name</th>
                <th className="vob-th">Account Number</th>
                <th className="vob-th">Currency</th>
                <th className="vob-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="vob-td">
                    {acc.bankName}
                    {acc.isPrimary && <span className="vob-badge vob-badge--primary">Primary</span>}
                  </td>
                  <td className="vob-td">{acc.accountHolderName}</td>
                  <td className="vob-td">{acc.accountNumber}</td>
                  <td className="vob-td">{acc.currency}</td>
                  <td className="vob-td">
                    <button
                      type="button"
                      onClick={() => handleRemove(acc.id)}
                      className="vob-btn-icon"
                      aria-label="Remove bank account"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STEP 4 COMPONENT: Step4DispatchLocations
// ============================================================================

interface Step4DispatchLocationsProps {
  data: Step4Data;
  onChange: (data: Step4Data) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface Step4Draft {
  locationName: string;
  contactPerson: string;
  country: string;
  state: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pinCode: string;
  contactEmail: string;
  contactPhone: string;
  isDefault: boolean;
}

const emptyStep4Draft: Step4Draft = {
  locationName: '',
  contactPerson: '',
  country: '',
  state: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  pinCode: '',
  contactEmail: '',
  contactPhone: '',
  isDefault: false,
};

const Step4DispatchLocations: React.FC<Step4DispatchLocationsProps> = ({ data, onChange, onValidationChange }) => {
  const [draft, setDraft] = useState<Step4Draft>(emptyStep4Draft);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isReadOnly = false;
  const hasDefaultLocation = data.locations.some((loc) => loc.isDefault);

  const countries = Country.getAllCountries();
  const selectedCountryObj = countries.find(c => c.name === draft.country);
  const states = selectedCountryObj ? State.getStatesOfCountry(selectedCountryObj.isoCode) : [];
  const selectedStateObj = states.find(s => s.name === draft.state);
  const cities = (selectedCountryObj && selectedStateObj)
    ? City.getCitiesOfState(selectedCountryObj.isoCode, selectedStateObj.isoCode)
    : [];

  const handleDraftField = <K extends keyof Step4Draft>(field: K, value: Step4Draft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFormError(null);
  };

  const handleAddLocation = () => {
    setFormError(null);
    if (
      !draft.locationName.trim() ||
      !draft.country.trim() ||
      !draft.state.trim() ||
      !draft.addressLine1.trim() ||
      !draft.city.trim() ||
      !draft.pinCode.trim()
    ) {
      setFormError('Location Name, Country, State, Address Line 1, City, and PIN/ZIP Code are required.');
      return;
    }

    const shouldBeDefault = draft.isDefault;

    const newEntry: DispatchLocationEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      locationName: draft.locationName.trim(),
      contactPerson: draft.contactPerson.trim(),
      country: draft.country.trim(),
      state: draft.state.trim(),
      addressLine1: draft.addressLine1.trim(),
      addressLine2: draft.addressLine2.trim(),
      city: draft.city.trim(),
      pinCode: draft.pinCode.trim(),
      contactEmail: draft.contactEmail.trim(),
      contactPhone: draft.contactPhone.trim(),
      isDefault: shouldBeDefault,
    };

    const updatedLocations = shouldBeDefault
      ? data.locations.map((loc) => ({ ...loc, isDefault: false }))
      : data.locations;

    onChange({
      ...data,
      locations: [...updatedLocations, newEntry],
    });
    setDraft(emptyStep4Draft);
    setTouched({});
  };

  const handleRemove = (id: string) => {
    const removedLocation = data.locations.find((loc) => loc.id === id);
    let remainingLocations = data.locations.filter((loc) => loc.id !== id);

    if (removedLocation?.isDefault && remainingLocations.length > 0) {
      remainingLocations = remainingLocations.map((loc, index) =>
        index === 0 ? { ...loc, isDefault: true } : loc
      );
    }

    onChange({
      ...data,
      locations: remainingLocations,
    });
  };

  const handleCheckboxChange = (field: 'certifyTrue' | 'agreeTerms' | 'authorizeVerify', val: boolean) => {
    onChange({
      ...data,
      [field]: val,
    });
  };

  const isValid = data.locations.length > 0 && data.certifyTrue && data.agreeTerms && data.authorizeVerify;

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const locationNameError = touched.locationName && !draft.locationName.trim() ? 'Location Name is required' : null;
  const countryError = touched.country && !draft.country.trim() ? 'Country is required' : null;
  const stateError = touched.state && !draft.state.trim() ? 'State is required' : null;
  const addressLine1Error = touched.addressLine1 && !draft.addressLine1.trim() ? 'Address Line 1 is required' : null;
  const cityError = touched.city && !draft.city.trim() ? 'City is required' : null;
  const pinCodeError = touched.pinCode && !draft.pinCode.trim() ? 'PIN / ZIP Code is required' : null;

  return (
    <div className="vob-card">
      <h2 className="vob-title">Step 4: Dispatch Locations</h2>

      {formError && <div className="vob-error-banner">{formError}</div>}

      <div className="vob-grid">
        <div className="vob-field">
          <label className="vob-label vob-label--required">Location Name</label>
          <input
            data-field="locationName"
            type="text"
            placeholder="Location Name"
            className={`vob-input ${locationNameError ? 'vob-input--error' : ''}`}
            value={draft.locationName}
            onChange={(e) => handleDraftField('locationName', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, locationName: true }))}
            disabled={isReadOnly}
          />
          {locationNameError && <span className="vob-error-text">{locationNameError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label">Contact Person</label>
          <input
            type="text"
            placeholder="Contact Person"
            className="vob-input"
            value={draft.contactPerson}
            onChange={(e) => handleDraftField('contactPerson', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Country</label>
          <select
            data-field="country"
            className={`vob-select ${countryError ? 'vob-select--error' : ''}`}
            value={draft.country}
            onChange={(e) => {
              handleDraftField('country', e.target.value);
              handleDraftField('state', '');
              handleDraftField('city', '');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, country: true }))}
            disabled={isReadOnly}
          >
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c.isoCode} value={c.name}>{c.name}</option>
            ))}
            {isReadOnly && !selectedCountryObj && draft.country && (
              <option value={draft.country}>{draft.country}</option>
            )}
          </select>
          {countryError && <span className="vob-error-text">{countryError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">State</label>
          <select
            data-field="state"
            className={`vob-select ${stateError ? 'vob-select--error' : ''}`}
            value={draft.state}
            onChange={(e) => {
              handleDraftField('state', e.target.value);
              handleDraftField('city', '');
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, state: true }))}
            disabled={isReadOnly || !draft.country}
          >
            <option value="">Select State</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.name}>{s.name}</option>
            ))}
            {isReadOnly && !selectedStateObj && draft.state && (
              <option value={draft.state}>{draft.state}</option>
            )}
          </select>
          {stateError && <span className="vob-error-text">{stateError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">Address Line 1</label>
          <input
            data-field="addressLine1"
            type="text"
            placeholder="Address Line 1"
            className={`vob-input ${addressLine1Error ? 'vob-input--error' : ''}`}
            value={draft.addressLine1}
            onChange={(e) => handleDraftField('addressLine1', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, addressLine1: true }))}
            disabled={isReadOnly}
          />
          {addressLine1Error && <span className="vob-error-text">{addressLine1Error}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label">Address Line 2</label>
          <input
            type="text"
            placeholder="Address Line 2"
            className="vob-input"
            value={draft.addressLine2}
            onChange={(e) => handleDraftField('addressLine2', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">City</label>
          <select
            data-field="city"
            className={`vob-select ${cityError ? 'vob-select--error' : ''}`}
            value={draft.city}
            onChange={(e) => handleDraftField('city', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, city: true }))}
            disabled={isReadOnly || !draft.state}
          >
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
            {isReadOnly && !cities.find(c => c.name === draft.city) && draft.city && (
              <option value={draft.city}>{draft.city}</option>
            )}
          </select>
          {cityError && <span className="vob-error-text">{cityError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label vob-label--required">PIN / ZIP Code</label>
          <input
            data-field="pinCode"
            type="text"
            placeholder="PIN / ZIP Code"
            className={`vob-input ${pinCodeError ? 'vob-input--error' : ''}`}
            value={draft.pinCode}
            onChange={(e) => handleDraftField('pinCode', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, pinCode: true }))}
            disabled={isReadOnly}
          />
          {pinCodeError && <span className="vob-error-text">{pinCodeError}</span>}
        </div>

        <div className="vob-field">
          <label className="vob-label">Contact Email ID</label>
          <input
            type="email"
            placeholder="Contact Email ID"
            className="vob-input"
            value={draft.contactEmail}
            onChange={(e) => handleDraftField('contactEmail', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div className="vob-field">
          <label className="vob-label">Contact Phone Number</label>
          <input
            type="tel"
            placeholder="Contact Phone Number"
            className="vob-input"
            value={draft.contactPhone}
            onChange={(e) => handleDraftField('contactPhone', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div className="vob-action-row">
          {!hasDefaultLocation ? (
            <label className="vob-checkbox-wrapper">
              <input
                type="checkbox"
                className="vob-checkbox"
                checked={draft.isDefault}
                onChange={(e) => handleDraftField('isDefault', e.target.checked)}
              />
              <span className="vob-checkbox-label">Default Dispatch Location</span>
            </label>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleAddLocation}
            className="vob-btn vob-btn--primary vob-btn--sm"
          >
            + Add Location
          </button>
        </div>
      </div>

      {data.locations.length === 0 && (
        <div className="vob-empty-state">
          No dispatch locations added yet. Please add at least one dispatch location to proceed.
        </div>
      )}

      {data.locations.length > 0 && (
        <div className="vob-table-wrapper">
          <table className="vob-table">
            <thead className="vob-thead">
              <tr>
                <th className="vob-th">Location Name</th>
                <th className="vob-th">City</th>
                <th className="vob-th">Contact Person</th>
                <th className="vob-th">State</th>
                <th className="vob-th">Phone Number</th>
                <th className="vob-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.locations.map((loc) => (
                <tr key={loc.id}>
                  <td className="vob-td">
                    {loc.locationName}
                    {loc.isDefault && <span className="vob-badge vob-badge--success">Default</span>}
                  </td>
                  <td className="vob-td">{loc.city}</td>
                  <td className="vob-td">{loc.contactPerson || '—'}</td>
                  <td className="vob-td">{loc.state}</td>
                  <td className="vob-td">{loc.contactPhone || '—'}</td>
                  <td className="vob-td">
                    <button
                      type="button"
                      onClick={() => handleRemove(loc.id)}
                      className="vob-btn-icon"
                      aria-label="Remove location"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="vob-declarations">
        <label className="vob-declaration-row">
          <input
            type="checkbox"
            className="vob-declaration-checkbox"
            checked={data.certifyTrue}
            onChange={(e) => handleCheckboxChange('certifyTrue', e.target.checked)}
          />
          <span className="vob-declaration-text">I certify that the information provided is true and accurate.</span>
        </label>

        <label className="vob-declaration-row">
          <input
            type="checkbox"
            className="vob-declaration-checkbox"
            checked={data.agreeTerms}
            onChange={(e) => handleCheckboxChange('agreeTerms', e.target.checked)}
          />
          <span className="vob-declaration-text">
            I agree to the{' '}
            <a href="#terms" onClick={(e) => e.preventDefault()} className="vob-link">
              Terms & Conditions
            </a>
            .
          </span>
        </label>

        <label className="vob-declaration-row">
          <input
            type="checkbox"
            className="vob-declaration-checkbox"
            checked={data.authorizeVerify}
            onChange={(e) => handleCheckboxChange('authorizeVerify', e.target.checked)}
          />
          <span className="vob-declaration-text">I authorize CAS to verify the submitted documents.</span>
        </label>
      </div>
    </div>
  );
};

// ============================================================================
// SUPPLIER ONBOARDING FORM (MAIN WIZARD ORCHESTRATOR)
// ============================================================================

interface SupplierOnboardingFormProps {
  onComplete: (data: {
    step1: Step1Data;
    step2: Step2Data;
    step3: Step3Data;
    step4: Step4Data;
  }) => Promise<void> | void;
}

const sila_logo = `${window.location.protocol}//${window.location.host}/assets/SILA_Logo.png`;

const SupplierOnboardingForm: React.FC<SupplierOnboardingFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [step1, setStep1] = useState<Step1Data>(initialStep1Data);
  const [step2, setStep2] = useState<Step2Data>(initialStep2Data);
  const [step3, setStep3] = useState<Step3Data>(initialStep3Data);
  const [step4, setStep4] = useState<Step4Data>(initialStep4Data);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(false);
  const [step4Valid, setStep4Valid] = useState(false);

  const [showValidationError, setShowValidationError] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        const data = await fetchOnboardingDetails();
        setOnboardingData(data);
      } catch (err) {
        console.warn('Failed to fetch onboarding details', err);
      }
    };
    loadOnboardingData();
  }, []);

  const handleNext = async () => {
    setError(null);
    setShowValidationError(false);

    if (currentStep === 1 && !step1Valid) {
      setShowValidationError(true);
      return;
    }

    if (currentStep === 2 && !step2Valid) {
      setShowValidationError(true);
      return;
    }

    if (currentStep === 3 && !step3Valid) {
      setShowValidationError(true);
      return;
    }

    if (currentStep === 4 && !step4Valid) {
      setShowValidationError(true);
      return;
    }

    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
      setShowValidationError(false);
      return;
    }

    setSubmitting(true);
    try {
      await onComplete({ step1, step2, step3, step4 });
    } catch (err: any) {
      setError(err.message || 'Failed to save details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setShowValidationError(false);
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const isNextDisabled = submitting;

  const getTooltip = () => {
    if (submitting) return '';
    if (currentStep === 1 && !step1Valid) return 'Please fill in all required fields (Industry and Business Type) first';
    if (currentStep === 2 && !step2Valid) return 'Please add at least one registration to proceed';
    if (currentStep === 3 && !step3Valid) return 'Please add at least one bank account to proceed';
    if (currentStep === 4 && !step4Valid) return 'Please add at least one location and certify all statements to proceed';
    return '';
  };

  return (
    <div className="vob-page">
      <header className="vob-header">
        <img src={sila_logo} alt="SILA" style={{ height: 32 }} />
      </header>

      <main className="vob-main">
        <aside className="vob-sidebar">
          <ol className="vob-step-list">
            {STEPS.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;

              return (
                <li
                  key={step.id}
                  className="vob-step-item"
                  style={{
                    borderBottom: index < STEPS.length - 1 ? '1px solid #f1f3f5' : 'none',
                  }}
                >
                  <span
                    className={`vob-step-number ${isCompleted
                        ? 'vob-step-number--completed'
                        : isActive
                          ? 'vob-step-number--active'
                          : 'vob-step-number--pending'
                      }`}
                  >
                    {isCompleted ? <CheckIcon /> : step.id}
                  </span>
                  <span
                    className={`vob-step-label ${isCompleted
                        ? 'vob-step-label--completed'
                        : isActive
                          ? 'vob-step-label--active'
                          : 'vob-step-label--pending'
                      }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="vob-content">
          {error && <div className="vob-error-banner">{error}</div>}

          {showValidationError && (
            <div className="vob-validation-banner">
              {currentStep === 1 && 'Please fill in all required fields (Industry and Business Type) before proceeding.'}
              {currentStep === 2 && 'Please add at least one registration before proceeding.'}
              {currentStep === 3 && 'Please add at least one bank account before proceeding.'}
              {currentStep === 4 && 'Please add at least one location and certify all statements before proceeding.'}
            </div>
          )}

          {currentStep === 1 && (
            <Step1BusinessInfo
              data={step1}
              onChange={setStep1}
              onValidationChange={setStep1Valid}
              onboardingData={onboardingData}
            />
          )}
          {currentStep === 2 && (
            <Step2Registrations
              data={step2}
              onChange={setStep2}
              onValidationChange={setStep2Valid}
            />
          )}
          {currentStep === 3 && (
            <Step3BankInfo
              data={step3}
              onChange={setStep3}
              onValidationChange={setStep3Valid}
            />
          )}
          {currentStep === 4 && (
            <Step4DispatchLocations
              data={step4}
              onChange={setStep4}
              onValidationChange={setStep4Valid}
            />
          )}

          <div className="vob-nav-row">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="vob-btn vob-btn--secondary"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isNextDisabled}
              title={getTooltip()}
              className="vob-btn vob-btn--primary"
            >
              {submitting ? 'Saving...' : currentStep === 4 ? 'Submit Profile' : 'Next'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupplierOnboardingForm;