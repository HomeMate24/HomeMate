const express = require('express');
const { authenticateToken, requireRole, checkAIAccess } = require('../middleware/auth');
const { authLimiter, aiLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Import controllers
const authController = require('../controllers/authController');
const areaController = require('../controllers/areaController');
const serviceController = require('../controllers/serviceController');
const workerController = require('../controllers/workerController');
const clientController = require('../controllers/clientController');
const paymentController = require('../controllers/paymentController');
const subscriptionController = require('../controllers/subscriptionController');
const providerController = require('../controllers/providerController');
const chatController = require('../controllers/chatController');
const shopController = require('../controllers/shopController');
const teamRequestController = require('../controllers/teamRequestController');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'HomeMate Hub API is running',
        timestamp: new Date()
    });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================
router.post('/auth/send-otp', authLimiter, authController.sendOtp);
router.post('/auth/verify-otp', authLimiter, authController.verifyOtp);
router.post('/auth/signup/client', authLimiter, authController.signupClient);
router.post('/auth/signup/worker', authLimiter, authController.signupWorker);
router.post('/auth/signup/provider', authLimiter, authController.signupProvider);
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/google', authLimiter, authController.googleAuth);
router.post('/auth/logout', authenticateToken, authController.logout);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);

// ============================================
// AREA & SERVICE ROUTES (Public read, authenticated write)
// ============================================
router.get('/areas', areaController.getAllAreas);
router.post('/areas', authenticateToken, areaController.createArea);

router.get('/services', serviceController.getAllServices);
router.post('/services', authenticateToken, serviceController.createService);

// ============================================
// SHARED AUTHENTICATED ROUTES (Any logged-in user)
// ============================================
router.get('/workers/:workerId/public-profile', authenticateToken, clientController.getWorkerPublicProfile);

// ============================================
// WORKER ROUTES (Worker role required)
// ============================================
const workerRoutes = express.Router();
workerRoutes.use(authenticateToken, requireRole('WORKER'));

workerRoutes.get('/jobs', workerController.getWorkerJobs);
workerRoutes.post('/jobs/:jobId/accept', workerController.acceptJob);
workerRoutes.post('/jobs/:jobId/reject', workerController.rejectJob);
workerRoutes.post('/jobs/:jobId/cancel', workerController.cancelWorkerJob);
workerRoutes.patch('/jobs/:jobId/status', workerController.updateJobStatus);
workerRoutes.get('/ratings', workerController.getWorkerRatings);
workerRoutes.get('/earnings', workerController.getEarnings);
workerRoutes.get('/profile', workerController.getProfile);
workerRoutes.patch('/profile', workerController.updateProfile);
workerRoutes.patch('/areas', workerController.updateAreas);
workerRoutes.patch('/services', workerController.updateServices);

router.use('/workers', workerRoutes);

// ============================================
// PROVIDER ROUTES (Provider role required)
// ============================================
const providerRoutes = express.Router();
providerRoutes.use(authenticateToken, requireRole('PROVIDER'));

providerRoutes.get('/dashboard', providerController.getDashboardStats);
providerRoutes.get('/workers', providerController.getWorkers);
providerRoutes.post('/workers', providerController.addWorker);
providerRoutes.put('/workers/:workerId', providerController.updateWorker);
providerRoutes.delete('/workers/:workerId', providerController.removeWorker);
providerRoutes.patch('/workers/:workerId/status', providerController.updateWorkerStatus);
providerRoutes.get('/bookings', providerController.getBookings);
providerRoutes.post('/bookings/:jobId/cancel', providerController.cancelBooking);

router.use('/provider', providerRoutes);

// ============================================
// CLIENT ROUTES (Client role required)
// ============================================
const clientRoutes = express.Router();
clientRoutes.use(authenticateToken, requireRole('CLIENT'));

// Worker browsing & search
clientRoutes.get('/workers/search', clientController.searchWorkersByName);
clientRoutes.get('/workers', clientController.browseWorkers);
clientRoutes.get('/workers/:workerId/profile', clientController.getWorkerPublicProfile);

// Job management
clientRoutes.post('/jobs', clientController.createJob);
clientRoutes.get('/jobs', clientController.getClientJobs);
clientRoutes.get('/jobs/:jobId', clientController.getJobDetails);
clientRoutes.post('/jobs/:jobId/cancel', clientController.cancelJob);
clientRoutes.post('/jobs/:jobId/rate', clientController.rateJob);

router.use('/client', clientRoutes);

// ============================================
// PAYMENT ROUTES (Client role required)
// ============================================
const paymentRoutes = express.Router();
paymentRoutes.use(authenticateToken, requireRole('CLIENT'));

paymentRoutes.post('/initiate', paymentController.initiatePayment);
paymentRoutes.post('/verify', paymentController.verifyPayment);
paymentRoutes.get('/history', paymentController.getPaymentHistory);

router.use('/payments', paymentRoutes);

// ============================================
// SUBSCRIPTION ROUTES (Client role required)
// ============================================
const subscriptionRoutes = express.Router();
subscriptionRoutes.use(authenticateToken, requireRole('CLIENT'));

subscriptionRoutes.post('/subscribe', subscriptionController.subscribe);
subscriptionRoutes.get('/status', subscriptionController.getSubscriptionStatus);
subscriptionRoutes.post('/cancel', subscriptionController.cancelSubscription);

router.use('/subscriptions', subscriptionRoutes);

// ============================================
// CHAT ROUTES (All authenticated users)
// ============================================
const chatRoutes = express.Router();
chatRoutes.use(authenticateToken);

chatRoutes.get('/search', chatController.searchUsers);
chatRoutes.get('/conversations', chatController.getConversations);
chatRoutes.post('/conversations', chatController.createConversation);
chatRoutes.get('/conversations/:conversationId/messages', chatController.getMessages);
chatRoutes.post('/conversations/:conversationId/read', chatController.markAsRead);
chatRoutes.post('/conversations/:conversationId/status', chatController.updateConversationStatus);

router.use('/chat', chatRoutes);

// ============================================
// SHOP ROUTES (Authenticated users can view, only workers can create/edit)
// ============================================
const shopRoutes = express.Router();
shopRoutes.use(authenticateToken);

// Public shop routes (all authenticated users can view)
shopRoutes.get('/', shopController.getShops);
shopRoutes.get('/my-shops', shopController.getMyShops);
shopRoutes.get('/:id', shopController.getShopById);

// Worker-only shop routes
shopRoutes.post('/', requireRole('WORKER'), shopController.createShop);
shopRoutes.put('/:id', requireRole('WORKER'), shopController.updateShop);
shopRoutes.delete('/:id', requireRole('WORKER'), shopController.deleteShop);

router.use('/shops', shopRoutes);

// ============================================
// TEAM REQUEST ROUTES
// ============================================
const teamRequestRoutes = express.Router();
teamRequestRoutes.use(authenticateToken);

// Provider sends invitations
teamRequestRoutes.post('/send', requireRole('PROVIDER'), teamRequestController.sendTeamRequest);

// Workers/Clients receive and respond to invitations (no specific role required - handled in controller)
teamRequestRoutes.get('/pending', teamRequestController.getPendingRequests);
teamRequestRoutes.post('/:requestId/accept', teamRequestController.acceptTeamRequest);
teamRequestRoutes.post('/:requestId/reject', teamRequestController.rejectTeamRequest);

// Providers view sent invitations
teamRequestRoutes.get('/sent', requireRole('PROVIDER'), teamRequestController.getSentRequests);

router.use('/team-requests', teamRequestRoutes);

// ============================================
// 404 Handler
// ============================================
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

module.exports = router;
