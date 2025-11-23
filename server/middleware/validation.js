// middleware/validation.js
import Pet from '../models/Pet.js';
import { body, validationResult, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'isomorphic-dompurify';

// ---------------------- DOMPurify Setup ----------------------
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Recursively sanitize all string values in an object or array
 */
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
};

/**
 * Middleware to sanitize req.body
 */
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// ---------------------- Service Validation ----------------------
export const validateService = [
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Service name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&(),.']+$/).withMessage('Service name contains invalid characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Service description is required')
    .isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0.01, max: 100000 }).withMessage('Price must be between ₹0.01 and ₹100,000')
    .custom(value => {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) throw new Error('Price cannot have more than 2 decimal places');
      return true;
    }),

  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes (8 hours)'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['basic', 'premium', 'luxury']).withMessage('Category must be either basic, premium, or luxury'),

  body('availability')
    .optional()
    .isObject().withMessage('Availability must be an object')
    .custom((availability) => {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const [day, isAvailable] of Object.entries(availability)) {
        if (!validDays.includes(day.toLowerCase())) throw new Error(`Invalid day: ${day}`);
        if (typeof isAvailable !== 'boolean') throw new Error(`Availability for ${day} must be true or false`);
      }
      return true;
    })
];

// ---------------------- Appointment Validation ----------------------
export const validateAppointment = [
  body('petName')
    .trim()
    .notEmpty().withMessage('Pet name is required')
    .isLength({ min: 1, max: 50 }).withMessage('Pet name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/).withMessage('Pet name can only contain letters, spaces, hyphens, and apostrophes'),

  body('petType')
    .trim()
    .notEmpty().withMessage('Pet type is required')
    .isLength({ min: 2, max: 30 }).withMessage('Pet type must be between 2 and 30 characters'),

  body('serviceId')
    .notEmpty().withMessage('Service is required')
    .isMongoId().withMessage('Invalid service ID'),

  body('appointmentDate')
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom(value => {
      const appointmentDate = new Date(value);
      const now = new Date();
      const maxDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
      if (appointmentDate <= now) throw new Error('Appointment date must be in the future');
      if (appointmentDate > maxDate) throw new Error('Appointment date cannot be more than 90 days in the future');
      return true;
    }),

  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('customerPhone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number'),

  body('customerEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

// ---------------------- Payment Validation ----------------------
export const validatePayment = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('amount')
    .notEmpty().withMessage('Payment amount is required')
    .isFloat({ min: 0.01, max: 100000 }).withMessage('Amount must be between ₹0.01 and ₹100,000')
    .custom(value => {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) throw new Error('Amount cannot have more than 2 decimal places');
      return true;
    }),

  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['cash', 'card', 'upi', 'netbanking', 'wallet']).withMessage('Invalid payment method'),

  body('transactionId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Transaction ID must be between 1 and 100 characters')
    .custom((value, { req }) => {
      if (req.body.paymentMethod !== 'cash' && (!value || value.trim().length === 0)) {
        throw new Error('Transaction ID is required for non-cash payments');
      }
      return true;
    }),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Payment notes cannot exceed 200 characters')
];

