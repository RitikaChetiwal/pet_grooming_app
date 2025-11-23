import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { 
  createShop, 
  getShops, 
  updateShop, 
  deleteShop, 
  getShopById,
  verifyManager
} from '../controllers/shopController.js';

const router = express.Router();

// Get all shops
router.get('/', protect, getShops);

router.get('/:id', protect, getShopById);

router.get('/:id/verify-manager', protect, authorizeRoles('manager'), verifyManager);

// Create new shop (Admin only)
router.post('/', protect, authorizeRoles('admin'), createShop);

// Update shop (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), updateShop);

// Delete shop (Admin only)
router.delete('/:id', protect, authorizeRoles('admin'), deleteShop);

// In shopRoutes.js

export default router;