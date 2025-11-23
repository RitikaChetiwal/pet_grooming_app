// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required'],
    index: true
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: false
  },
  petName: {
    type: String,
    trim: true
  },
  ownerName: {
    type: String,
    trim: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required'],
    index: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Manager ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative'],
    max: [100000, 'Amount cannot exceed ₹100,000']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: ['cash', 'card', 'upi', 'netbanking', 'wallet'],
      message: 'Invalid payment method'
    }
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: [100, 'Transaction ID cannot exceed 100 characters'],
    validate: {
      validator: function (v) {
        // Transaction ID required for non-cash payments
        return this.paymentMethod === 'cash' || (v && v.trim().length > 0);
      },
      message: 'Transaction ID is required for non-cash payments'
    }
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'in-progress'],
    default: 'completed'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  },
  // For refunds and adjustments
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Refund reason cannot exceed 200 characters']
  },
  refundDate: Date,
  // Financial tracking
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  paymentType: {
    type: String,
    enum: ['full', 'advance'],
    default: 'full'
  },
  advancePercentage: {
    type: Number,
    default: 0
  }, // e.g., 50
  balanceAmount: {
    type: Number,
    default: 0
  },
  gstAmount: {
    type: Number,
    default: 0

  },
  totalWithGst: {
    type: Number,
    default: 0
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
paymentSchema.index({ shopId: 1, paymentDate: -1 });
paymentSchema.index({ customerId: 1, paymentDate: -1 });
paymentSchema.index({ status: 1, paymentDate: -1 });
paymentSchema.index({ paymentMethod: 1, status: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.amount);
});

// Virtual for net amount after refund
paymentSchema.virtual('netAmount').get(function () {
  return this.amount - this.refundAmount;
});

// Static method for payment analytics
paymentSchema.statics.getShopRevenue = function (shopId, startDate, endDate) {
  const matchStage = {
    shopId: mongoose.Types.ObjectId(shopId),
    status: 'completed',
    paymentDate: {
      $gte: startDate,
      $lte: endDate
    }
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalRefunds: { $sum: '$refundAmount' },
        netRevenue: { $sum: { $subtract: ['$amount', '$refundAmount'] } },
        totalPayments: { $sum: 1 },
        averagePayment: { $avg: '$amount' },
        paymentMethods: {
          $push: {
            method: '$paymentMethod',
            amount: '$amount'
          }
        }
      }
    }
  ]);
};

export default mongoose.model('Payment', paymentSchema);