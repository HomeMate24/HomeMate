// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('jwt-token');
};

// Helper function to make authenticated requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
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

// Get provider dashboard stats
export const getDashboardStats = async () => {
    return apiRequest('/provider/dashboard');
};

// Get provider's workers
export const getWorkers = async () => {
    return apiRequest('/provider/workers');
};

// Add new worker
export const addWorker = async (data: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    bio?: string;
    experience?: number;
    hourlyRate?: number;
    areaIds?: string[];
    serviceIds?: string[];
}) => {
    return apiRequest('/provider/workers', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Get provider bookings
export const getBookings = async () => {
    return apiRequest('/provider/bookings');
};

// Update worker details
export const updateWorker = async (workerId: string, data: {
    bio?: string;
    experience?: number;
    hourlyRate?: number;
    areaIds?: string[];
    serviceIds?: string[];
}) => {
    return apiRequest(`/provider/workers/${workerId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// Remove worker from team
export const removeWorker = async (workerId: string) => {
    return apiRequest(`/provider/workers/${workerId}`, {
        method: 'DELETE',
    });
};

// Update worker status/availability
export const updateWorkerStatus = async (workerId: string, isAvailable: boolean) => {
    return apiRequest(`/provider/workers/${workerId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
    });
};

// Cancel a booking
export const cancelBooking = async (jobId: string) => {
    return apiRequest(`/provider/bookings/${jobId}/cancel`, {
        method: 'POST',
    });
};
