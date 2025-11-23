import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { createUser, getUsers, updateUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', protect, authorizeRoles('admin'), getUsers);

// Create new user (Admin only)
router.post('/', protect, authorizeRoles('admin'), createUser);

// Update user (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), updateUser);

// Delete user (Admin only)
router.delete('/:id', protect, authorizeRoles('admin'), deleteUser);

export default router;