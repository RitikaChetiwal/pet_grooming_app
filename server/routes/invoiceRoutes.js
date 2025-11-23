import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  generateInvoice,
  getInvoicePDF,
  getAllInvoices,
  getInvoice,
} from "../controllers/invoiceController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Generate new invoice
router.post("/generate", generateInvoice);

// Get invoice PDF
router.get("/:invoiceId/pdf", getInvoicePDF);

// Get all invoices (with pagination)
router.get("/", getAllInvoices);

// Get single invoice
router.get("/:id", getInvoice);

export default router;
