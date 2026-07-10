import React, { useState } from 'react';
import Step1BusinessInfo, { type Step1Data, initialStep1Data } from './Step1businessinfo';
import Step2Registrations, { type Step2Data, initialStep2Data } from './Step2registrations';

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

// Logo from host app - uses current domain automatically
const vosx_logo = `${window.location.protocol}//${window.location.host}/assets/vosx-logo.png`;

interface SupplierOnboardingFormProps {
  onComplete: (data: { step1: Step1Data; step2: Step2Data }) => Promise<void> | void;
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SupplierOnboardingForm: React.FC<SupplierOnboardingFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [step1, setStep1] = useState<Step1Data>(initialStep1Data);
  const [step2, setStep2] = useState<Step2Data>(initialStep2Data);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  const handleNext = async () => {
    setError(null);
    setShowValidationError(false);

    // Validate current step before proceeding
    if (currentStep === 1 && !step1Valid) {
      setShowValidationError(true);
      return;
    }

    if (currentStep === 2 && !step2Valid) {
      setShowValidationError(true);
      return;
    }

    if (currentStep < 2) {
      setCurrentStep((s) => s + 1);
      setShowValidationError(false);
      return;
    }

    // Last step -> submit
    setSubmitting(true);
    try {
      await onComplete({ step1, step2 });
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

  // Determine if Next button should be disabled
  const isNextDisabled = (currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid) || submitting;

  // Tooltip message based on current step
  const getTooltip = () => {
    if (submitting) return '';
    if (currentStep === 1 && !step1Valid) return 'Please fill in all required fields (Industry and Business Type) first';
    if (currentStep === 2 && !step2Valid) return 'Please add at least one registration to proceed';
    return '';
  };

  // --- Styles ---
  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
    },
    header: {
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e9ecef',
      padding: '.5rem 6rem',
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 24px',
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start',
    },
    sidebar: {
      width: '260px',
      flexShrink: 0,
      backgroundColor: '#ffffff',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '20px 16px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    },
    stepList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    stepItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 0',
    },
    stepNumberBase: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 600,
      flexShrink: 0,
      transition: 'all 0.2s ease',
    },
    stepNumberActive: {
      backgroundColor: '#2196f3',
      color: '#ffffff',
      border: '2px solid #2196f3',
    },
    stepNumberCompleted: {
      backgroundColor: '#4caf50',
      color: '#ffffff',
      border: '2px solid #4caf50',
    },
    stepNumberPending: {
      backgroundColor: '#ffffff',
      color: '#adb5bd',
      border: '2px solid #dee2e6',
    },
    stepLabelBase: {
      fontSize: '13px',
      fontWeight: 500,
      transition: 'color 0.2s ease',
    },
    stepLabelActive: {
      color: '#2196f3',
    },
    stepLabelCompleted: {
      color: '#4caf50',
    },
    stepLabelPending: {
      color: '#adb5bd',
    },
    content: {
      flex: 1,
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
    validationError: {
      marginBottom: '16px',
      padding: '12px 16px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '6px',
      color: '#856404',
      fontSize: '13px',
    },
    nav: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    btnBase: {
      fontSize: '14px',
      fontWeight: 500,
      padding: '10px 28px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    btnPrimary: {
      backgroundColor: '#2196f3',
      color: '#ffffff',
    },
    btnPrimaryDisabled: {
      backgroundColor: '#90caf9',
      color: '#ffffff',
      cursor: 'not-allowed',
      opacity: 0.8,
    },
    btnSecondary: {
      backgroundColor: '#ffffff',
      color: '#495057',
      border: '1px solid #dee2e6',
      marginRight: '12px',
    },
    btnSecondaryHover: {
      backgroundColor: '#f8f9fa',
    },
    btnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <img src={vosx_logo} alt="VOSX" style={{ height: 32 }} />
      </header>

      <main style={styles.main}>
        <aside style={styles.sidebar}>
          <ol style={styles.stepList}>
            {STEPS.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;

              const numberStyle: React.CSSProperties = {
                ...styles.stepNumberBase,
                ...(isCompleted ? styles.stepNumberCompleted : isActive ? styles.stepNumberActive : styles.stepNumberPending),
              };

              const labelStyle: React.CSSProperties = {
                ...styles.stepLabelBase,
                ...(isCompleted ? styles.stepLabelCompleted : isActive ? styles.stepLabelActive : styles.stepLabelPending),
              };

              return (
                <li
                  key={step.id}
                  style={{
                    ...styles.stepItem,
                    borderBottom: index < STEPS.length - 1 ? '1px solid #f1f3f5' : 'none',
                  }}
                >
                  <span style={numberStyle}>
                    {isCompleted ? <CheckIcon /> : step.id}
                  </span>
                  <span style={labelStyle}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </aside>

        <div style={styles.content}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {showValidationError && (
            <div style={styles.validationError}>
              {currentStep === 1
                ? 'Please fill in all required fields (Industry and Business Type) before proceeding.'
                : 'Please add at least one registration before proceeding.'}
            </div>
          )}

          {currentStep === 1 && (
            <Step1BusinessInfo 
              data={step1} 
              onChange={setStep1}
              onValidationChange={setStep1Valid}
            />
          )}
          {currentStep === 2 && (
            <Step2Registrations 
              data={step2} 
              onChange={setStep2}
              onValidationChange={setStep2Valid}
            />
          )}

          <div style={styles.nav}>
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              style={{
                ...styles.btnBase,
                ...styles.btnSecondary,
                ...(currentStep === 1 || submitting ? styles.btnDisabled : {}),
              }}
              onMouseEnter={(e) => {
                if (!(currentStep === 1 || submitting)) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isNextDisabled}
              title={getTooltip()}
              style={{
                ...styles.btnBase,
                ...(isNextDisabled ? styles.btnPrimaryDisabled : styles.btnPrimary),
              }}
              onMouseEnter={(e) => {
                if (!isNextDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1976d2';
                }
              }}
              onMouseLeave={(e) => {
                if (!isNextDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2196f3';
                } else {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#90caf9';
                }
              }}
            >
              {submitting ? 'Saving...' : 'Next'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupplierOnboardingForm;