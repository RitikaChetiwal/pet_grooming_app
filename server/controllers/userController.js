import User from '../models/User.js';
import bcrypt from 'bcrypt';

// GET /api/admin/users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).populate('assignedShop', 'name address');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, assignedShop } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      assignedShop: assignedShop || null
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, assignedShop } = req.body;
    
    const updateData = { fullName, email, phone, assignedShop };
    
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate('assignedShop', 'name address');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};