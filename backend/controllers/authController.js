const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');
const Provider = require('../models/Provider');
const OtpCode = require('../models/OtpCode');

// ─── Email transporter (lazy-init) ─────────────────────────────
let _transporter = null;
const getTransporter = () => {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }
    return _transporter;
};

// ─── Helper: verify OTP token ──────────────────────────────────
const verifyOtpToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
};

// ═════════════════════════════════════════════════════════════════
// OTP ENDPOINTS
// ═════════════════════════════════════════════════════════════════

/**
 * Send OTP to email
 * POST /api/auth/send-otp
 */
const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // Remove any old OTPs for this email
        await OtpCode.deleteMany({ email: email.toLowerCase() });

        // Save new OTP
        await OtpCode.create({
            email: email.toLowerCase(),
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        // Send email
        const transporter = getTransporter();
        await transporter.sendMail({
            from: `"HomeMate" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: 'Your HomeMate Verification Code',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a1a;border-radius:16px;color:#fff">
                    <h2 style="text-align:center;color:#f59e0b;margin-bottom:8px">HomeMate</h2>
                    <p style="text-align:center;color:#aaa;margin-bottom:24px">Verify your email address</p>
                    <div style="background:#262626;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                        <p style="color:#aaa;margin-bottom:8px;font-size:14px">Your verification code is:</p>
                        <h1 style="letter-spacing:12px;font-size:36px;color:#f59e0b;margin:0">${otp}</h1>
                    </div>
                    <p style="text-align:center;color:#888;font-size:13px">This code expires in 5 minutes.<br>If you didn't request this, ignore this email.</p>
                </div>
            `,
        });

        res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP. Check your email and try again.' });
    }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const record = await OtpCode.findOne({
            email: email.toLowerCase(),
            otp,
            expiresAt: { $gt: new Date() },
        });

        if (!record) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Delete the used OTP
        await OtpCode.deleteMany({ email: email.toLowerCase() });

        // Issue a short-lived token proving this email was verified
        const otpVerifiedToken = jwt.sign(
            { email: email.toLowerCase(), purpose: 'otp-verified' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.json({ success: true, message: 'Email verified', data: { otpVerifiedToken } });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
};

// ═════════════════════════════════════════════════════════════════
// SIGNUP ENDPOINTS (now require OTP verification)
// ═════════════════════════════════════════════════════════════════

/**
 * Client Signup
 * POST /api/auth/signup/client
 */
const signupClient = async (req, res) => {
    try {
        const { email, password, name, phone, address, areaId, otpVerifiedToken } = req.body;

        // Validation
        if (!email || !password || !name || !phone) {
            return res.status(400).json({ success: false, message: 'Email, password, name, and phone are required' });
        }

        // Verify OTP token
        const verified = verifyOtpToken(otpVerifiedToken);
        if (!verified || verified.email !== email.toLowerCase() || verified.purpose !== 'otp-verified') {
            return res.status(400).json({ success: false, message: 'Email not verified. Please verify your email first.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email or phone already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ email, password: hashedPassword, name, phone, role: 'CLIENT' });

        const client = await Client.create({ userId: user._id, address, areaId: areaId || null });
        await client.populate('areaId');

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Client registered successfully',
            data: { user: { ...userResponse, client }, token }
        });
    } catch (error) {
        console.error('Client signup error:', error);
        res.status(500).json({ success: false, message: 'Error creating client account' });
    }
};

/**
 * Worker Signup
 * POST /api/auth/signup/worker
 */
const signupWorker = async (req, res) => {
    try {
        const { email, password, name, phone, bio, experience, hourlyRate, areaIds, serviceIds, otpVerifiedToken } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({ success: false, message: 'Email, password, name, and phone are required' });
        }

        // Verify OTP token
        const verified = verifyOtpToken(otpVerifiedToken);
        if (!verified || verified.email !== email.toLowerCase() || verified.purpose !== 'otp-verified') {
            return res.status(400).json({ success: false, message: 'Email not verified. Please verify your email first.' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email or phone already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, name, phone, role: 'WORKER' });

        const worker = await Worker.create({
            userId: user._id, bio, experience, hourlyRate,
            areaIds: areaIds || [], serviceIds: serviceIds || []
        });
        await worker.populate('areaIds serviceIds');

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Worker registered successfully',
            data: { user: { ...userResponse, worker }, token }
        });
    } catch (error) {
        console.error('Worker signup error:', error);
        res.status(500).json({ success: false, message: 'Error creating worker account' });
    }
};

/**
 * Provider Signup
 * POST /api/auth/signup/provider
 */
const signupProvider = async (req, res) => {
    try {
        const { email, password, name, phone, businessName, businessAddress, businessPhone, description, otpVerifiedToken } = req.body;

        if (!email || !password || !name || !phone || !businessName) {
            return res.status(400).json({ success: false, message: 'Email, password, name, phone, and business name are required' });
        }

        // Verify OTP token
        const verified = verifyOtpToken(otpVerifiedToken);
        if (!verified || verified.email !== email.toLowerCase() || verified.purpose !== 'otp-verified') {
            return res.status(400).json({ success: false, message: 'Email not verified. Please verify your email first.' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email or phone already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, name, phone, role: 'PROVIDER' });

        const provider = await Provider.create({ userId: user._id, businessName, businessAddress, businessPhone, description });

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Provider registered successfully',
            data: { user: { ...userResponse, provider }, token }
        });
    } catch (error) {
        console.error('Provider signup error:', error);
        res.status(500).json({ success: false, message: 'Error creating provider account' });
    }
};

