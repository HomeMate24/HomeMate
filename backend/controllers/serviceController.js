const Service = require('../models/Service');

const getAllServices = async (req, res) => {
    try {
        const services = await Service.find({ isActive: true }, { orderBy: ['name', 'asc'] });
        res.json({ success: true, data: { services } });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ success: false, message: 'Error fetching services' });
    }
};

const createService = async (req, res) => {
    try {
        const { name, description, icon, basePrice } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Service name is required' });
        }

        const service = await Service.create({ name, description, icon, basePrice });
        res.status(201).json({ success: true, message: 'Service created successfully', data: { service } });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'Service with this name already exists' });
        }
        console.error('Create service error:', error);
        res.status(500).json({ success: false, message: 'Error creating service' });
    }
};

module.exports = { getAllServices, createService };
