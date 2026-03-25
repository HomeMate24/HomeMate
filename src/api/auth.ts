// API Base URL - in production, use relative /api (Vercel proxy rewrites to Render backend)
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('jwt-token');
};

// Helper function to make authenticated requests
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
};

// ─── OTP ────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to the given email
 */
export const sendOtp = async (email: string) => {
    return apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

/**
 * Verify the OTP and receive an otpVerifiedToken
 */
export const verifyOtp = async (email: string, otp: string) => {
    return apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
    });
};

// ─── SIGNUP ─────────────────────────────────────────────────────

// Provider signup
export const signupProvider = async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    description?: string;
    otpVerifiedToken: string;
}) => {
    return apiRequest('/auth/signup/provider', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Client signup
export const signupClient = async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address?: string;
    areaId?: string;
    otpVerifiedToken: string;
}) => {
    return apiRequest('/auth/signup/client', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Worker signup
export const signupWorker = async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    bio?: string;
    experience?: number;
    hourlyRate?: number;
    areaIds: string[];
    serviceIds: string[];
    otpVerifiedToken: string;
}) => {
    return apiRequest('/auth/signup/worker', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// ─── LOGIN ──────────────────────────────────────────────────────

// Login
export const login = async (email: string, password: string) => {
    const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    // Store token
    if (response.data?.token) {
        localStorage.setItem('jwt-token', response.data.token);
    }

    return response;
};

// ─── GOOGLE AUTH ────────────────────────────────────────────────

/**
 * Authenticate with a Google ID token
 */
export const googleAuth = async (credential: string, role: string) => {
    const response = await apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential, role }),
    });

    if (response.data?.token) {
        localStorage.setItem('jwt-token', response.data.token);
    }

    return response;
};

// ─── OTHER ──────────────────────────────────────────────────────

// Logout
export const logout = async () => {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
        localStorage.removeItem('jwt-token');
        localStorage.removeItem('homemate-authenticated');
        localStorage.removeItem('homemate-user-type');
    }
};

// Get current user
export const getCurrentUser = async () => {
    return apiRequest('/auth/me');
};
