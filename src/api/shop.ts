import { apiRequest } from './auth';

export interface Shop {
    _id: string;
    ownerId: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    shopType: 'individual' | 'company';
    name: string;
    serviceId?: {
        _id: string;
        name: string;
        icon?: string;
    };
    customService?: string;
    areaId?: {
        _id: string;
        name: string;
        city?: string;
    };
    contactNumber: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateShopData {
    shopType: 'individual' | 'company';
    name: string;
    serviceId?: string | null;
    customService?: string | null;
    areaId?: string | null;
    contactNumber: string;
    description: string;
}

/**
 * Create a new shop
 */
export const createShop = async (data: CreateShopData): Promise<{ shop: Shop }> => {
    const response = await apiRequest('/shops', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return response.data;
};

/**
 * Get all shops with optional search
 */
export const getShops = async (searchQuery?: string): Promise<{ shops: Shop[] }> => {
    const url = searchQuery ? `/shops?search=${encodeURIComponent(searchQuery)}` : '/shops';
    const response = await apiRequest(url);
    return response.data;
};

/**
 * Get current user's shops
 */
export const getMyShops = async (): Promise<{ shops: Shop[] }> => {
    const response = await apiRequest('/shops/my-shops');
    return response.data;
};

/**
 * Get shop by ID
 */
export const getShopById = async (id: string): Promise<{ shop: Shop }> => {
    const response = await apiRequest(`/shops/${id}`);
    return response.data;
};

/**
 * Update a shop
 */
export const updateShop = async (id: string, data: Partial<CreateShopData>): Promise<{ shop: Shop }> => {
    const response = await apiRequest(`/shops/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return response.data;
};

/**
 * Delete a shop
 */
export const deleteShop = async (id: string): Promise<void> => {
    await apiRequest(`/shops/${id}`, {
        method: 'DELETE',
    });
};

/**
 * Get all services for dropdown
 */
export const getServices = async (): Promise<any> => {
    const response = await apiRequest('/services');
    return response.data;
};
