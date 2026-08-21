import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@vosox/shared-ui';
import Header from './Header';
import './SupplierRegistration.css';
import { CiMail } from "react-icons/ci";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { sendOtp, verifyOtp } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import { createOrganization } from '../api/organizationApi';
import { Country, State } from 'country-state-city';

const CheckIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const OTP_LENGTH = 6;
const OTP_DURATION = 600; // seconds

interface BuyersRegistrationProps {
    businessEmail?: string;
}

// Fields we validate in step 3
interface FieldErrors {
    companyName?: string;
    phone?: string;
    country?: string;
    addressLine1?: string;
    city?: string;
    stateVal?: string;
    zip?: string;
    name?: string;
    adminEmail?: string;
    pw?: string;
    pw2?: string;
}

const BuyersRegistration: React.FC<BuyersRegistrationProps> = ({
    businessEmail: initialEmail,
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const [email, setEmail] = useState(initialEmail ?? '');

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [secondsLeft, setSecondsLeft] = useState(OTP_DURATION);
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);


    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    const [companyName, setCompanyName] = useState('');
    const [country, setCountry] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [stateVal, setStateVal] = useState('');
    const [zip, setZip] = useState('');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);

    // ✅ NEW: field-level validation errors for step 3
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [isCreatingAccount, setIsCreatingAccount] = useState(false);
    const [createError, setCreateError] = useState('');
    const navigate = useNavigate();


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

    const isValidEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSendOtp = async () => {
        if (!isValidEmail(email)) {
            setOtpError('Please enter a valid email address.');
            return;
        }
        if (!email || isSendingOtp) return;
        setOtpError('');
        setIsSendingOtp(true);

        try {
            await sendOtp(email);
            setOtp(Array(OTP_LENGTH).fill(''));
            setSecondsLeft(OTP_DURATION);
            setStep(2);
        } catch (error: any) {
            const errorMsg = error.message || '';
            if (errorMsg.toLowerCase().includes('already been sent')) {
                setOtp(Array(OTP_LENGTH).fill(''));
                setSecondsLeft(OTP_DURATION);
                setStep(2);
            } else {
                setOtpError(errorMsg);
            }
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleResend = async () => {
        if (isResendingOtp) return;
        setOtpError('');
        setIsResendingOtp(true);

        try {
            await sendOtp(email);
            setOtp(Array(OTP_LENGTH).fill(''));
            setSecondsLeft(OTP_DURATION);
            otpRefs.current[0]?.focus();
        } catch (error: any) {
            setOtpError(error.message);
        } finally {
            setIsResendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== OTP_LENGTH || isVerifyingOtp) return;
        setOtpError('');
        setIsVerifyingOtp(true);

        try {
            await verifyOtp(email, otpCode);
            setStep(3);
        } catch (error: any) {
            setOtpError(error.message);
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // ✅ NEW: validates all required step-3 fields, returns true if valid
    const validateStep3 = (): boolean => {
        const errors: FieldErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!companyName.trim()) errors.companyName = 'Company legal name is required.';
        if (!phone.trim()) errors.phone = 'Phone number is required.';
        else if (!/^[0-9+()\-\s]{6,20}$/.test(phone.trim())) errors.phone = 'Enter a valid phone number.';

        if (!country) errors.country = 'Please select a country.';
        if (!addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required.';
        if (!city.trim()) errors.city = 'City is required.';
        if (!stateVal) errors.stateVal = 'Please select a state.';
        if (!zip.trim()) errors.zip = 'ZIP / pin code is required.';

        if (!name.trim()) errors.name = 'Name is required.';

        if (!adminEmail.trim()) errors.adminEmail = 'Email is required.';
        else if (!emailRegex.test(adminEmail.trim())) errors.adminEmail = 'Enter a valid email address.';

        if (!pw) errors.pw = 'Password is required.';
        else if (pw.length < 8) errors.pw = 'Password must be at least 8 characters.';

        if (!pw2) errors.pw2 = 'Please repeat the password.';
        else if (pw !== pw2) errors.pw2 = 'Passwords do not match.';

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateAccount = async () => {
        if (isCreatingAccount) return;

        // ✅ NEW: run field validation first
        const isValid = validateStep3();
        if (!isValid) {
            setCreateError('Please fill in all required fields correctly.');
            return;
        }

        if (!agreeTerms) {
            setCreateError('Please agree to the Terms of Use to continue.');
            return;
        }

        setIsCreatingAccount(true);
        setCreateError('');
        try {
            await createOrganization({
                organizationName: companyName,
                organizationType: 1, // 1 for Buyer
                email: email,
                phone: phone,
                country: country,
                addressLine1: addressLine1,
                addressLine2: addressLine2,
                city: city,
                state: stateVal,
                pinCode: zip,
                personName: name.trim(),
                userName: email,
                personEmail: adminEmail,
                password: pw,
            });

            navigate('/');
        } catch (error: any) {
            setCreateError(error.response?.data?.message || error.message || 'Failed to create account');
        } finally {
            setIsCreatingAccount(false);
        }
    };

    // ✅ NEW: clears a field's error once the user starts fixing it
    const clearFieldError = (key: keyof FieldErrors) => {
        if (fieldErrors[key]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
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
                            <h1 className="vr-title">Buyer Registration</h1>
                            <p className="vr-subtitle">
                                {step === 1
                                    ? 'Create your buyer account to start sourcing opportunities'
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
                                        verify your email before creating your buyer account.
                                    </p>

                                    <div className="vr-field">
                                        <label className="vr-label"><CiMail /> Business Email Address</label>
                                        <input
                                            className="vr-input"
                                            type="email"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => {
                                                const value = e?.target?.value
                                                setEmail(value)

                                                if (isValidEmail(value)) {
                                                    setOtpError('');
                                                }}}
                                        />
                                        <p className="vr-hint">Please use your official company email address.</p>
                                        {otpError && (
                                            <p className="vr-hint vr-hint--error">{otpError}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <h2 className="vr-section-title">Verify Your Email</h2>
                                    <p className="vr-section-text">
                                        Enter the 6-digit verification code sent to{' '}
                                        <span className="vr-email-highlight">{email || 'buyer@company.com'}</span>
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
                                            className={`vr-link ${secondsLeft > 0 || isResendingOtp ? 'vr-link--disabled' : ''}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!isResendingOtp) handleResend();
                                            }}
                                        >
                                            {isResendingOtp ? 'Sending...' : 'Resend OTP'}
                                        </a>
                                    </p>
                                    {otpError && (
                                        <p className="vr-hint vr-hint--error">{otpError}</p>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="vr-card-footer">
                            {step === 1 && (
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={handleSendOtp}
                                    disabled={!email || isSendingOtp}
                                >
                                    {isSendingOtp ? 'Sending OTP...' : 'Continue'}
                                </Button>
                            )}
                            {step === 2 && (
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={handleVerifyOtp}
                                    disabled={otp.join('').length !== OTP_LENGTH || isVerifyingOtp}
                                >
                                    {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="vr-step3">
                        <div className="vr-step3-header">
                            <h1 className="vr-title">Buyer Registration</h1>
                            <span className="vr-step-indicator">Step 3 of 3</span>
                        </div>

                        <div className="vr-panel">
                            <h2 className="vr-panel-title">Company Information</h2>
                            <div className="vr-grid">
                                <div className="vr-field vr-field--full">
                                    <label className="vr-label vr-label--plain">Company Legal Name*</label>
                                    <input
                                        className={`vr-input ${fieldErrors.companyName ? 'vr-input--error' : ''}`}
                                        value={companyName}
                                        onChange={(e) => {
                                            setCompanyName(e.target.value);
                                            clearFieldError('companyName');
                                        }}
                                    />
                                    {fieldErrors.companyName && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.companyName}</p>
                                    )}
                                </div>

                                <div className="vr-field vr-field--full">
                                    <label className="vr-label vr-label--plain">Phone Number*</label>
                                    <input
                                        className={`vr-input ${fieldErrors.phone ? 'vr-input--error' : ''}`}
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            clearFieldError('phone');
                                        }}
                                    />
                                    {fieldErrors.phone && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.phone}</p>
                                    )}
                                </div>

                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Country / Region*</label>
                                    <select
                                        className={`vr-input vr-select ${fieldErrors.country ? 'vr-input--error' : ''}`}
                                        value={country}
                                        onChange={(e) => {
                                            setCountry(e.target.value);
                                            setStateVal('');
                                            clearFieldError('country');
                                        }}
                                    >
                                        <option value="">Select Country</option>
                                        {Country.getAllCountries().map((c) => (
                                            <option key={c.isoCode} value={c.isoCode}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.country && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.country}</p>
                                    )}
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Address Line 1*</label>
                                    <input
                                        className={`vr-input ${fieldErrors.addressLine1 ? 'vr-input--error' : ''}`}
                                        value={addressLine1}
                                        onChange={(e) => {
                                            setAddressLine1(e.target.value);
                                            clearFieldError('addressLine1');
                                        }}
                                    />
                                    {fieldErrors.addressLine1 && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.addressLine1}</p>
                                    )}
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
                                    <input
                                        className={`vr-input ${fieldErrors.city ? 'vr-input--error' : ''}`}
                                        value={city}
                                        onChange={(e) => {
                                            setCity(e.target.value);
                                            clearFieldError('city');
                                        }}
                                    />
                                    {fieldErrors.city && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.city}</p>
                                    )}
                                </div>

                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">State*</label>
                                    <select
                                        className={`vr-input vr-select ${fieldErrors.stateVal ? 'vr-input--error' : ''}`}
                                        value={stateVal}
                                        onChange={(e) => {
                                            setStateVal(e.target.value);
                                            clearFieldError('stateVal');
                                        }}
                                        disabled={!country}
                                    >
                                        <option value="">Select State</option>
                                        {country && State.getStatesOfCountry(country).map((s) => (
                                            <option key={s.isoCode} value={s.isoCode}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.stateVal && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.stateVal}</p>
                                    )}
                                </div>
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">ZIP Code / Pin Code*</label>
                                    <input
                                        className={`vr-input ${fieldErrors.zip ? 'vr-input--error' : ''}`}
                                        value={zip}
                                        onChange={(e) => {
                                            setZip(e.target.value);
                                            clearFieldError('zip');
                                        }}
                                    />
                                    {fieldErrors.zip && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.zip}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="vr-panel">
                            <h2 className="vr-panel-title">Administrator Account Information</h2>
                            <div className="vr-grid">
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Name*</label>
                                    <input
                                        className={`vr-input ${fieldErrors.name ? 'vr-input--error' : ''}`}
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            clearFieldError('name');
                                        }}
                                    />
                                    {fieldErrors.name && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.name}</p>
                                    )}
                                </div>

                                <div className="vr-field vr-field--full">
                                    <label className="vr-label vr-label--plain">Email*</label>
                                    <input
                                        className={`vr-input ${fieldErrors.adminEmail ? 'vr-input--error' : ''}`}
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => {
                                            setAdminEmail(e.target.value);
                                            clearFieldError('adminEmail');
                                        }}
                                    />
                                    {fieldErrors.adminEmail && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.adminEmail}</p>
                                    )}
                                </div>

                                {/* Password field with Show/Hide eye icon */}
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Password*</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className={`vr-input ${fieldErrors.pw ? 'vr-input--error' : ''}`}
                                            type={showPassword ? 'text' : 'password'}
                                            value={pw}
                                            onChange={(e) => {
                                                setPw(e.target.value);
                                                clearFieldError('pw');
                                            }}
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#6b7280',
                                                padding: '5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px'
                                            }}
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                    {fieldErrors.pw && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.pw}</p>
                                    )}
                                </div>

                                {/* Repeat Password field with Show/Hide eye icon */}
                                <div className="vr-field">
                                    <label className="vr-label vr-label--plain">Repeat Password*</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className={`vr-input ${fieldErrors.pw2 ? 'vr-input--error' : ''}`}
                                            type={showPassword2 ? 'text' : 'password'}
                                            value={pw2}
                                            onChange={(e) => {
                                                setPw2(e.target.value);
                                                clearFieldError('pw2');
                                            }}
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword2(!showPassword2)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#6b7280',
                                                padding: '5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px'
                                            }}
                                        >
                                            {showPassword2 ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                    {fieldErrors.pw2 && (
                                        <p className="vr-hint vr-hint--error">{fieldErrors.pw2}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {createError && (
                            <div className="vr-hint vr-hint--error" style={{ margin: '16px 24px 0' }}>{createError}</div>
                        )}

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

                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleCreateAccount}
                                disabled={isCreatingAccount}
                            >
                                {isCreatingAccount ? 'Creating...' : 'Create Account'}
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

export default BuyersRegistration;