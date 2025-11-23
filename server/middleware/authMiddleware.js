// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];

  console.log('🔍 Protect middleware - Token received:', token ? 'Yes' : 'No');

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    console.log('🔍 Protect middleware - User found:', {
      userId: user?._id,
      role: user?.role,
      isActive: user?.isActive,
      assignedShop: user?.assignedShop
    });

    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    console.log('✅ User attached to request');
    next();
  } catch (err) {
    console.log('❌ Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('🔍 Authorization check:', {
      userRole: req.user?.role,
      allowedRoles: roles,
      userExists: !!req.user,
      hasValidRole: req.user && roles.includes(req.user.role)
    });

    if (!req.user) {
      console.log('❌ No user attached to request');
      return res.status(403).json({ message: 'Forbidden: No user found' });
    }

    if (!roles.includes(req.user.role)) {
      console.log('❌ Role not authorized:', req.user.role, 'not in', roles);
      return res.status(403).json({ message: 'Forbidden: Access Denied' });
    }

    console.log('✅ Authorization passed');
    next();
  };
};