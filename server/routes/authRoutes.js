// routes/authRoutes.js
import express from 'express';
import { login, createUser } from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public login
router.post('/login', login);

// Admin-only user creation
router.post('/createUser', protect, authorizeRoles('admin'), createUser);

export default router;