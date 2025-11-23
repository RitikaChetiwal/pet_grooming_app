import Invoice from "../models/Invoice.js";
import Shop from "../models/Shop.js";
import Payment from "../models/Payment.js";
import Pet from "../models/Pet.js";
import puppeteer from "puppeteer";
import path from "path";

// Generate Invoice
export const generateInvoice = async (req, res) => {
    try {
        let {
            customerName,
            customerPhone,
            petName,
            petType,
            appointmentDate,
            services,
            baseAmount,
            gstAmount,
            totalAmount,
            paymentMethod,
            paymentType,
            paidAmount,
            remainingAmount,
            transactionId,
            shopId,
            notes,
            paymentId, // optional
            petId      // optional
        } = req.body;

        if (!shopId || !appointmentDate) {
            return res.status(400).json({ success: false, message: "shopId and appointmentDate are required" });
        }

        const shop = await Shop.findById(shopId);
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

        // Try pulling from Payment if given
        let paymentDoc = null;
        if (paymentId) {
            paymentDoc = await Payment.findById(paymentId).lean();
            if (paymentDoc) {
                if (!customerName && paymentDoc.ownerName) customerName = paymentDoc.ownerName;
                if (!petName && paymentDoc.petName) petName = paymentDoc.petName;
            }
        }

        // Try pulling from Pet if given
        let petDoc = null;
        if (petId) {
            petDoc = await Pet.findById(petId).lean();
        } else if (!petDoc && petName && shopId) {
            petDoc = await Pet.findOne({ shop: shopId, name: petName }).lean();
        }

        if (petDoc) {
            if (!customerName && petDoc.emergencyContact) customerName = petDoc.emergencyContact;
            if (!customerPhone && petDoc.emergencyPhone) customerPhone = petDoc.emergencyPhone;
            if (!petName && petDoc.name) petName = petDoc.name;
            if (!petType && petDoc.type) petType = petDoc.type;
        }

        if (!customerName) {
            return res.status(400).json({ success: false, message: "customerName is required (or provide paymentId/petId)" });
        }
        if (!petName) {
            return res.status(400).json({ success: false, message: "petName is required (or provide paymentId/petId)" });
        }

        const invoice = new Invoice({
            shopId,
            customerName,
            customerPhone: customerPhone || "",
            petName,
            petType: petType || "",
            appointmentDate: new Date(appointmentDate),
            services: Array.isArray(services) ? services : [],
            baseAmount: parseFloat(baseAmount) || 0,
            gstAmount: parseFloat(gstAmount) || 0,
            totalAmount: parseFloat(totalAmount) || 0,
            paymentMethod: paymentMethod || (paymentDoc?.paymentMethod ?? ""),
            paymentType: paymentType || (paymentDoc?.paymentType ?? "full"),
            paidAmount: parseFloat(paidAmount ?? paymentDoc?.amount ?? 0) || 0,
            remainingAmount:
                parseFloat(remainingAmount ?? paymentDoc?.balanceAmount ?? 0) || 0,
            transactionId: transactionId || paymentDoc?.transactionId || "",
            status: (paymentType || paymentDoc?.paymentType) === "advance" ? "partial" : "paid",
            notes,
            createdBy: req.user.id,
        });

        await invoice.save();

        res.status(201).json({
            success: true,
            message: "Invoice generated successfully",
            data: invoice,
            invoiceId: invoice._id,
        });
    } catch (err) {
        console.error("Invoice generation error:", err);
        res.status(500).json({ success: false, message: "Failed to generate invoice", error: err.message });
    }
};

// Get Invoice PDF
export const getInvoicePDF = async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await Invoice.findById(invoiceId).populate("shopId");
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }

        // Generate HTML template
        const invoiceHTML = generateInvoiceHTML(invoice);

        // Generate PDF using puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(invoiceHTML, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20px",
                right: "20px",
                bottom: "20px",
                left: "20px",
            },
        });

        await browser.close();

        // Set response headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
        );
        res.setHeader("Content-Length", pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF generation error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate PDF",
            error: error.message,
        });
    }
};

// Get All Invoices
export const getAllInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const invoices = await Invoice.find({ shopId: req.user.assignedShop })
            .populate("shopId", "name address")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Invoice.countDocuments({ shopId: req.user.assignedShop });

        res.json({
            success: true,
            data: invoices,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch invoices",
            error: error.message,
        });
    }
};

// Get Single Invoice
export const getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate("shopId");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }

        res.json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch invoice",
            error: error.message,
        });
    }
};

