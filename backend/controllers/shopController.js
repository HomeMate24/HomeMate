const Shop = require('../models/Shop');
const Service = require('../models/Service');
const User = require('../models/User');

/**
 * Create a new shop
 * POST /api/shops
 */
const createShop = async (req, res) => {
    try {
        const userId = req.user._id;
        const { shopType, name, serviceId, customService, contactNumber, description, areaId } = req.body;

        // Validation
        if (!shopType || !name || !contactNumber || !description) {
            return res.status(400).json({
                success: false,
                message: 'Shop type, name, contact number, and description are required'
            });
        }

        // If serviceId is provided, verify it exists
        if (serviceId && serviceId !== 'other') {
            const service = await Service.findById(serviceId);
            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }
        }

        // Create shop
        const shop = await Shop.create({
            ownerId: userId,
            shopType,
            name: name.trim(),
            serviceId: (serviceId && serviceId !== 'other') ? serviceId : null,
            customService: customService ? customService.trim() : null,
            contactNumber: contactNumber.trim(),
            description: description.trim(),
            areaId: areaId || null,
        });

        // Populate owner info
        await shop.populate('ownerId', 'name email role');
        if (shop.serviceId) {
            await shop.populate('serviceId', 'name icon');
        }
        if (shop.areaId) {
            await shop.populate('areaId', 'name city');
        }

        res.status(201).json({
            success: true,
            message: 'Shop created successfully',
            data: { shop }
        });
    } catch (error) {
        console.error('Create shop error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating shop'
        });
    }
};

/**
 * Get all shops with optional search
 * GET /api/shops?search=query
 */
const getShops = async (req, res) => {
    try {
        const { search } = req.query;
        let query = { isActive: true };

        // Text search if query provided
        if (search && search.trim().length > 0) {
            query.$text = { $search: search.trim() };
        }

        const shops = await Shop.find(query)
            .populate('ownerId', 'name email role')
            .populate('serviceId', 'name icon')
            .populate('areaId', 'name city')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({
            success: true,
            data: { shops }
        });
    } catch (error) {
        console.error('Get shops error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching shops'
        });
    }
};

/**
 * Get current user's shops
 * GET /api/shops/my-shops
 */
const getMyShops = async (req, res) => {
    try {
        const userId = req.user._id;

        const shops = await Shop.find({ ownerId: userId })
            .populate('serviceId', 'name icon')
            .populate('areaId', 'name city')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: { shops }
        });
    } catch (error) {
        console.error('Get my shops error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your shops'
        });
    }
};

/**
 * Get shop by ID
 * GET /api/shops/:id
 */
const getShopById = async (req, res) => {
    try {
        const { id } = req.params;

        const shop = await Shop.findById(id)
            .populate('ownerId', 'name email role')
            .populate('serviceId', 'name icon')
            .populate('areaId', 'name city')
            .lean();

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        res.json({
            success: true,
            data: { shop }
        });
    } catch (error) {
        console.error('Get shop error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching shop'
        });
    }
};

/**
 * Update shop
 * PUT /api/shops/:id
 */
const updateShop = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { shopType, name, serviceId, customService, contactNumber, description, isActive } = req.body;

        // Find shop
        const shop = await Shop.findById(id);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        // Verify ownership
        if (shop.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own shops'
            });
        }

        // Update fields
        if (shopType) shop.shopType = shopType;
        if (name) shop.name = name.trim();
        if (contactNumber) shop.contactNumber = contactNumber.trim();
        if (description) shop.description = description.trim();
        if (typeof isActive === 'boolean') shop.isActive = isActive;

        // Handle service update
        if (serviceId !== undefined) {
            if (serviceId === 'other') {
                shop.serviceId = null;
                shop.customService = customService ? customService.trim() : null;
            } else {
                shop.serviceId = serviceId;
                shop.customService = null;
            }
        }

        await shop.save();
        await shop.populate('ownerId', 'name email role');
        if (shop.serviceId) {
            await shop.populate('serviceId', 'name icon');
        }

        res.json({
            success: true,
            message: 'Shop updated successfully',
            data: { shop }
        });
    } catch (error) {
        console.error('Update shop error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating shop'
        });
    }
};

/**
 * Delete shop
 * DELETE /api/shops/:id
 */
const deleteShop = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        // Find shop
        const shop = await Shop.findById(id);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        // Verify ownership
        if (shop.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own shops'
            });
        }

        await shop.deleteOne();

        res.json({
            success: true,
            message: 'Shop deleted successfully'
        });
    } catch (error) {
        console.error('Delete shop error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting shop'
        });
    }
};

module.exports = {
    createShop,
    getShops,
    getMyShops,
    getShopById,
    updateShop,
    deleteShop
};
