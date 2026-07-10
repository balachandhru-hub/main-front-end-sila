import React, { useState } from 'react';

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

interface Step1BusinessInfoProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onValidationChange?: (isValid: boolean) => void;
}

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

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP'];

const YEAR_OPTIONS = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i));

const Step1BusinessInfo: React.FC<Step1BusinessInfoProps> = ({ data, onChange, onValidationChange }) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleField = <K extends keyof Step1Data>(field: K, value: Step1Data[K]) => {
    onChange({ ...data, [field]: value });
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Validation
  const errors: Record<string, string> = {};
  if (!data.industry.trim()) errors.industry = 'Industry is required';
  if (!data.businessType.trim()) errors.businessType = 'Business Type is required';

  const isValid = Object.keys(errors).length === 0;

  // Notify parent about validation status
  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const getFieldError = (field: string) => {
    if (!touched[field]) return null;
    return errors[field] || null;
  };

  const styles: Record<string, React.CSSProperties> = {
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      padding: '28px',
    },
    title: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#212529',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #f1f3f5',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px 24px',
    },
    field: {
      display: 'flex',
      flexDirection: 'column',
    },
    fieldFull: {
      display: 'flex',
      flexDirection: 'column',
      gridColumn: '1 / -1',
    },
    label: {
      fontSize: '12px',
      fontWeight: 500,
      color: '#495057',
      marginBottom: '6px',
    },
    labelRequired: {
      fontSize: '12px',
      fontWeight: 500,
      color: '#495057',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#212529',
      backgroundColor: '#ffffff',
      outline: 'none',
      boxSizing: 'border-box',
    },
    inputError: {
      borderColor: '#dc3545',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#212529',
      backgroundColor: '#ffffff',
      outline: 'none',
      boxSizing: 'border-box',
      appearance: 'none' as any,
      WebkitAppearance: 'none' as any,
      MozAppearance: 'none' as any,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
      paddingRight: '32px',
      cursor: 'pointer',
    },
    selectError: {
      borderColor: '#dc3545',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#212529',
      backgroundColor: '#ffffff',
      outline: 'none',
      boxSizing: 'border-box',
      resize: 'none' as any,
      minHeight: '100px',
    },
    errorText: {
      fontSize: '11px',
      color: '#dc3545',
      marginTop: '4px',
    },
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.borderColor = '#2196f3';
    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const field = e.currentTarget;
    const fieldName = field.getAttribute('data-field');
    if (fieldName) {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));
    }
    field.style.borderColor = '#dee2e6';
    field.style.boxShadow = 'none';
  };

  const industryError = getFieldError('industry');
  const businessTypeError = getFieldError('businessType');

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Step 1: Business Information</h2>

      <div style={styles.grid}>
        <div style={styles.field}>
          <label style={styles.labelRequired}>
            Industry<span style={{ color: '#dc3545' }}> *</span>
          </label>
          <select
            data-field="industry"
            style={{
              ...styles.select,
              ...(industryError ? styles.selectError : {}),
            }}
            value={data.industry}
            onChange={(e) => handleField('industry', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="">Select Industry</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {industryError && <span style={styles.errorText}>{industryError}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.labelRequired}>
            Business Type<span style={{ color: '#dc3545' }}> *</span>
          </label>
          <select
            data-field="businessType"
            style={{
              ...styles.select,
              ...(businessTypeError ? styles.selectError : {}),
            }}
            value={data.businessType}
            onChange={(e) => handleField('businessType', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="">Select Business Type</option>
            {BUSINESS_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {businessTypeError && <span style={styles.errorText}>{businessTypeError}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Employee Count</label>
          <input
            type="number"
            min="0"
            placeholder="Employee Count"
            style={styles.input}
            value={data.employeeCount}
            onChange={(e) => handleField('employeeCount', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Annual Turnover</label>
          <input
            type="text"
            placeholder="Annual Turnover"
            style={styles.input}
            value={data.annualTurnover}
            onChange={(e) => handleField('annualTurnover', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Currency</label>
          <select
            style={styles.select}
            value={data.currency}
            onChange={(e) => handleField('currency', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Year Established</label>
          <select
            style={styles.select}
            value={data.yearEstablished}
            onChange={(e) => handleField('yearEstablished', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="">Select Year</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Website</label>
          <input
            type="url"
            placeholder="https://"
            style={styles.input}
            value={data.website}
            onChange={(e) => handleField('website', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Company Description</label>
          <textarea
            rows={4}
            placeholder="Tell buyers about your company, products, services and capabilities..."
            style={styles.textarea}
            value={data.companyDescription}
            onChange={(e) => handleField('companyDescription', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
      </div>
    </div>
  );
};

export default Step1BusinessInfo;