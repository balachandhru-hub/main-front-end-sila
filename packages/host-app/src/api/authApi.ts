import axios from 'axios';
import axiosInstance from './axiosInstance';

async function getClientIpAddress(): Promise<string | undefined> {
    try {
        const res = await axios.get('https://api.ipify.org?format=json');
        return typeof res.data?.ip === 'string' ? res.data.ip : undefined;
    } catch {
        return undefined;
    }
}
export const sendOtp = async (email: string) => {
    try {
        const ipAddress = await getClientIpAddress();
        const response = await axiosInstance.post('/api/v1/auth/send-otp', {
            email,
            ...(ipAddress ? { ipAddress } : {}),
        }, {
            headers: {
                Accept: 'text/plain',
                'Content-Type': 'application/json',
            }
        });
        return response.data;
    } catch (error: any) {
        if (error?.response?.data) {
            const data = error.response.data;
            throw new Error(data?.message || data?.description || `Failed to send OTP (${error.response.status}).`);
        }
        throw new Error('Could not reach the server. Please check your connection and try again.');
    }
};
export const verifyOtp = async (email: string, otp: string) => {
    try {
        const response = await axiosInstance.post('/api/v1/auth/verify-otp', {
            email,
            otp,
        }, {
            headers: {
                Accept: 'text/plain',
                'Content-Type': 'application/json',
            }
        });
        return response.data;
    } catch (error: any) {
        if (error?.response?.data) {
            const data = error.response.data;
            throw new Error(data?.message || data?.description || `Failed to verify OTP (${error.response.status}).`);
        }
        throw new Error('Could not reach the server. Please check your connection and try again.');
    }
};

export const login = async (userName: string, password: string) => {
    try {
        const response = await axiosInstance.post('/api/v1/auth/login', {
            userName,
            password,
        }, {
            headers: {
                Accept: 'text/plain',
                'Content-Type': 'application/json',
            }
        });
        return response.data;
    } catch (error: any) {
        if (error?.response?.data) {
            const data = error.response.data;
            throw new Error(data?.message || data?.description || `Failed to login (${error.response.status}).`);
        }
        throw new Error('Could not reach the server. Please check your connection and try again.');
    }
};