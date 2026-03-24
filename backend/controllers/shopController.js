const Shop = require('../models/Shop');
const Service = require('../models/Service');
const User = require('../models/User');

const createShop = async (req, res) => {
    try {
        const userId = req.user._id;
        const { shopType, name, serviceId, customService, contactNumber, description, areaId } = req.body;

        if (!shopType || !name || !contactNumber || !description) {
            return res.status(400).json({ success: false, message: 'Shop type, name, contact number, and description are required' });
        }

        if (serviceId && serviceId !== 'other') {
            const service = await Service.findById(serviceId);
            if (!service) {
                return res.status(404).json({ success: false, message: 'Service not found' });
            }
        }

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

        await Shop.populate(shop, ['ownerId', 'serviceId', 'areaId']);

        res.status(201).json({ success: true, message: 'Shop created successfully', data: { shop } });
    } catch (error) {
        console.error('Create shop error:', error);
        res.status(500).json({ success: false, message: 'Error creating shop' });
    }
};

const getShops = async (req, res) => {
    try {
        const { search } = req.query;
        const filters = { isActive: true };
        if (search && search.trim().length > 0) {
            filters.search = search.trim();
        }

        const shops = await Shop.find(filters, { limit: 50 });

        // Populate each shop
        for (const shop of shops) {
            await Shop.populate(shop, ['ownerId', 'serviceId', 'areaId']);
        }

        res.json({ success: true, data: { shops } });
    } catch (error) {
        console.error('Get shops error:', error);
        res.status(500).json({ success: false, message: 'Error fetching shops' });
    }
};

const getMyShops = async (req, res) => {
    try {
        const userId = req.user._id;
        const shops = await Shop.find({ ownerId: userId });

        for (const shop of shops) {
            await Shop.populate(shop, ['serviceId', 'areaId']);
        }

        res.json({ success: true, data: { shops } });
    } catch (error) {
        console.error('Get my shops error:', error);
        res.status(500).json({ success: false, message: 'Error fetching your shops' });
    }
};

const getShopById = async (req, res) => {
    try {
        const { id } = req.params;
        const shop = await Shop.findById(id);

        if (!shop) {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }

        await Shop.populate(shop, ['ownerId', 'serviceId', 'areaId']);

        res.json({ success: true, data: { shop } });
    } catch (error) {
        console.error('Get shop error:', error);
        res.status(500).json({ success: false, message: 'Error fetching shop' });
    }
};

const updateShop = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { shopType, name, serviceId, customService, contactNumber, description, isActive } = req.body;

        const shop = await Shop.findById(id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }

        if ((shop.owner_id || shop.ownerId).toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'You can only update your own shops' });
        }

        const updates = {};
        if (shopType) updates.shopType = shopType;
        if (name) updates.name = name.trim();
        if (contactNumber) updates.contactNumber = contactNumber.trim();
        if (description) updates.description = description.trim();
        if (typeof isActive === 'boolean') updates.isActive = isActive;

        if (serviceId !== undefined) {
            if (serviceId === 'other') {
                updates.serviceId = null;
                updates.customService = customService ? customService.trim() : null;
            } else {
                updates.serviceId = serviceId;
                updates.customService = null;
            }
        }

        const updated = await Shop.updateById(id, updates);
        await Shop.populate(updated, ['ownerId', 'serviceId', 'areaId']);

        res.json({ success: true, message: 'Shop updated successfully', data: { shop: updated } });
    } catch (error) {
        console.error('Update shop error:', error);
        res.status(500).json({ success: false, message: 'Error updating shop' });
    }
};

const deleteShop = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const shop = await Shop.findById(id);
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }

        if ((shop.owner_id || shop.ownerId).toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'You can only delete your own shops' });
        }

        await Shop.deleteById(id);

        res.json({ success: true, message: 'Shop deleted successfully' });
    } catch (error) {
        console.error('Delete shop error:', error);
        res.status(500).json({ success: false, message: 'Error deleting shop' });
    }
};

module.exports = { createShop, getShops, getMyShops, getShopById, updateShop, deleteShop };
