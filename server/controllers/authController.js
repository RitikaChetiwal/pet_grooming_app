// controllers/authController.js
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Login route
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, shop: user.assignedShop },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin-only: Create user (manager or shop user)
export const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, assignedShop } = req.body;

    if (!['manager', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      assignedShop
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
