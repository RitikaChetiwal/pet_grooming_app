// routes/petRoutes.js - FIXED VERSION
import express from 'express';
import {
  createPet,
  getPets,
  updatePet,
  deletePet
} from '../controllers/petController.js';

import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { rateLimiter, logRequest, sanitizeInput, validatePet, validatePetUpdate } from '../middleware/validation.js';

const router = express.Router();

// Apply global middlewares to all pet routes
router.use(protect); // Authentication required for all routes
router.use(authorizeRoles('manager', 'user')); // Authorization check
router.use(rateLimiter); // Rate limiting
router.use(logRequest); // Request logging
router.use(sanitizeInput); // Input sanitization

// POST /pets - Create a new pet
router.post('/',
  validatePet, // Validate pet data
  createPet
);

// GET /pets - Get all pets (with optional filtering)
router.get('/',
  getPets
);

// PUT /pets/:id - Update a pet
router.put('/:id',
  validatePetUpdate, // Validate update data
  updatePet // Remove checkPetOwnership middleware - handle ownership in controller
);

// DELETE /pets/:id - Delete a pet
router.delete('/:id',
  deletePet
);

export default router;