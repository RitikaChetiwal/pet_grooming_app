import mongoose from 'mongoose';
import Service from '../models/Service.js';
import Shop from '../models/Shop.js';
import User from '../models/User.js';

export const checkShopOwnership = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    // Debug logging
    console.log('🔍 checkShopOwnership Debug:', {
      shopId,
      userId: req.user?._id,
      userRole: req.user?.role,
      assignedShop: req.user?.assignedShop,
      assignedShopType: typeof req.user?.assignedShop
    });

    // Make sure user is authenticated
    if (!req.user || !req.user._id) {
      console.log('❌ Authentication failed');
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please log in again.',
      });
    }

    // Validate shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      console.log('❌ Shop not found:', shopId);
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    // Get user's assigned shop ID
    let userShopId;
    if (typeof req.user.assignedShop === 'object' && req.user.assignedShop) {
      userShopId = req.user.assignedShop._id || req.user.assignedShop.id;
    } else if (typeof req.user.assignedShop === 'string') {
      userShopId = req.user.assignedShop;
    }

    console.log('🔍 Shop comparison:', {
      requestedShopId: shopId,
      userAssignedShopId: userShopId,
      match: userShopId?.toString() === shopId.toString()
    });

    // Check authorization for both managers and users
    if (req.user.role === 'manager' || req.user.role === 'user') {
  const mismatch = !userShopId || userShopId.toString() !== shopId.toString();
  if (mismatch) {
    // 🔄 Re-fetch latest user to avoid stale token issues
    const freshUser = await User.findById(req.user._id).select('assignedShop role');
    const freshAssigned = (freshUser?.assignedShop && typeof freshUser.assignedShop === 'object')
      ? freshUser.assignedShop._id?.toString()
      : freshUser?.assignedShop?.toString();

    if (freshAssigned && freshAssigned === shopId.toString()) {
      console.log('♻️ JWT had stale assignedShop; allowing based on fresh DB value');
      req.user.assignedShop = freshUser.assignedShop; // normalize for downstream
    } else {
      console.log('❌ Shop access denied (after refresh)');
      return res.status(403).json({
        success: false,
        message: `You can only access services for your assigned shop. Your shop: ${freshAssigned || userShopId}, Requested: ${shopId}`,
      });
    }
  }
}


    console.log('✅ Authorization passed');
    req.shop = shop;
    next();
  } catch (error) {
    console.error('💥 Error in checkShopOwnership:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying shop ownership',
      error: error.message,
    });
  }
};


// GET all services
export const getServices = async (req, res) => {
  try {
    const { shopId } = req.params;
    const {
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
      search,
    } = req.query;

    const options = {
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      limit: Math.min(parseInt(limit), 100),
      skip: (parseInt(page) - 1) * parseInt(limit),
    };

    // 🔹 Base query
    let query = Service.find({ shopId, isActive: true });

    // 🔹 Filters
    if (category) query = query.where('category').equals(category);

    if (minPrice || maxPrice) {
      query = query
        .where('price')
        .gte(minPrice || 0)
        .lte(maxPrice || Number.MAX_VALUE);
    }

    if (search) {
      query = query.where({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { searchKeywords: { $in: [new RegExp(search, 'i')] } },
        ],
      });
    }

    // 🔹 Fetch services
    const services = await query
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate('managerId', 'fullName email')
      .lean();

    // 🔹 Total services count
    const totalServices = await Service.countDocuments({
      shopId,
      isActive: true,
      ...(category && { category }),
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }),
    });

    // 🔹 Stats aggregation
    const stats = await Service.aggregate([
      {
        $match: {
          shopId: new mongoose.Types.ObjectId(shopId), // ✅ fixed here
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalServices: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgDuration: { $avg: '$duration' },
          totalBookings: { $sum: '$totalBookings' },
          avgRating: { $avg: '$averageRating' },
          categories: { $addToSet: '$category' },
        },
      },
    ]);

    // 🔹 Send response
    res.status(200).json({
      success: true,
      data: services,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalServices / parseInt(limit)),
        totalServices,
        hasNext: parseInt(page) * parseInt(limit) < totalServices,
        hasPrev: parseInt(page) > 1,
      },
      stats: stats[0] || {
        totalServices: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgDuration: 0,
        totalBookings: 0,
        avgRating: 0,
        categories: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message,
    });
  }
};


