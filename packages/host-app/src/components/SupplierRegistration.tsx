import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@vosox/shared-ui';
import Header from './Header';
import './supplierRegistration.css';
import { CiMail } from "react-icons/ci";

const CheckIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const OTP_LENGTH = 6;
const OTP_DURATION = 90; // seconds

interface SupplierRegistrationProps {
    businessEmail?: string;
    onComplete?: (payload: Record<string, string>) => void;
}

const SupplierRegistration: React.FC<SupplierRegistrationProps> = ({
    businessEmail: initialEmail,
    onComplete,
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const [email, setEmail] = useState(initialEmail ?? '');

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [secondsLeft, setSecondsLeft] = useState(OTP_DURATION);
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    const [companyName, setCompanyName] = useState('');
    const [country, setCountry] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [stateVal, setStateVal] = useState('');
    const [zip, setZip] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [useEmailAsUsername, setUseEmailAsUsername] = useState(true);
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);

    useEffect(() => {
        if (step !== 2) return;
        if (secondsLeft <= 0) return;
        const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearInterval(t);
    }, [step, secondsLeft]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value && !/^[0-9]$/.test(value)) return;
        const next = [...otp];
        next[index] = value;
        setOtp(next);
        if (value && index < OTP_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleResend = () => {
        setOtp(Array(OTP_LENGTH).fill(''));
        setSecondsLeft(OTP_DURATION);
        otpRefs.current[0]?.focus();
    };

    const handleCreateAccount = () => {
        onComplete?.({
            email,
            companyName,
            country,
            addressLine1,
            addressLine2,
            city,
            state: stateVal,
            zip,
            firstName,
            lastName,
            adminEmail: useEmailAsUsername ? email : adminEmail,
        });
    };

    return (
        <div
            className="vr-page"
            style={{ ['--primary-color' as any]: '#2f7cf6', ['--accent-color' as any]: '#1554c9' }}
        >
            <Header />

            <main className="vr-main">
                {step < 3 ? (
                    <div className="vr-card">
                        <div className="vr-card-header">
                            <h1 className="vr-title">Supplier Registration</h1>
                            <p className="vr-subtitle">
                                {step === 1
                                    ? 'Create your supplier account to access sourcing opportunities'
                                    : 'Email Verification'}
                            </p>
                        </div>

                        <div className="vr-stepper-row">
                            <Stepper current={step} />
                        </div>

                        <div className="vr-card-body">
                            {step === 1 && (
                                <>
                                    <h2 className="vr-section-title">Verify Your Email Address</h2>
                                    <p className="vr-section-text">
                                        Enter your business email address. We&apos;ll send a One-Time Password (OTP) to
                                        verify your email before creating your supplier account.
                                    </p>

                                    <div className="vr-field">
                                        <label className="vr-label"><CiMail /> Business Email Address</label>
                                        <input
                                            className="vr-input"
                                            type="email"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <p className="vr-hint">Please use your official company email address.</p>
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <h2 className="vr-section-title">Verify Your Email</h2>
                                    <p className="vr-section-text">
                                        Enter the 6-digit verification code sent to{' '}
                                        <span className="vr-email-highlight">{email || 'supplier@company.com'}</span>
                                    </p>

                                    <div className="vr-otp-row">
                                        {otp.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={(el) => {
                                                    otpRefs.current[i] = el;
                                                }}
                                                className="vr-otp-box"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            />
                                        ))}
                                    </div>

                                    <p className="vr-hint">
                                        OTP Expires in{' '}
                                        <span className="vr-link vr-link--static">{formatTime(secondsLeft)}</span>
                                    </p>
                                    <p className="vr-hint">
                                        Didn&apos;t receive the code?{' '}
                                        <a
                                            href="#"
                                            className="vr-link"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleResend();
                                            }}
                                        >
                                            Resend OTP
                                        </a>
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="vr-card-footer">
                            {step === 1 && (
                                <Button variant="primary" size="md" onClick={() => setStep(2)}>
                                    Continue
                                </Button>
                            )}
                            {step === 2 && (
                                <Button variant="primary" size="md" onClick={() => setStep(3)}>
                                    Verify &amp; Continue
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="vr-step3">
                        <div className="vr-step3-header">
                            <h1 className="vr-title">Supplier Registration</h1>
                            <span className="vr-step-indicator">Step 3 of 3</span>
                        </div>

                        <div className="vr-panel">
                            <h2 className="vr-panel-title">Company Information</h2>
                            <div className="vr-grid">
                                <div className="vr-field vr-field--full">
                                    <label className="vr-label vr-label--plain">Company Legal Name*</label>
                                    <input
                                        className="vr-input"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                    />
                                </div>

                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Country / Region*</label>
                                    <select
                                        className="vr-input vr-select"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                    >
                                        <option value="">Select Country</option>
                                        <option value="IN">India</option>
                                        <option value="US">United States</option>
                                        <option value="GB">United Kingdom</option>
                                        <option value="DE">Germany</option>
                                    </select>
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Address Line 1*</label>
                                    <input
                                        className="vr-input"
                                        value={addressLine1}
                                        onChange={(e) => setAddressLine1(e.target.value)}
                                    />
                                </div>

                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Address Line 2</label>
                                    <input
                                        className="vr-input"
                                        value={addressLine2}
                                        onChange={(e) => setAddressLine2(e.target.value)}
                                    />
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">City*</label>
                                    <input className="vr-input" value={city} onChange={(e) => setCity(e.target.value)} />
                                </div>

                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">State*</label>
                                    <select
                                        className="vr-input vr-select"
                                        value={stateVal}
                                        onChange={(e) => setStateVal(e.target.value)}
                                    >
                                        <option value="">Select State</option>
                                    </select>
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">ZIP Code / Pin Code*</label>
                                    <input className="vr-input" value={zip} onChange={(e) => setZip(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="vr-panel">
                            <h2 className="vr-panel-title">Administrator Account Information</h2>
                            <div className="vr-grid">
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">First Name*</label>
                                    <input
                                        className="vr-input"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Last Name*</label>
                                    <input
                                        className="vr-input"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>

                                <div className="vr-field vr-field--full">
                                    <label className="vr-label vr-label--plain">Email*</label>
                                    <input
                                        className="vr-input"
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                    />
                                </div>

                                <div className="vr-field vr-field--full">
                                    <label className="vr-checkbox">
                                        <span
                                            className={`vr-checkbox-box ${useEmailAsUsername ? 'vr-checkbox-box--checked' : ''}`}
                                            onClick={() => setUseEmailAsUsername(!useEmailAsUsername)}
                                        >
                                            {useEmailAsUsername && <CheckIcon />}
                                        </span>
                                        Use my email as my username
                                    </label>
                                </div>

                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Password*</label>
                                    <input
                                        className="vr-input"
                                        type="password"
                                        value={pw}
                                        onChange={(e) => setPw(e.target.value)}
                                    />
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Repeat Password*</label>
                                    <input
                                        className="vr-input"
                                        type="password"
                                        value={pw2}
                                        onChange={(e) => setPw2(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="vr-panel vr-panel--footer">
                            <label className="vr-checkbox">
                                <span
                                    className={`vr-checkbox-box ${agreeTerms ? 'vr-checkbox-box--checked' : ''}`}
                                    onClick={() => setAgreeTerms(!agreeTerms)}
                                >
                                    {agreeTerms && <CheckIcon />}
                                </span>
                                I have read and agree with the{' '}
                                <a href="#" className="vr-link" onClick={(e) => e.preventDefault()}>
                                    Terms of Use.
                                </a>
                            </label>

                            <Button variant="primary" size="md" onClick={handleCreateAccount} disabled={!agreeTerms}>
                                Create Account
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const Stepper: React.FC<{ current: 1 | 2 | 3 }> = ({ current }) => {
    return (
        <div className="vr-stepper">
            {[1, 2, 3].map((n, i) => (
                <React.Fragment key={n}>
                    <div className={`vr-step-circle ${n <= current ? 'vr-step-circle--active' : ''}`}>{n}</div>
                    {i < 2 && <div className={`vr-step-line ${n < current ? 'vr-step-line--active' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );
};

export default SupplierRegistration;