// ═════════════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════════════

/**
 * Login
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Google-only users can't login with password
        if (!user.password) {
            return res.status(401).json({ success: false, message: 'This account uses Google Sign-In. Please click "Sign in with Google".' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Get role-specific data
        let roleData = null;
        if (user.role === 'CLIENT') {
            roleData = await Client.findOne({ userId: user._id }).populate('areaId').lean();
            const Subscription = require('../models/Subscription');
            const subscription = await Subscription.findOne({ clientId: roleData._id });
            if (subscription) roleData.subscription = subscription;
        } else if (user.role === 'WORKER') {
            roleData = await Worker.findOne({ userId: user._id }).populate('areaIds serviceIds').lean();
        } else if (user.role === 'PROVIDER') {
            roleData = await Provider.findOne({ userId: user._id }).lean();
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        if (user.role === 'CLIENT') userResponse.client = roleData;
        else if (user.role === 'WORKER') userResponse.worker = roleData;
        else if (user.role === 'PROVIDER') userResponse.provider = roleData;

        res.json({ success: true, message: 'Login successful', data: { user: userResponse, token } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Error during login' });
    }
};

// ═════════════════════════════════════════════════════════════════
// GOOGLE AUTH
// ═════════════════════════════════════════════════════════════════

/**
 * Google OAuth
 * POST /api/auth/google
 */
const googleAuth = async (req, res) => {
    try {
        const { credential, role } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }

        // Verify the Google ID token
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Could not get email from Google account' });
        }

        // Check if user exists by googleId or email
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            // Existing user — link Google if not already linked
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // New user — create account
            const selectedRole = (role || 'CLIENT').toUpperCase();
            if (!['CLIENT', 'WORKER', 'PROVIDER'].includes(selectedRole)) {
                return res.status(400).json({ success: false, message: 'Invalid role' });
            }

            // Generate a unique phone placeholder (Google doesn't provide phone)
            const uniquePhone = `G${Date.now()}`;

            user = await User.create({
                email,
                name: name || email.split('@')[0],
                phone: uniquePhone,
                role: selectedRole,
                googleId,
            });

            // Create role-specific profile
            if (selectedRole === 'CLIENT') {
                await Client.create({ userId: user._id });
            } else if (selectedRole === 'WORKER') {
                await Worker.create({ userId: user._id, areaIds: [], serviceIds: [] });
            } else if (selectedRole === 'PROVIDER') {
                await Provider.create({ userId: user._id, businessName: name || 'My Business' });
            }
        }

        // Get role-specific data
        let roleData = null;
        if (user.role === 'CLIENT') {
            roleData = await Client.findOne({ userId: user._id }).populate('areaId').lean();
        } else if (user.role === 'WORKER') {
            roleData = await Worker.findOne({ userId: user._id }).populate('areaIds serviceIds').lean();
        } else if (user.role === 'PROVIDER') {
            roleData = await Provider.findOne({ userId: user._id }).lean();
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        if (user.role === 'CLIENT') userResponse.client = roleData;
        else if (user.role === 'WORKER') userResponse.worker = roleData;
        else if (user.role === 'PROVIDER') userResponse.provider = roleData;

        res.json({
            success: true,
            message: user.createdAt === user.updatedAt ? 'Account created with Google' : 'Login successful',
            data: { user: userResponse, token }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ success: false, message: 'Google authentication failed' });
    }
};

// ═════════════════════════════════════════════════════════════════
// OTHER
// ═════════════════════════════════════════════════════════════════

/**
 * Get Current User
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
    try {
        const user = { ...req.user };
        delete user.password;
        res.json({ success: true, data: { user } });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user data' });
    }
};

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
    sendOtp,
    verifyOtp,
    signupClient,
    signupWorker,
    signupProvider,
    login,
    googleAuth,
    getCurrentUser,
    logout
};
