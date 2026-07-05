import axios from 'axios';

const AUTH_API_BASE = import.meta.env.DEV
    ? '/vosox-api'
    : (import.meta.env.VITE_AUTH_API_BASE || 'https://vosox-api.chervicaon.com');  // This is done for running the application locally. When our application is deployed to production we can remove this.

// when our application is deployed to production we can remove this(above one). and only use the production url(below one).

//    const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || 'https://vosox-api.chervicaon.com'; 


export interface SendOtpResponse {
    id: string | null;
    statusCode: number;
    message: string;
    description: string;
}

export interface SendOtpResult {
    success: boolean;
    message: string;
}

export interface VerifyOtpResult {
    success: boolean;
    message: string;
    id?: string;
}

async function getClientIpAddress(): Promise<string | undefined> {
    try {
        const res = await axios.get('https://api.ipify.org?format=json');
        return typeof res.data?.ip === 'string' ? res.data.ip : undefined;
    } catch {
        return undefined;
    }
}


export async function sendOtp(email: string): Promise<SendOtpResult> {
    try {
        const ipAddress = await getClientIpAddress();

        const res = await axios.post(`${AUTH_API_BASE}/api/v1/auth/send-otp`, {
            email,
            ...(ipAddress ? { ipAddress } : {}),
        }, {
            headers: {
                Accept: 'text/plain',
                'Content-Type': 'application/json',
            }
        });

        return {
            success: true,
            message: res.data?.message ?? 'OTP generated successfully.',
        };
    } catch (err: any) {
        if (err.response) {
            const data = err.response.data;
            return {
                success: false,
                message: data?.message || data?.description || `Failed to send OTP (${err.response.status}).`,
            };
        }
        return {
            success: false,
            message: 'Could not reach the server. Please check your connection and try again.',
        };
    }
}


export async function verifyOtp(email: string, otp: string): Promise<VerifyOtpResult> {
    try {
        const res = await axios.post(`${AUTH_API_BASE}/api/v1/auth/verify-otp`, {
            email,
            otp,
        }, {
            headers: {
                Accept: 'text/plain',
                'Content-Type': 'application/json',
            }
        });

        return {
            success: true,
            message: res.data?.message ?? 'OTP verified successfully.',
            id: res.data?.id,
        };
    } catch (err: any) {
        if (err.response) {
            const data = err.response.data;
            return {
                success: false,
                message: data?.message || data?.description || `Failed to verify OTP (${err.response.status}).`,
            };
        }
        return {
            success: false,
            message: 'Could not reach the server. Please check your connection and try again.',
        };
    }
}