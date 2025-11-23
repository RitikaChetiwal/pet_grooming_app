import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  createUserPayment,
  getUserPaymentHistory,
  getPaymentById,
  updatePaymentStatus
} from '../controllers/userPaymentController.js';

const router = express.Router();

router.get('/test', (_req, res) => res.json({ message: 'Payment routes are accessible' }));

router.post('/', protect, createUserPayment);
router.get('/history', protect, getUserPaymentHistory);
router.get('/:paymentId', protect, getPaymentById);
router.patch('/:paymentId/status', protect, authorizeRoles('manager', 'admin'), updatePaymentStatus);

export default router;
