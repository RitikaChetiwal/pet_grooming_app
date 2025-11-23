import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet"
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  petName: {
    type: String,
    required: true
  },
  petType: {
    type: String,
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  services: [
    {
      serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service"
      },
      name: String,
      price: Number,
      duration: Number
    }
  ],
  baseAmount: {
    type: Number,
    required: true
  },
  gstAmount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "upi", "netbanking"],
    required: true
  },
  paymentType: {
    type: String,
    enum: ["full", "advance"],
    required: true
  },
  paidAmount: {
    type: Number,
    required: true
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  transactionId: String,
  status: {
    type: String,
    enum: ["paid", "partial", "pending"],
    default: "paid"
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate invoice number
invoiceSchema.pre("save", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model("Invoice").countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(
      count + 1
    ).padStart(4, "0")}`;
  }
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