// ---------------------- Shop Validation ----------------------
export const validateShop = [
  body('name')
    .trim()
    .notEmpty().withMessage('Shop name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Shop name must be between 2 and 100 characters'),

  body('address')
    .trim()
    .notEmpty().withMessage('Shop address is required')
    .isLength({ min: 10, max: 200 }).withMessage('Address must be between 10 and 200 characters'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('managerId')
    .optional()
    .isMongoId().withMessage('Invalid manager ID')
];

// ---------------------- Pet Validation ----------------------
export const validatePet = [
  body('name')
    .trim()
    .notEmpty().withMessage('Pet name is required')
    .isLength({ min: 1, max: 50 }).withMessage('Pet name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/).withMessage('Pet name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('type')
    .trim()
    .notEmpty().withMessage('Pet type is required')
    .isIn(['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other', 'dog', 'cat', 'bird', 'fish', 'rabbit', 'other'])
    .withMessage('Pet type must be one of: Dog, Cat, Bird, Fish, Rabbit, Other'),

  body('breed')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Breed must be less than 100 characters'),

  body('age')
    .optional()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 50) {
        throw new Error('Age must be a number between 0 and 50');
      }
      return true;
    }),

  body('weight')
    .optional()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        throw new Error('Weight must be a positive number');
      }
      return true;
    }),

  body('medicalConditions')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Medical conditions must be less than 1000 characters'),

  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Special instructions must be less than 1000 characters'),

  body('preferredServices')
    .optional()
    .isArray().withMessage('Preferred services must be an array')
    .custom(services => {
      if (services && services.length > 0) {
        for (const service of services) {
          if (typeof service !== 'string' || service.trim().length === 0) {
            throw new Error('Each preferred service must be a valid string');
          }
        }
      }
      return true;
    }),

  body('selectedPackage')
    .optional()
    .isString().withMessage('Selected package must be a string'),

  body('vaccinationStatus')
    .optional()
    .isIn(['up-to-date', 'due-soon', 'overdue', 'unknown'])
    .withMessage('Vaccination status must be one of: up-to-date, due-soon, overdue, unknown'),

  body('lastGroomed')
    .optional()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Last groomed must be a valid date');
      }
      return true;
    }),

  body('appointmentDate')
    .optional()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Appointment date must be a valid date');
      }
      const now = new Date();
      if (date < now.setHours(0, 0, 0, 0)) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),

  body('behaviorNotes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Behavior notes must be less than 500 characters'),

  body('emergencyContact')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Emergency contact must be less than 100 characters'),

  body('emergencyPhone')
    .optional()
    .trim()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      // Allow various phone number formats
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        throw new Error('Emergency phone must be a valid phone number');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug log
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validatePetUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid pet ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Pet name must be between 1 and 50 characters'),

  body('type')
    .optional()
    .trim()
    .isIn(['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other', 'dog', 'cat', 'bird', 'fish', 'rabbit', 'other'])
    .withMessage('Pet type must be one of: Dog, Cat, Bird, Fish, Rabbit, Other'),

  body('breed')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Breed must be less than 100 characters'),

  body('age')
    .optional()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 50) {
        throw new Error('Age must be a number between 0 and 50');
      }
      return true;
    }),

  body('weight')
    .optional()
    .custom(value => {
      if (value === '' || value === null || value === undefined) return true;
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        throw new Error('Weight must be a positive number');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// ---------------------- Rate Limiting ----------------------
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many modification requests, please try again later.' },
});

// ---------------------- Error Handling ----------------------
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      errorDetails: formattedErrors.reduce((acc, error) => {
        acc[error.field] = error.message;
        return acc;
      }, {})
    });
  }
  next();
};

// ---------------------- Pet Ownership Check ----------------------
export const checkPetOwnership = async (req, res, next) => {
  try {
    const petId = req.params.id;
    const userId = req.user._id; // Changed from req.user.id to req.user._id
    const userRole = req.user.role;
    const userShop = req.user.assignedShop;

    console.log('Pet ownership check:', { petId, userId, userRole, userShop });

    // Managers can modify any pet in their shop
    if (userRole === 'manager') {
      const pet = await Pet.findById(petId);
      if (!pet) {
        return res.status(404).json({ success: false, message: 'Pet not found' });
      }

      // Check if pet belongs to manager's shop
      if (pet.shop.toString() !== userShop.toString()) {
        return res.status(403).json({ success: false, message: 'Pet not in your shop' });
      }

      req.pet = pet;
      return next();
    }

    // For regular users, check if they created the pet
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Pet not found' });
    }

    // Check if user created this pet AND pet is in their shop
    if (pet.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only modify pets you created' });
    }

    if (pet.shop.toString() !== userShop.toString()) {
      return res.status(403).json({ success: false, message: 'Pet not in your shop' });
    }

    req.pet = pet;
    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ success: false, message: 'Server error during ownership verification' });
  }
};

// middleware/loggingMiddleware.js
export const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const userId = req.user ? req.user.id : 'Anonymous';

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - User: ${userId} - Agent: ${userAgent}`);

  // Log response time
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${method} ${url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};
