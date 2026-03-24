const Payment = require('../models/Payment');
const Job = require('../models/Job');
const Subscription = require('../models/Subscription');
const PaymentGateway = require('../utils/paymentGateway');

const initiatePayment = async (req, res) => {
    try {
        const { jobId, subscriptionId, amount, paymentMethod } = req.body;
        const clientId = req.user.client._id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        if (!jobId && !subscriptionId) {
            return res.status(400).json({ success: false, message: 'Either jobId or subscriptionId is required' });
        }

        const paymentType = jobId ? 'JOB_PAYMENT' : 'SUBSCRIPTION';

        if (jobId) {
            const job = await Job.findOne({ _id: jobId, clientId });
            if (!job) {
                return res.status(404).json({ success: false, message: 'Job not found' });
            }
        }

        if (subscriptionId) {
            const subscription = await Subscription.findOne({ _id: subscriptionId, clientId });
            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Subscription not found' });
            }
        }

        const paymentResponse = await PaymentGateway.initiatePayment({
            amount, type: paymentType,
            metadata: { clientId: clientId.toString(), jobId, subscriptionId }
        });

        const payment = await Payment.create({
            clientId, jobId: jobId || null, subscriptionId: subscriptionId || null,
            amount, paymentType, paymentMethod, status: 'PENDING', paymentGatewayResponse: paymentResponse
        });

        res.json({ success: true, message: 'Payment initiated', data: { payment, gatewayData: paymentResponse } });
    } catch (error) {
        console.error('Initiate payment error:', error);
        res.status(500).json({ success: false, message: 'Error initiating payment' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { paymentId, transactionId, paymentData } = req.body;
        const clientId = req.user.client._id;

        if (!paymentId || !transactionId) {
            return res.status(400).json({ success: false, message: 'Payment ID and Transaction ID are required' });
        }

        const payment = await Payment.findOne({ _id: paymentId, clientId });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Payment already verified' });
        }

        const verificationResult = await PaymentGateway.verifyPayment(transactionId, paymentData);

        if (!verificationResult.verified) {
            await Payment.save({ ...payment, status: 'FAILED' });
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        const updatedPayment = await Payment.save({
            ...payment,
            status: 'COMPLETED',
            transactionId,
            completedAt: new Date()
        });

        if (payment.subscription_id || payment.subscriptionId) {
            const subId = payment.subscription_id || payment.subscriptionId;
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            await Subscription.updateById(subId, { isActive: true, aiAccessEnabled: true, startDate, endDate });
        }

        if (payment.job_id || payment.jobId) {
            await Job.updateById(payment.job_id || payment.jobId, { finalPrice: payment.amount });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                payment: updatedPayment,
                ...((payment.subscription_id || payment.subscriptionId) && { aiAccessEnabled: true })
            }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, message: 'Error verifying payment' });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const payments = await Payment.find({ clientId });

        // Populate each payment with job and subscription data
        for (const payment of payments) {
            if (payment.job_id || payment.jobId) {
                const job = await Job.findById(payment.job_id || payment.jobId);
                if (job) {
                    const Service = require('../models/Service');
                    const service = await Service.findById(job.service_id || job.serviceId);
                    if (service) job.serviceId = service;
                    payment.jobId = job;
                }
            }
            if (payment.subscription_id || payment.subscriptionId) {
                const sub = await Subscription.findById(payment.subscription_id || payment.subscriptionId);
                if (sub) payment.subscriptionId = sub;
            }
        }

        res.json({ success: true, data: { payments } });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment history' });
    }
};

module.exports = { initiatePayment, verifyPayment, getPaymentHistory };
