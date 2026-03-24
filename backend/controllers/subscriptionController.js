const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const PaymentGateway = require('../utils/paymentGateway');

const subscribe = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const { paymentMethod } = req.body;

        let subscription = await Subscription.findOne({ clientId });

        if (subscription && (subscription.isActive || subscription.is_active)) {
            return res.status(400).json({ success: false, message: 'You already have an active subscription' });
        }

        const subscriptionPrice = 49.0;

        if (!subscription) {
            subscription = await Subscription.create({
                clientId, plan: 'monthly', price: subscriptionPrice,
                isActive: false, aiAccessEnabled: false
            });
        }

        const paymentResponse = await PaymentGateway.initiatePayment({
            amount: subscriptionPrice, type: 'SUBSCRIPTION',
            metadata: { clientId: clientId.toString(), subscriptionId: subscription._id.toString() }
        });

        const payment = await Payment.create({
            clientId, subscriptionId: subscription._id, amount: subscriptionPrice,
            paymentType: 'SUBSCRIPTION', paymentMethod: paymentMethod || 'UPI',
            status: 'PENDING', paymentGatewayResponse: paymentResponse
        });

        let upiQR = null;
        if (paymentMethod === 'UPI') {
            upiQR = PaymentGateway.generateUpiQR({
                amount: subscriptionPrice, merchantName: 'HomeMate Hub',
                merchantId: 'homemate', transactionNote: `Subscription - ${subscription._id}`
            });
        }

        res.json({
            success: true,
            message: 'Subscription payment initiated',
            data: { subscription, payment, gatewayData: paymentResponse, ...(upiQR && { upiQR }) }
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ success: false, message: 'Error processing subscription' });
    }
};

const getSubscriptionStatus = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const subscription = await Subscription.findOne({ clientId });

        if (!subscription) {
            return res.json({
                success: true,
                data: {
                    hasSubscription: false, aiAccessEnabled: false,
                    message: 'No active subscription. Subscribe for ₹49/month to access AI recommendations.'
                }
            });
        }

        const payment = await Payment.findOne({ subscriptionId: subscription._id });

        let isExpired = false;
        const endDate = subscription.endDate || subscription.end_date;
        if (endDate && new Date() > new Date(endDate)) {
            isExpired = true;
            if (subscription.isActive || subscription.is_active) {
                await Subscription.updateById(subscription._id, { isActive: false, aiAccessEnabled: false });
                subscription.isActive = false;
                subscription.aiAccessEnabled = false;
            }
        }

        res.json({
            success: true,
            data: {
                hasSubscription: true,
                subscription: { ...subscription, payment },
                isExpired,
                daysRemaining: endDate ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
            }
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ success: false, message: 'Error fetching subscription status' });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const subscription = await Subscription.findOne({ clientId });

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'No subscription found' });
        }

        const updated = await Subscription.updateById(subscription._id, { autoRenew: false });

        res.json({
            success: true,
            message: 'Auto-renewal cancelled. Your subscription will remain active until the end date.',
            data: { subscription: updated }
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ success: false, message: 'Error cancelling subscription' });
    }
};

module.exports = { subscribe, getSubscriptionStatus, cancelSubscription };
