const Area = require('../models/Area');

/**
 * Get all areas
 * GET /api/areas
 */
const getAllAreas = async (req, res) => {
    try {
        const areas = await Area.find({ isActive: true })
            .sort({ name: 1 });

        res.json({
            success: true,
            data: { areas }
        });
    } catch (error) {
        console.error('Get areas error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching areas'
        });
    }
};

/**
 * Create new area (admin functionality)
 * POST /api/areas
 */
const createArea = async (req, res) => {
    try {
        const { name, city, pincode } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Area name is required'
            });
        }

        const area = await Area.create({
            name,
            city: city || 'Pune',
            pincode
        });

        res.status(201).json({
            success: true,
            message: 'Area created successfully',
            data: { area }
        });
    } catch (error) {
        // Mongoose duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Area with this name already exists'
            });
        }
        console.error('Create area error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating area'
        });
    }
};

module.exports = {
    getAllAreas,
    createArea
};
