// controllers/petController.js
import Pet from '../models/Pet.js';

const toInt = (v, d) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const toDateOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const createPet = async (req, res) => {
  try {
    const {
      name, type, breed, age, weight,
      medicalConditions, specialInstructions,
      preferredServices, selectedPackage,
      vaccinationStatus, lastGroomed, appointmentDate,
      behaviorNotes, emergencyContact, emergencyPhone
    } = req.body;

    if (!name?.trim() || !type?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [
          !name?.trim() && 'Name is required',
          !type?.trim() && 'Type is required'
        ].filter(Boolean)
      });
    }

    if (!req.user?.assignedShop) {
      return res.status(400).json({
        success: false,
        message: 'You must be assigned to a shop to create pets'
      });
    }

    const petData = {
      name: name.trim(),
      type: type.trim(),
      shop: req.user.assignedShop,
      createdBy: req.user._id,
    };

    if (breed?.trim()) petData.breed = breed.trim();
    if (age !== undefined) {
      const ai = toInt(age, null);
      if (ai === null || ai < 0 || ai > 50) {
        return res.status(400).json({ success: false, message: 'Invalid age (0–50)' });
      }
      petData.age = ai;
    }
    if (weight !== undefined) {
      const w = Number(weight);
      if (!Number.isFinite(w) || w < 0) {
        return res.status(400).json({ success: false, message: 'Invalid weight (>= 0)' });
      }
      petData.weight = w;
    }

    if (medicalConditions) petData.medicalConditions = String(medicalConditions);
    if (specialInstructions) petData.specialInstructions = String(specialInstructions);
    if (Array.isArray(preferredServices)) petData.preferredServices = preferredServices.filter(Boolean);
    if (selectedPackage) petData.selectedPackage = selectedPackage;
    if (vaccinationStatus) petData.vaccinationStatus = vaccinationStatus;
    if (behaviorNotes) petData.behaviorNotes = String(behaviorNotes);
    if (emergencyContact) petData.emergencyContact = String(emergencyContact);
    if (emergencyPhone) petData.emergencyPhone = String(emergencyPhone);

    const lg = toDateOrNull(lastGroomed);
    if (lastGroomed && !lg) return res.status(400).json({ success: false, message: 'Invalid last groomed date' });
    if (lg) petData.lastGroomed = lg;

    const appt = toDateOrNull(appointmentDate);
    if (appointmentDate && !appt) return res.status(400).json({ success: false, message: 'Invalid appointment date' });
    if (appt) {
      petData.appointmentDate = appt;
      petData.status = petData.status || 'pending';
      petData.paymentStatus = petData.paymentStatus || 'pending';
    }

    const newPet = await (await new Pet(petData).save()).populate([
      { path: 'preferredServices', select: 'name price duration category' },
      { path: 'selectedPackage', select: 'name price duration category' },
      { path: 'selectedService', select: 'name price duration category' },
      { path: 'shop', select: 'name' },
      { path: 'createdBy', select: 'fullName' },
    ]);

    return res.status(201).json({
      success: true,
      message: 'Pet created successfully',
      pet: newPet
    });
  } catch (err) {
    console.error('Error creating pet:', err);
    return res.status(500).json({ success: false, message: 'Server error while creating pet' });
  }
};

export const getPets = async (req, res) => {
  try {
    if (!req.user?.assignedShop) {
      return res.status(403).json({ success: false, message: 'You are not assigned to any shop.' });
    }

    const rawQ = req.query.q ?? req.query.search ?? '';
    const page = clamp(toInt(req.query.page, 1), 1, 1e9);
    const limit = clamp(toInt(req.query.limit, 10), 1, 100);
    const skip = (page - 1) * limit;

    const query = { shop: req.user.assignedShop };
    if (rawQ) {
      const search = String(rawQ);
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, rows] = await Promise.all([
      Pet.countDocuments(query),
      Pet.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'preferredServices', select: 'name price duration category' },
          { path: 'selectedPackage', select: 'name price duration category' },
          { path: 'selectedService', select: 'name price duration category' },
        ])
    ]);

    return res.status(200).json({
      success: true,
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const updatePet = async (req, res) => {
  try {
    const { id } = req.params;
    const pet = await Pet.findById(id);
    if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
    if (String(pet.shop) !== String(req.user.assignedShop)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updateData = { ...req.body };

    if (updateData.age !== undefined) {
      const ai = toInt(updateData.age, null);
      if (ai === null || ai < 0 || ai > 50) {
        return res.status(400).json({ success: false, message: 'Invalid age (0–50)' });
      }
      updateData.age = ai;
    }

    if (updateData.weight !== undefined) {
      const w = Number(updateData.weight);
      if (!Number.isFinite(w) || w < 0) {
        return res.status(400).json({ success: false, message: 'Invalid weight (>= 0)' });
      }
      updateData.weight = w;
    }

    if (updateData.lastGroomed !== undefined) {
      const lg = toDateOrNull(updateData.lastGroomed);
      if (!lg) return res.status(400).json({ success: false, message: 'Invalid last groomed date' });
      updateData.lastGroomed = lg;
    }

    if (updateData.appointmentDate !== undefined) {
      const appt = toDateOrNull(updateData.appointmentDate);
      if (!appt) return res.status(400).json({ success: false, message: 'Invalid appointment date' });
      updateData.appointmentDate = appt;
    }

    const updatedPet = await Pet.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate([
      { path: 'preferredServices', select: 'name price duration category' },
      { path: 'selectedPackage', select: 'name price duration category' },
      { path: 'selectedService', select: 'name price duration category' },
    ]);

    return res.status(200).json({ success: true, message: 'Pet updated successfully', data: updatedPet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const deletePet = async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Pet not found' });
    }

    // only allow deletion if user belongs to same shop
    if (String(pet.shop) !== String(req.user.assignedShop)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Pet.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: 'Pet deleted successfully' });
  } catch (err) {
    console.error('Error deleting pet:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
