import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  phone: { type: Number, required: true },
  email: { type: String, required: true, lowercase: true },
  managerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  userIds: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }],
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Shop', shopSchema);