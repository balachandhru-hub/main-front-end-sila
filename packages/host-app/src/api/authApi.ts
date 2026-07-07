import axiosInstance from './axiosInstance';

export const sendOtp = async (email: string) => {
    try {
        const response = await axiosInstance.post('/api/v1/auth/send-otp', {
            email,
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

export const getTokenClaims = async () => {
    try {
        const response = await axiosInstance.get('/api/v1/tokenclaim');
        return response.data;
    } catch (error: any) {
        if (error?.response?.data) {
            const data = error.response.data;
            throw new Error(data?.message || data?.description || `Failed to fetch token claims (${error.response.status}).`);
        }
        throw new Error('Could not reach the server. Please check your connection and try again.');
    }
};
