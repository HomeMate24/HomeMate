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

export interface Job {
    _id: string;
    serviceId: { _id: string; name: string };
    areaId: { _id: string; name: string };
    description: string;
    scheduledAt: string;
    address: string;
    status: 'PENDING' | 'ACCEPTED' | 'IN_REVIEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
    estimatedPrice: number;
    finalPrice?: number;
    acceptedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    expired: boolean;
    workerId?: {
        _id: string;
        userId: { name: string; phone: string; email?: string };
    };
    clientId?: {
        _id: string;
        userId: { name: string; phone: string; email?: string };
    };
    createdAt: string;
    rating?: {
        _id: string;
        rating: number;
        review?: string;
    };
}

export interface Worker {
    _id: string;
    userId: { _id: string; name: string; phone: string; email: string };
    bio?: string;
    experience?: number;
    hourlyRate?: number;
    averageRating: number;
    totalJobs: number;
    isAvailable: boolean;
    areaIds: { _id: string; name: string }[];
    serviceIds: { _id: string; name: string }[];
    areaSpecificRating?: number;
    areaReviewCount?: number;
}

export interface Area {
    _id: string;
    name: string;
}

export interface Service {
    _id: string;
    name: string;
}

/**
 * Browse workers by area (and optionally service)
 */
export const browseWorkers = async (areaId: string, serviceId?: string) => {
    const params = new URLSearchParams({ areaId });
    if (serviceId) params.append('serviceId', serviceId);
    return apiRequest(`/client/workers?${params.toString()}`);
};

/**
 * Create a new service request / job
 */
export const createJob = async (data: {
    serviceId: string;
    areaId: string;
    description: string;
    address: string;
    estimatedPrice?: number;
    workerId?: string;
    scheduledAt?: string;
}) => {
    return apiRequest('/client/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

/**
 * Get all jobs for the logged-in client
 */
export const getClientJobs = async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return apiRequest(`/client/jobs${params}`);
};

/**
 * Get details of a specific job
 */
export const getJobDetails = async (jobId: string) => {
    return apiRequest(`/client/jobs/${jobId}`);
};

/**
 * Cancel a pending or accepted job
 */
export const cancelJob = async (jobId: string) => {
    return apiRequest(`/client/jobs/${jobId}/cancel`, {
        method: 'POST',
    });
};

/**
 * Rate a completed job
 */
export const rateJob = async (jobId: string, rating: number, review?: string) => {
    return apiRequest(`/client/jobs/${jobId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, review }),
    });
};

/**
 * Get all available areas
 */
export const getAreas = async (): Promise<{ success: boolean; data: { areas: Area[] } }> => {
    return apiRequest('/areas');
};

/**
 * Get all available services
 */
export const getServices = async (): Promise<{ success: boolean; data: { services: Service[] } }> => {
    return apiRequest('/services');
};

/**
 * Get a worker's public profile including all reviews
 */
export const getWorkerPublicProfile = async (workerId: string) => {
    return apiRequest(`/workers/${workerId}/public-profile`);
};

/**
 * Search workers by name
 */
export const searchWorkersByName = async (name: string) => {
    return apiRequest(`/client/workers/search?name=${encodeURIComponent(name)}`);
};