// Helper function to generate invoice HTML
const generateInvoiceHTML = (invoice) => {
    const shop = invoice.shopId;
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("en-IN");
    const appointmentDate = new Date(invoice.appointmentDate).toLocaleDateString("en-IN");

    return `
    <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice - ${invoice.invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background: #fff; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 40px; 
            border-bottom: 3px solid #f97316; 
            padding-bottom: 20px; 
        }
        
        .logo { 
            font-size: 28px; 
            font-weight: bold; 
            color: #f97316; 
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .invoice-info { text-align: right; }
        .invoice-number { 
            font-size: 24px; 
            font-weight: bold; 
            color: #374151; 
            margin-bottom: 5px;
        }
        .date { color: #6b7280; font-size: 14px; }
        
        .billing-section { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin: 40px 0; 
        }
        
        .billing-info h3 { 
            color: #374151; 
            margin-bottom: 15px; 
            font-size: 16px;
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 8px; 
        }
        
        .billing-info p { margin-bottom: 5px; }
        .billing-info strong { color: #111827; }
        
        .services-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 40px 0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .services-table th { 
            background: linear-gradient(135deg, #f97316, #ec4899); 
            color: white; 
            padding: 15px; 
            text-align: left; 
            font-weight: 600;
        }
        
        .services-table td { 
            border: 1px solid #e5e7eb; 
            padding: 12px 15px; 
            background: #fafafa;
        }
        
        .services-table tr:nth-child(even) td { background: #f9f9f9; }
        
        .total-section { 
            margin: 40px 0; 
            background: linear-gradient(135deg, #fef3e2, #fdf2f8); 
            padding: 25px; 
            border-radius: 12px;
            border-left: 5px solid #f97316;
        }
        
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            font-size: 16px;
        }
        
        .total-row.final { 
            font-size: 20px; 
            font-weight: bold; 
            color: #f97316; 
            border-top: 2px solid #f97316; 
            padding-top: 15px; 
            margin-top: 15px; 
        }
        
        .payment-info { 
            background: linear-gradient(135deg, #eff6ff, #f0f9ff); 
            padding: 25px; 
            border-radius: 12px; 
            margin: 30px 0;
            border-left: 5px solid #3b82f6;
        }
        
        .payment-info h3 { 
            color: #1e40af; 
            margin-bottom: 15px; 
            font-size: 18px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-paid { background: #dcfce7; color: #166534; }
        .status-partial { background: #fef3c7; color: #92400e; }
        .status-pending { background: #fee2e2; color: #dc2626; }
        
        .footer { 
            margin-top: 60px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px; 
            border-top: 1px solid #e5e7eb; 
            padding-top: 20px; 
        }
        
        .footer .thank-you {
            font-size: 16px;
            color: #f97316;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        @media print {
            .container { padding: 20px; }
            .header { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${shop?.name || 'Pet Grooming Shop'}</div>
            <div class="invoice-info">
                <div class="invoice-number">Invoice #${invoice.invoiceNumber}</div>
                <div class="date">Date: ${invoiceDate}</div>
                <div class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</div>
            </div>
        </div>

        <div class="billing-section">
            <div class="billing-info">
                <h3>Bill To:</h3>
                <p><strong>${invoice.customerName}</strong></p>
                <p>Phone: ${invoice.customerPhone}</p>
                <p>Pet: ${invoice.petName} (${invoice.petType})</p>
            </div>
            <div class="billing-info">
                <h3>Service Provider:</h3>
                <p><strong>${shop?.name || 'Pet Grooming Shop'}</strong></p>
                <p>${shop?.address || shop?.location || 'Address not available'}</p>
                <p>Appointment: ${appointmentDate}</p>
            </div>
        </div>

        <table class="services-table">
            <thead>
                <tr>
                    <th>Service</th>
                    <th>Duration</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.services.map(service => `
                    <tr>
                        <td>${service.name || 'Service'}</td>
                        <td>${service.duration || 0} mins</td>
                        <td>₹${service.price || 0}</td>
                        <td>₹${service.price || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${invoice.baseAmount.toFixed(2)}</span>
            </div>
            <div class="total-row">
                <span>GST (18%):</span>
                <span>₹${invoice.gstAmount.toFixed(2)}</span>
            </div>
            <div class="total-row final">
                <span>Total Amount:</span>
                <span>₹${invoice.totalAmount.toFixed(2)}</span>
            </div>
        </div>

        <div class="payment-info">
            <h3>Payment Information</h3>
            <div class="total-row">
                <span>Payment Method:</span>
                <span>${invoice.paymentMethod.toUpperCase()}</span>
            </div>
            <div class="total-row">
                <span>Payment Type:</span>
                <span>${invoice.paymentType === 'advance' ? 'Advance Payment' : 'Full Payment'}</span>
            </div>
            <div class="total-row">
                <span>Amount Paid:</span>
                <span>₹${invoice.paidAmount.toFixed(2)}</span>
            </div>
            ${invoice.remainingAmount > 0 ? `
            <div class="total-row">
                <span>Remaining Balance:</span>
                <span>₹${invoice.remainingAmount.toFixed(2)}</span>
            </div>
            ` : ''}
            ${invoice.transactionId ? `
            <div class="total-row">
                <span>Transaction ID:</span>
                <span>${invoice.transactionId}</span>
            </div>
            ` : ''}
            ${invoice.notes ? `
            <div class="total-row">
                <span>Notes:</span>
                <span>${invoice.notes}</span>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <div class="thank-you">Thank you for choosing our pet grooming services!</div>
            <p>This is a computer-generated invoice.</p>
            <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
    </div>
</body>
</html>
    `;
};
