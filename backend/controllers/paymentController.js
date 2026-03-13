const Payment = require('../models/Payment');
const Job = require('../models/Job');
const Subscription = require('../models/Subscription');
const PaymentGateway = require('../utils/paymentGateway');

/**
 * Initiate payment
 * POST /api/payments/initiate
 */
const initiatePayment = async (req, res) => {
    try {
        const { jobId, subscriptionId, amount, paymentMethod } = req.body;
        const clientId = req.user.client._id;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        if (!jobId && !subscriptionId) {
            return res.status(400).json({
                success: false,
                message: 'Either jobId or subscriptionId is required'
            });
        }

        // Determine payment type
        const paymentType = jobId ? 'JOB_PAYMENT' : 'SUBSCRIPTION';

        // Verify ownership
        if (jobId) {
            const job = await Job.findOne({
                _id: jobId,
                clientId
            });

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }
        }

        if (subscriptionId) {
            const subscription = await Subscription.findOne({
                _id: subscriptionId,
                clientId
            });

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found'
                });
            }
        }

        // Initiate payment with gateway
        const paymentResponse = await PaymentGateway.initiatePayment({
            amount,
            type: paymentType,
            metadata: {
                clientId: clientId.toString(),
                jobId,
                subscriptionId
            }
        });

        // Create payment record
        const payment = await Payment.create({
            clientId,
            jobId: jobId || null,
            subscriptionId: subscriptionId || null,
            amount,
            paymentType,
            paymentMethod,
            status: 'PENDING',
            paymentGatewayResponse: paymentResponse
        });

        res.json({
            success: true,
            message: 'Payment initiated',
            data: {
                payment,
                gatewayData: paymentResponse
            }
        });
    } catch (error) {
        console.error('Initiate payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating payment'
        });
    }
};

/**
 * Verify payment completion
 * POST /api/payments/verify
 */
const verifyPayment = async (req, res) => {
    try {
        const { paymentId, transactionId, paymentData } = req.body;
        const clientId = req.user.client._id;

        if (!paymentId || !transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID and Transaction ID are required'
            });
        }

        // Get payment record
        const payment = await Payment.findOne({
            _id: paymentId,
            clientId
        })
            .populate('jobId')
            .populate('subscriptionId');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Payment already verified'
            });
        }

        // Verify with payment gateway
        const verificationResult = await PaymentGateway.verifyPayment(transactionId, paymentData);

        if (!verificationResult.verified) {
            payment.status = 'FAILED';
            await payment.save();

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update payment status
        payment.status = 'COMPLETED';
        payment.transactionId = transactionId;
        payment.completedAt = new Date();
        await payment.save();

        // If subscription payment, activate AI access
        if (payment.subscriptionId) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // 30 days from now

            await Subscription.findByIdAndUpdate(payment.subscriptionId, {
                isActive: true,
                aiAccessEnabled: true,
                startDate,
                endDate
            });
        }

        // If job payment, update job with final price
        if (payment.jobId) {
            await Job.findByIdAndUpdate(payment.jobId, {
                finalPrice: payment.amount
            });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                payment,
                ...(payment.subscriptionId && { aiAccessEnabled: true })
            }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment'
        });
    }
};

/**
 * Get payment history
 * GET /api/payments/history
 */
const getPaymentHistory = async (req, res) => {
    try {
        const clientId = req.user.client._id;

        const payments = await Payment.find({ clientId })
            .populate({
                path: 'jobId',
                populate: { path: 'serviceId' }
            })
            .populate('subscriptionId')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { payments }
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment history'
        });
    }
};

module.exports = {
    initiatePayment,
    verifyPayment,
    getPaymentHistory
};
