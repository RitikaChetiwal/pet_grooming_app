// controllers/managerController.js
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Pet from '../models/Pet.js';
import Payment from '../models/Payment.js';

// -----------------------------
// Admin: create / list / update / delete Managers
// -----------------------------

// POST /api/admin/managers
export const createManager = async (req, res) => {
  try {
    const { fullName, email, phone, password, assignedShop } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const manager = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'manager',
      isActive: true,
      assignedShop: assignedShop || null,
    });

    // optionally mark the shop's manager if your Shop schema supports it
    if (assignedShop) {
      await Shop.findByIdAndUpdate(assignedShop, { managerId: manager._id }, { new: true });
    }

    res.status(201).json({ message: 'Manager created', data: manager });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/managers
export const getManagers = async (_req, res) => {
  try {
    const managers = await User.find({ role: 'manager' })
      .populate('assignedShop', 'name address phone email');
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/managers/:id
export const updateManager = async (req, res) => {
  try {
    const { fullName, email, phone, password, assignedShop, isActive } = req.body;

    // fetch old to manage shop reassignment if needed
    const old = await User.findById(req.params.id);
    if (!old || old.role !== 'manager') {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const update = { fullName, email, phone, isActive, assignedShop };
    if (password && password.trim()) {
      update.password = await bcrypt.hash(password, 10);
    }

    const manager = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignedShop', 'name address');

    res.json({ message: 'Manager updated', data: manager });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/managers/:id
export const deleteManager = async (req, res) => {
  try {
    const manager = await User.findById(req.params.id);
    if (!manager || manager.role !== 'manager') {
      return res.status(404).json({ message: 'Manager not found' });
    }
    await manager.deleteOne();
    res.json({ message: 'Manager deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Manager self/ops helpers
// -----------------------------

// GET /api/manager/stats
// Compute “appointments” from Pet.appointmentDate (no Appointment model needed)
export const getManagerStats = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const todayAppointments = await Pet.countDocuments({
      shop: shopId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const completedToday = await Pet.countDocuments({
      shop: shopId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed',
    });

    // ✅ use Payment.shopId and status 'completed'
    const paymentsToday = await Payment.aggregate([
      { $match: { shopId, status: 'completed', paymentDate: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const dailyRevenue = paymentsToday[0]?.total || 0;

    const totalPets = await Pet.countDocuments({ shop: shopId });
    const activeStaff = await User.countDocuments({ role: 'user', assignedShop: shopId, isActive: true });

    res.json({
      todayAppointments,
      completedToday,
      dailyRevenue: `₹${Number(dailyRevenue).toLocaleString('en-IN')}`,
      customerSatisfaction: 4.5,
      activeStaff,
      totalPets,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET /api/manager/pets
export const listManagerPets = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });
    const pets = await Pet.find({ shop: shopId }).sort({ createdAt: -1 });
    res.json(pets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// “Appointments” built from Pet.appointmentDate
// -----------------------------

// GET /api/manager/appointments
// Returns rows compatible with your ManagerDashboard table (pet-based)
export const listManagerAppointments = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const petsWithAppt = await Pet.find({
      shop: shopId,
      appointmentDate: { $exists: true, $ne: null },
    }).sort({ appointmentDate: 1 });

    const petIds = petsWithAppt.map(p => p._id);
    const payments = await Payment.aggregate([
      { $match: { shopId, status: 'completed', petId: { $in: petIds } } },
      { $sort: { paymentDate: -1 } },
      { $group: { _id: '$petId', lastAmount: { $first: '$amount' } } }
    ]);
    const amountByPet = Object.fromEntries(payments.map(x => [String(x._id), x.lastAmount]));

    const rows = petsWithAppt.map((p) => ({
      _id: p._id,
      petName: p.name,
      petType: p.type,
      serviceType: p.selectedService || p.selectedPackage || 'Grooming',
      appointmentDate: p.appointmentDate,
      customerName: p.customerName || p.ownerName || 'Customer',
      servicePrice: Number(p.servicePrice || p.estimatedPrice || amountByPet[String(p._id)] || 0),
      status: p.status || 'pending',
      paymentStatus: p.paymentStatus || 'pending',
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const updateAppointment = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const { petId } = req.params;
    const { status, paymentStatus, appointmentDate } = req.body;

    const allowedStatus = ['scheduled', 'pending', 'in-progress', 'completed', 'cancelled'];
    const allowedPayment = ['pending', 'paid', 'cancelled'];

    const update = {};
    if (status) {
      if (!allowedStatus.includes(status)) return res.status(400).json({ message: 'Invalid status value' });
      update.status = status;
    }
    if (paymentStatus) {
      if (!allowedPayment.includes(paymentStatus)) return res.status(400).json({ message: 'Invalid paymentStatus value' });
      update.paymentStatus = paymentStatus;
    }
    if (appointmentDate) {
      const d = new Date(appointmentDate);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid appointmentDate' });
      update.appointmentDate = d;
    }

    const pet = await Pet.findOneAndUpdate({ _id: petId, shop: shopId }, update, { new: true });
    if (!pet) return res.status(404).json({ message: 'Appointment/Pet not found in your shop' });

    const row = {
      _id: pet._id,
      petName: pet.name,
      petType: pet.type,
      serviceType: pet.selectedService || pet.selectedPackage || 'Grooming',
      appointmentDate: pet.appointmentDate,
      customerName: pet.customerName || pet.ownerName || 'Customer',
      servicePrice: Number(pet.servicePrice || pet.estimatedPrice || 0),
      status: pet.status || 'pending',
      paymentStatus: pet.paymentStatus || 'pending',
    };

    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/managers/:id
export const getManagerById = async (req, res) => {
  try {
    const manager = await User.findOne({
      _id: req.params.id,
      role: 'manager'
    }).populate('assignedShop', 'name address');

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json(manager);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/manager/payments

export const getManagerPayments = async (req, res) => {
  try {
    const managerId = req.user.id;
    const manager = await User.findById(managerId).populate('assignedShop');
    if (!manager || !manager.assignedShop) {
      return res.status(400).json({ message: 'No shop assigned to this manager' });
    }
    const shopId = manager.assignedShop._id;

    // populate to build friendly fields for the table
    const payments = await Payment.find({ shopId })
      .populate('customerId', 'fullName email')
      .populate('serviceId', 'serviceName name price')
      .populate('petId', 'name emergencyContact emergencyPhone')
      .sort({ paymentDate: -1 })
      .lean();

    const rows = payments.map(p => ({
      _id: p._id,
      paymentDate: p.paymentDate,
      customerName: p.customerId?.fullName || 'Customer',

      // Pet fields
      petId: p.petId?._id || null,
      petName: p.petId?.name || p.petName || 'Pet',

      // 👇 Owner name fix: prefer pet.emergencyContact, then Payment.ownerName
      ownerName: p.petId?.emergencyContact || p.ownerName || 'Unknown',
      ownerPhone: p.petId?.emergencyPhone || '',

      // Service & payment
      serviceType: p.serviceId?.serviceName || p.serviceId?.name || 'Service',
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      transactionId: p.transactionId || '',
      status: p.status,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/manager/pets
export const getManagerPets = async (req, res) => {
  try {
    const managerId = req.user.id;

    // Get manager’s assigned shop
    const manager = await User.findById(managerId).populate('assignedShop');
    if (!manager || !manager.assignedShop) {
      return res.status(400).json({ message: 'No shop assigned to this manager' });
    }

    const shopId = manager.assignedShop._id;

    // Fetch pets in this shop
    const pets = await Pet.find({ shop: shopId }).sort({ createdAt: -1 });

    res.json(pets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/manager/staff
export const getManagerStaff = async (req, res) => {
  try {
    const managerId = req.user.id;

    // Find manager’s shop
    const manager = await User.findById(managerId).populate('assignedShop');
    if (!manager || !manager.assignedShop) {
      return res.status(400).json({ message: 'No shop assigned to this manager' });
    }

    const shopId = manager.assignedShop._id;

    // Fetch staff members assigned to this shop
    const staff = await User.find({ role: 'user', assignedShop: shopId }).sort({ createdAt: -1 });

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/manager/staff/:id
export const getStaffMemberById = async (req, res) => {
  try {
    const managerId = req.user.id;

    // Find manager’s shop
    const manager = await User.findById(managerId).populate('assignedShop');
    if (!manager || !manager.assignedShop) {
      return res.status(400).json({ message: 'No shop assigned to this manager' });
    }

    const shopId = manager.assignedShop._id;

    // Fetch the staff member in this shop
    const staffMember = await User.findOne({
      _id: req.params.id,
      role: 'user',
      assignedShop: shopId
    });

    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json(staffMember);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// POST /api/manager/appointments/:petId/payment
export const recordAppointmentPayment = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const managerId = req.user?.id;
    const { petId } = req.params;
    const { amount, paymentMethod = 'cash', transactionId, notes, customerId, serviceId } = req.body;

    const pet = await Pet.findOne({ _id: petId, shop: shopId });
    if (!pet) return res.status(404).json({ message: 'Pet not found in your shop' });

    const inferredCustomer = pet.owner || pet.user || pet.customerId || customerId;
    if (!inferredCustomer) return res.status(400).json({ message: 'customerId is required for recording a payment' });

    const payment = await Payment.create({
      customerId: inferredCustomer,
      serviceId: serviceId || pet.selectedService || pet.selectedPackage,
      shopId,
      managerId,
      amount: Number(amount),
      paymentMethod,
      transactionId: paymentMethod !== 'cash' ? (transactionId || '') : '',
      paymentDate: new Date(),
      notes: notes || '',
      status: 'completed',
      petId: pet._id,
      petName: pet.name || 'Pet',
      ownerName: pet.emergencyContact || '',
    });

    // ✅ ensure appointments table shows correct price & status
    if (!pet.servicePrice || Number(pet.servicePrice) === 0) {
      pet.servicePrice = Number(amount);
    }
    if (!pet.estimatedPrice || Number(pet.estimatedPrice) === 0) {
      pet.estimatedPrice = Number(amount);
    }
    pet.paymentStatus = 'paid';
    if (pet.status !== 'completed') pet.status = 'completed';

    await pet.save();

    res.json({ success: true, message: 'Payment recorded successfully', data: payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Staff (shop users) for a manager
// -----------------------------

// GET /api/manager/staff
export const listManagerStaff = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const staff = await User.find({ role: 'user', assignedShop: shopId }).sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/manager/staff
export const createStaffMember = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const { fullName, email, phone, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      assignedShop: shopId,
    });

    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/manager/staff/:id
export const updateStaffMember = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const { fullName, email, phone, password, isActive } = req.body;

    const update = { fullName, email, phone, isActive };
    if (password && password.trim()) {
      update.password = await bcrypt.hash(password, 10);
    }

    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'user', assignedShop: shopId },
      update,
      { new: true }
    );

    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/manager/staff/:id
export const deleteStaffMember = async (req, res) => {
  try {
    const shopId = req.user?.assignedShop;
    if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

    const staff = await User.findOne({ _id: req.params.id, role: 'user', assignedShop: shopId });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    await staff.deleteOne();
    res.json({ success: true, message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -----------------------------
// Payments list for manager
// -----------------------------

// GET /api/manager/payments
// export const listManagerPayments = async (req, res) => {
//   try {
//     const shopId = req.user?.assignedShop;
//     if (!shopId) return res.status(400).json({ message: 'No shop assigned' });

//     const payments = await Payment.find({ shopId })
//       .sort({ paymentDate: -1 })
//       .lean();

//     res.json(payments);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