// GET single service
export const getServiceById = async (req, res) => {
  try {
    const { shopId, serviceId } = req.params;
    const service = await Service.findOne({
      _id: serviceId,
      shopId,
      isActive: true,
    }).populate('managerId', 'fullName email');

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: 'Service not found' });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching service',
      error: error.message,
    });
  }
};

// CREATE service
export const createService = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name, description, price, duration, category, availability } =
      req.body;

    const existingService = await Service.findOne({
      shopId,
      name: { $regex: new RegExp(name, 'i') },
      isActive: true,
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists in your shop',
      });
    }

    const service = new Service({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      duration: parseInt(duration),
      category,
      shopId,
      managerId: req.user._id,
      availability: availability || {},
      priceHistory: [
        {
          price: parseFloat(price),
          changedAt: new Date(),
          changedBy: req.user._id,
        },
      ],
    });

    const savedService = await service.save();
    await savedService.populate('managerId', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: savedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating service',
      error: error.message,
    });
  }
};

// UPDATE service
export const updateService = async (req, res) => {
  try {
    const { shopId, serviceId } = req.params;
    const updates = req.body;

    const service = await Service.findOne({
      _id: serviceId,
      shopId,
      isActive: true,
    });

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: 'Service not found' });
    }

    if (updates.name && updates.name !== service.name) {
      const existingService = await Service.findOne({
        shopId,
        name: { $regex: new RegExp(updates.name, 'i') },
        _id: { $ne: serviceId },
        isActive: true,
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'A service with this name already exists in your shop',
        });
      }
    }

    const allowedUpdates = [
      'name',
      'description',
      'price',
      'duration',
      'category',
      'availability',
    ];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        if (['name', 'description'].includes(field)) {
          service[field] = updates[field].trim();
        } else if (field === 'price') {
          service[field] = parseFloat(updates[field]);
        } else if (field === 'duration') {
          service[field] = parseInt(updates[field]);
        } else {
          service[field] = updates[field];
        }
      }
    });

    const updatedService = await service.save();
    await updatedService.populate('managerId', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating service',
      error: error.message,
    });
  }
};

// DELETE service
// DELETE service
export const deleteService = async (req, res) => {
  try {
    const { shopId, serviceId } = req.params;

    const service = await Service.findOne({
      _id: serviceId,
      shopId,
      isActive: true,
    });

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: 'Service not found' });
    }

    // ✅ FIX: Use 'new' with ObjectId constructor
    const activeBookings = await Service.aggregate([
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'serviceId',
          as: 'appointments',
        },
      },
      {
        $match: {
          _id: new mongoose.Types.ObjectId(serviceId), // ✅ Added 'new'
          'appointments.status': { $in: ['confirmed', 'pending'] },
        },
      },
    ]);

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete service with active bookings. Please complete or cancel all bookings first.',
      });
    }

    service.isActive = false;
    await service.save();

    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting service',
      error: error.message,
    });
  }
};

// BULK DELETE
export const bulkDeleteServices = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Service IDs array is required',
      });
    }

    const result = await Service.updateMany(
      { _id: { $in: serviceIds }, shopId, isActive: true },
      { $set: { isActive: false } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} services deleted successfully`,
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting services',
      error: error.message,
    });
  }
};

// SERVICE STATS
// SERVICE STATS
export const getServiceStats = async (req, res) => {
  try {
    const { shopId } = req.params;

    const stats = await Service.aggregate([
      { $match: { shopId: new mongoose.Types.ObjectId(shopId), isActive: true } }, // ✅ Added 'new'
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalServices: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
                avgDuration: { $avg: '$duration' },
                totalRevenue: { $sum: { $multiply: ['$price', '$totalBookings'] } },
              },
            },
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                avgDuration: { $avg: '$duration' },
                totalBookings: { $sum: '$totalBookings' },
              },
            },
          ],
          popular: [
            { $sort: { totalBookings: -1 } },
            { $limit: 5 },
            { $project: { name: 1, price: 1, totalBookings: 1, averageRating: 1 } },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0].overview[0] || {},
        byCategory: stats[0].byCategory || [],
        popularServices: stats[0].popular || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching service statistics',
      error: error.message,
    });
  }
};

export const getServicesForUsers = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .select('name description price duration category')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
}