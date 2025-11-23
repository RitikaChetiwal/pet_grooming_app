// models/Service.js
import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: [0, 'Price cannot be negative'],
    max: [100000, 'Price cannot exceed ₹100,000']
  },
  duration: {
    type: Number,
    required: [true, 'Service duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: {
      values: ['basic', 'premium', 'luxury'],
      message: 'Category must be either basic, premium, or luxury'
    },
    default: 'basic'
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
    required: [true, 'Manager ID is required'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priceHistory: [{
    price: Number,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  totalBookings: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  searchKeywords: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: true },
    sunday: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
serviceSchema.index({ shopId: 1, isActive: 1 });
serviceSchema.index({ category: 1, price: 1 });
serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ createdAt: -1 });

// Virtuals
serviceSchema.virtual('formattedPrice').get(function () {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.price);
});

serviceSchema.virtual('formattedDuration').get(function () {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
});

// Middleware
serviceSchema.pre('save', function (next) {
  if (this.isModified('price') && !this.isNew) {
    this.priceHistory.push({
      price: this.price,
      changedAt: new Date(),
      changedBy: this.managerId
    });
  }

  if (this.isModified('name') || this.isModified('description')) {
    const keywords = [];
    const nameWords = this.name.toLowerCase().split(/\s+/);
    const descWords = this.description.toLowerCase().split(/\s+/);

    keywords.push(...nameWords, ...descWords);
    this.searchKeywords = [...new Set(keywords.filter(word => word.length > 2))];
  }

  next();
});

// Static methods
serviceSchema.statics.getByShop = function (shopId, options = {}) {
  const query = { shopId, isActive: true };

  if (options.category) {
    query.category = options.category;
  }

  if (options.priceRange) {
    query.price = {
      $gte: options.priceRange.min || 0,
      $lte: options.priceRange.max || Number.MAX_VALUE
    };
  }

  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 100);
};

// Instance methods
serviceSchema.methods.isAvailableOn = function (dayOfWeek) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = days[dayOfWeek];
  return this.availability[day] && this.isActive;
};

serviceSchema.methods.getEstimatedEndTime = function (startTime) {
  const start = new Date(startTime);
  return new Date(start.getTime() + (this.duration * 60 * 1000));
};

const Service = mongoose.model('Service', serviceSchema);

export default Service;
