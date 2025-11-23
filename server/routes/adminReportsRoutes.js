// routes/adminReportsRoutes.js
import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getAdminOverviewStats,
  getRevenueDetails,
  getShopAnalytics,
  getGrowthMetrics,
  getServiceUsage,
  getTopServicesByShop
} from '../controllers/adminReportsController.js';

const router = express.Router();

// All routes require admin role
router.use(protect, authorizeRoles('admin'));

// GET /api/admin/reports/overview - Main dashboard stats
router.get('/overview', getAdminOverviewStats);

// GET /api/admin/reports/revenue - Detailed revenue analysis
router.get('/revenue', getRevenueDetails);

// GET /api/admin/reports/shops - Shop performance analytics
router.get('/shops', getShopAnalytics);

// GET /api/admin/reports/growth - Growth metrics and trends
router.get('/growth', getGrowthMetrics);

// GET /api/admin/reports/services - Service usage (for histogram)
router.get('/services', getServiceUsage);

router.get('/top-services', getTopServicesByShop);

export default router;

