import { Router } from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { validateService, handleValidationErrors } from '../middleware/validation.js';
import {
    checkShopOwnership,
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    bulkDeleteServices,
    getServiceStats,
    getServicesForUsers
} from '../controllers/serviceController.js';

const router = Router();

router.use((req, res, next) => {
    console.log('Service route accessed:', {
        method: req.method,
        path: req.path,
        user: req.user ? `${req.user.role}: ${req.user._id}` : 'No user'
    });
    next();
});

// Public route for general service browsing (keep this for any public features)
router.get('/public/services', getServicesForUsers);

// Manager-only routes (no changes)
router.get('/:shopId/services/stats', protect, authorizeRoles('manager'), checkShopOwnership, getServiceStats);

router.post('/:shopId/services', protect, authorizeRoles('manager'), checkShopOwnership, validateService, handleValidationErrors, createService);

router.put('/:shopId/services/:serviceId', protect, authorizeRoles('manager'), checkShopOwnership, validateService, handleValidationErrors, updateService);

router.delete('/:shopId/services/bulk', protect, authorizeRoles('manager'), checkShopOwnership, bulkDeleteServices);

router.delete('/:shopId/services/:serviceId', protect, authorizeRoles('manager'), checkShopOwnership, deleteService);

// Routes accessible by both managers and users
router.get('/:shopId/services/:serviceId', protect, authorizeRoles('manager', 'user'), checkShopOwnership, getServiceById);

router.get('/:shopId/services', protect, authorizeRoles('manager', 'user'), checkShopOwnership, getServices);

export default router;