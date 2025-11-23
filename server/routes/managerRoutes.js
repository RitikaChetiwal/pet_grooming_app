import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  createManager,
  getManagers,
  updateManager,
  deleteManager,
  getManagerById,
  getManagerStaff,
  getManagerPets,
  getManagerStats,
  getManagerPayments,
  listManagerAppointments,
  updateAppointment,
  recordAppointmentPayment,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  getStaffMemberById,
} from '../controllers/managerController.js';

const router = express.Router();

// Create new manager (Admin only)
router.post('/', protect, authorizeRoles('admin'), createManager);
router.get('/', protect, authorizeRoles('admin'), getManagers);
router.get('/:id', protect, authorizeRoles('admin'), getManagerById);
router.put('/:id', protect, authorizeRoles('admin'), updateManager);
router.delete('/:id', protect, authorizeRoles('admin'), deleteManager);


export const managerRouter = express.Router();
// managerRouter.get('/appointments', protect, authorizeRoles('manager'), getManagerAppointments);
managerRouter.get('/staff', protect, authorizeRoles('manager'), getManagerStaff);
managerRouter.get('/pets', protect, authorizeRoles('manager'), getManagerPets);
managerRouter.get('/stats', protect, authorizeRoles('manager'), getManagerStats);

managerRouter.get('/payments', protect, authorizeRoles('manager'), getManagerPayments);

managerRouter.get('/appointments', protect, authorizeRoles('manager'), listManagerAppointments);
managerRouter.put('/appointments/:petId', protect, authorizeRoles('manager'), updateAppointment);
managerRouter.post('/appointments/:petId/payment', protect, authorizeRoles('manager'), recordAppointmentPayment);

managerRouter.post('/staff', protect, authorizeRoles('manager'), createStaffMember);
managerRouter.put('/staff/:id', protect, authorizeRoles('manager'), updateStaffMember);
managerRouter.delete('/staff/:id', protect, authorizeRoles('manager'), deleteStaffMember);
managerRouter.get('/staff/:id', protect, authorizeRoles('manager'), getStaffMemberById);

export default router;