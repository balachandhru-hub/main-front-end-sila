import React, { useRef, useState } from 'react';

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

interface Step2RegistrationsProps {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const REGISTRATION_TYPE_OPTIONS = ['GST', 'PAN', 'IEC', 'MSME / Udyam', 'ISO Certificate', 'Other'];

interface DraftEntry {
  type: string;
  number: string;
  name: string;
  expiryDate: string;
  certificateFile: File | null;
}

const emptyDraft: DraftEntry = {
  type: 'GST',
  number: '',
  name: '',
  expiryDate: '',
  certificateFile: null,
};

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Step2Registrations: React.FC<Step2RegistrationsProps> = ({ data, onChange, onValidationChange }) => {
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft);
  const [dragActive, setDragActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDraftField = <K extends keyof DraftEntry>(field: K, value: DraftEntry[K]) => {
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
    if (!draft.number || !draft.name) {
      setFormError('Registration Number and Registration Name are required');
      return;
    }

    const newEntry: RegistrationEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: draft.type,
      number: draft.number,
      name: draft.name,
      expiryDate: draft.expiryDate,
      certificateFile: draft.certificateFile,
      certificateFileName: draft.certificateFile?.name ?? null,
    };

    onChange({ registrations: [...data.registrations, newEntry] });
    setDraft(emptyDraft);
    setTouched({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (id: string) => {
    onChange({ registrations: data.registrations.filter((r) => r.id !== id) });
  };

  // Validation: Step 2 is valid if at least one registration is added
  const isValid = data.registrations.length > 0;

  // Notify parent about validation status
  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  // --- Styles ---
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
    error: {
      marginBottom: '16px',
      padding: '12px 16px',
      backgroundColor: '#fff5f5',
      border: '1px solid #feb2b2',
      borderRadius: '6px',
      color: '#c53030',
      fontSize: '13px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px 24px',
      marginBottom: '20px',
    },
    field: {
      display: 'flex',
      flexDirection: 'column',
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
    uploadLabel: {
      fontSize: '12px',
      fontWeight: 500,
      color: '#495057',
      marginBottom: '6px',
      display: 'block',
    },
    uploadArea: {
      width: '100%',
      border: '2px dashed #bbdefb',
      borderRadius: '8px',
      padding: '32px 20px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: '#e3f2fd',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    uploadAreaActive: {
      borderColor: '#2196f3',
      backgroundColor: '#bbdefb',
    },
    uploadText: {
      fontSize: '13px',
      color: '#6c757d',
    },
    uploadFilename: {
      fontSize: '13px',
      color: '#2196f3',
      fontWeight: 500,
    },
    uploadInput: {
      display: 'none',
    },
    addBtnWrapper: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '20px',
    },
    addBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#2196f3',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: 500,
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    addBtnHover: {
      backgroundColor: '#1976d2',
    },
    addIcon: {
      fontSize: '16px',
      lineHeight: 1,
    },
    tableWrapper: {
      overflowX: 'auto',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      marginBottom: '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
    },
    thead: {
      backgroundColor: '#f8f9fa',
    },
    th: {
      padding: '10px 14px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 600,
      color: '#6c757d',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      borderBottom: '1px solid #e9ecef',
    },
    td: {
      padding: '12px 14px',
      color: '#495057',
      borderBottom: '1px solid #f1f3f5',
    },
    attachmentBadge: {
      display: 'inline-block',
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
      fontSize: '11px',
      padding: '3px 10px',
      borderRadius: '12px',
      maxWidth: '100px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
    },
    attachmentNone: {
      color: '#adb5bd',
      fontSize: '12px',
    },
    removeBtn: {
      background: 'none',
      border: 'none',
      color: '#dc3545',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'background-color 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      padding: '24px',
      textAlign: 'center',
      color: '#adb5bd',
      fontSize: '13px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px dashed #dee2e6',
      marginBottom: '20px',
    },
  };

  // Focus handlers
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

  const uploadAreaStyle: React.CSSProperties = dragActive
    ? { ...styles.uploadArea, ...styles.uploadAreaActive }
    : styles.uploadArea;

  const numberError = touched.number && !draft.number ? 'Registration Number is required' : null;
  const nameError = touched.name && !draft.name ? 'Registration Name is required' : null;

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Step 2: Registrations & Certifications</h2>

      {formError && (
        <div style={styles.error}>
          {formError}
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.field}>
          <label style={styles.label}>Registration Type</label>
          <select
            style={styles.select}
            value={draft.type}
            onChange={(e) => handleDraftField('type', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            {REGISTRATION_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.labelRequired}>
            Registration Number<span style={{ color: '#dc3545' }}> *</span>
          </label>
          <input
            data-field="number"
            type="text"
            placeholder="Registration Number"
            style={{
              ...styles.input,
              ...(numberError ? styles.inputError : {}),
            }}
            value={draft.number}
            onChange={(e) => handleDraftField('number', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {numberError && <span style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px' }}>{numberError}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.labelRequired}>
            Registration Name<span style={{ color: '#dc3545' }}> *</span>
          </label>
          <input
            data-field="name"
            type="text"
            placeholder="Registration Name"
            style={{
              ...styles.input,
              ...(nameError ? styles.inputError : {}),
            }}
            value={draft.name}
            onChange={(e) => handleDraftField('name', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {nameError && <span style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px' }}>{nameError}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Expiry Date</label>
          <input
            type="date"
            style={styles.input}
            value={draft.expiryDate}
            onChange={(e) => handleDraftField('expiryDate', e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
      </div>

      <label style={styles.uploadLabel}>Upload Certificate</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={uploadAreaStyle}
      >
        <span style={draft.certificateFile ? styles.uploadFilename : styles.uploadText}>
          {draft.certificateFile
            ? draft.certificateFile.name
            : 'Click to select file or drag and drop certificate here'}
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        style={styles.uploadInput}
        onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
      />

      <div style={styles.addBtnWrapper}>
        <button
          type="button"
          onClick={handleAddRegistration}
          style={styles.addBtn}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1976d2';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2196f3';
          }}
        >
          <span style={styles.addIcon}>+</span> Add Registration
        </button>
      </div>

      {data.registrations.length === 0 && (
        <div style={styles.emptyState}>
          No registrations added yet. Please add at least one registration to proceed.
        </div>
      )}

      {data.registrations.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Number</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Expiry Date</th>
                <th style={styles.th}>Attachments</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.registrations.map((reg, index) => (
                <tr
                  key={reg.id}
                  style={{
                    borderBottom: index < data.registrations.length - 1 ? '1px solid #f1f3f5' : 'none',
                  }}
                >
                  <td style={styles.td}>{reg.type}</td>
                  <td style={styles.td}>{reg.number}</td>
                  <td style={styles.td}>{reg.name}</td>
                  <td style={styles.td}>{reg.expiryDate || '—'}</td>
                  <td style={styles.td}>
                    {reg.certificateFileName ? (
                      <span style={styles.attachmentBadge}>
                        {reg.certificateFileName}
                      </span>
                    ) : (
                      <span style={styles.attachmentNone}>None</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      onClick={() => handleRemove(reg.id)}
                      style={styles.removeBtn}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff5f5';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }}
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

export default Step2Registrations;