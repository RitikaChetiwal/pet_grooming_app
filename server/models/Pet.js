// models/Pet.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const petSchema = new Schema(
  {
    // Core pet fields
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    breed: { type: String, trim: true },
    age: { type: Number, min: 0, max: 50 },
    weight: { type: Number, min: 0 },
    medicalConditions: { type: String, trim: true },
    specialInstructions: { type: String, trim: true },

    // Services chosen at booking time
    preferredServices: [{ type: Schema.Types.ObjectId, ref: 'Service' }],           // list of service ids/names
    selectedPackage: { type: String },                // package id/name
    selectedService: { type: String },                // optional single service id/name
    // price snapshot (so manager view doesn’t depend on current catalog price)
    estimatedPrice: { type: Number, min: 0 },
    servicePrice: { type: Number, min: 0 },

    // Health / misc
    vaccinationStatus: { type: String, default: 'up-to-date' },
    lastGroomed: { type: Date },

    // Appointment fields
    appointmentDate: { type: Date, required: false },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Payment lifecycle on the appointment
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'refunded', 'partial'],
      default: 'pending',
      index: true,
    },

    // Optional cancellation metadata
    cancellationReason: { type: String, trim: true },
    cancellationDate: { type: Date },

    // (Optional) owner-friendly labels for manager list
    emergencyContact: { type: String, trim: true },
    emergencyPhone: { type: Number, trim: true },

    // Relationships / audit
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Helpful compound index for manager appointments list & stats
petSchema.index({ shop: 1, appointmentDate: 1 });
// If you’ll often filter by shop + status:
petSchema.index({ shop: 1, status: 1 });

export default mongoose.model('Pet', petSchema);
