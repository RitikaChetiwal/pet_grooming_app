// controllers/adminReportsController.js
import Shop from '../models/Shop.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Pet from '../models/Pet.js';

// GET /api/admin/reports/overview
export const getAdminOverviewStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Basic counts
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ status: { $ne: 'inactive' } });
    const totalManagers = await User.countDocuments({ role: 'manager' });
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalPets = await Pet.countDocuments();

    // Revenue analytics
    const revenueData = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalGst: { $sum: '$gstAmount' },
          avgTransactionValue: { $avg: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const revenue = revenueData[0] || {
      totalRevenue: 0,
      totalGst: 0,
      avgTransactionValue: 0,
      transactionCount: 0
    };

    // Shop performance metrics
    const shopPerformance = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'shops',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shop'
        }
      },
      { $unwind: '$shop' },
      {
        $group: {
          _id: '$shopId',
          shopName: { $first: '$shop.name' },
          shopAddress: { $first: '$shop.address' },
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          avgTicketSize: { $avg: '$amount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Monthly revenue trend
    const monthlyTrend = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } // 6 months
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Payment method breakdown
    const paymentMethods = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Recent appointments (from Pet model)
    const recentAppointments = await Pet.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate },
          appointmentDate: { $ne: null }
        }
      },
      {
        $lookup: {
          from: 'shops',
          localField: 'shop',
          foreignField: '_id',
          as: 'shopInfo'
        }
      },
      { $unwind: '$shopInfo' },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    const appointments = recentAppointments[0] || {
      totalAppointments: 0,
      completedAppointments: 0,
      pendingAppointments: 0
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalShops,
          activeShops,
          totalManagers,
          totalUsers,
          totalPets,
          shopUtilization: totalShops > 0 ? ((activeShops / totalShops) * 100).toFixed(1) : 0
        },
        revenue: {
          totalRevenue: revenue.totalRevenue,
          totalGst: revenue.totalGst,
          avgTransactionValue: revenue.avgTransactionValue,
          transactionCount: revenue.transactionCount,
          period: `${period} days`
        },
        appointments,
        topShops: shopPerformance,
        monthlyTrend,
        paymentMethods,
        period: daysBack
      }
    });
  } catch (error) {
    console.error('Admin overview stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate overview stats'
    });
  }
};

// GET /api/admin/reports/revenue-details
export const getRevenueDetails = async (req, res) => {
  try {
    const { startDate, endDate, shopId } = req.query;

    const matchCriteria = {
      status: 'completed',
      paymentDate: {
        $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $lte: endDate ? new Date(endDate) : new Date()
      }
    };

    if (shopId) {
      matchCriteria.shopId = shopId;
    }

    // Daily revenue breakdown
    const dailyRevenue = await Payment.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            day: { $dayOfMonth: '$paymentDate' }
          },
          revenue: { $sum: '$amount' },
          gstAmount: { $sum: '$gstAmount' },
          transactionCount: { $sum: 1 },
          avgTicketSize: { $avg: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Shop-wise performance
    const shopWiseRevenue = await Payment.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'shops',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shop'
        }
      },
      { $unwind: '$shop' },
      {
        $group: {
          _id: '$shopId',
          shopName: { $first: '$shop.name' },
          shopAddress: { $first: '$shop.address' },
          totalRevenue: { $sum: '$amount' },
          totalGst: { $sum: '$gstAmount' },
          transactionCount: { $sum: 1 },
          avgTicketSize: { $avg: '$amount' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Payment type analysis
    const paymentTypeAnalysis = await Payment.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$paymentType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        dailyRevenue,
        shopWiseRevenue,
        paymentTypeAnalysis,
        period: {
          start: matchCriteria.paymentDate.$gte,
          end: matchCriteria.paymentDate.$lte
        }
      }
    });
  } catch (error) {
    console.error('Revenue details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue details'
    });
  }
};

// GET /api/admin/reports/shop-analytics
export const getShopAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Shop performance with pets and revenue
    const shopAnalytics = await Shop.aggregate([
      {
        $lookup: {
          from: 'pets',
          localField: '_id',
          foreignField: 'shop',
          as: 'pets'
        }
      },
      {
        $lookup: {
          from: 'payments',
          let: { shopId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$shopId', '$$shopId'] },
                status: 'completed',
                paymentDate: { $gte: startDate }
              }
            }
          ],
          as: 'payments'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { shopId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$assignedShop', '$$shopId'] },
                role: 'user',
                isActive: true
              }
            }
          ],
          as: 'staff'
        }
      },
      {
        $addFields: {
          totalPets: { $size: '$pets' },
          totalRevenue: { $sum: '$payments.amount' },
          totalTransactions: { $size: '$payments' },
          avgTicketSize: { $avg: '$payments.amount' },
          activeStaff: { $size: '$staff' },
          petsThisPeriod: {
            $size: {
              $filter: {
                input: '$pets',
                cond: { $gte: ['$$this.createdAt', startDate] }
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          address: 1,
          phone: 1,
          email: 1,
          status: 1,
          totalPets: 1,
          totalRevenue: 1,
          totalTransactions: 1,
          avgTicketSize: { $ifNull: ['$avgTicketSize', 0] },
          activeStaff: 1,
          petsThisPeriod: 1,
          revenuePerPet: {
            $cond: [
              { $gt: ['$totalPets', 0] },
              { $divide: ['$totalRevenue', '$totalPets'] },
              0
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Manager performance
    const managerPerformance = await User.aggregate([
      { $match: { role: 'manager', assignedShop: { $ne: null } } },
      {
        $lookup: {
          from: 'shops',
          localField: 'assignedShop',
          foreignField: '_id',
          as: 'shop'
        }
      },
      { $unwind: '$shop' },
      {
        $lookup: {
          from: 'payments',
          let: { shopId: '$assignedShop' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$shopId', '$$shopId'] },
                status: 'completed',
                paymentDate: { $gte: startDate }
              }
            }
          ],
          as: 'payments'
        }
      },
      {
        $addFields: {
          totalRevenue: { $sum: '$payments.amount' },
          totalTransactions: { $size: '$payments' }
        }
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          shopName: '$shop.name',
          shopAddress: '$shop.address',
          totalRevenue: 1,
          totalTransactions: 1,
          avgTransactionValue: {
            $cond: [
              { $gt: ['$totalTransactions', 0] },
              { $divide: ['$totalRevenue', '$totalTransactions'] },
              0
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        shopAnalytics,
        managerPerformance,
        period: daysBack
      }
    });
  } catch (error) {
    console.error('Shop analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate shop analytics'
    });
  }
};

// GET /api/admin/reports/growth-metrics
export const getGrowthMetrics = async (req, res) => {
  try {
    const { period = '6' } = req.query; // months
    const monthsBack = parseInt(period);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Monthly growth in shops, users, pets
    const monthlyGrowth = await Promise.all([
      // Shop registrations by month
      Shop.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newShops: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // User registrations by month
      User.aggregate([
        { $match: { createdAt: { $gte: startDate }, role: 'user' } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Pet registrations by month
      Pet.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newPets: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Revenue growth by month
    const revenueGrowth = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate growth rates
    const calculateGrowthRate = (data, valueField) => {
      if (data.length < 2) return 0;
      const current = data[data.length - 1][valueField];
      const previous = data[data.length - 2][valueField];
      return previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : 0;
    };

    res.json({
      success: true,
      data: {
        monthlyShops: monthlyGrowth[0],
        monthlyUsers: monthlyGrowth[1],
        monthlyPets: monthlyGrowth[2],
        revenueGrowth,
        growthRates: {
          shops: calculateGrowthRate(monthlyGrowth[0], 'newShops'),
          users: calculateGrowthRate(monthlyGrowth[1], 'newUsers'),
          pets: calculateGrowthRate(monthlyGrowth[2], 'newPets'),
          revenue: calculateGrowthRate(revenueGrowth, 'revenue')
        },
        period: monthsBack
      }
    });
  } catch (error) {
    console.error('Growth metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate growth metrics'
    });
  }
};

// GET /api/admin/reports/services
export const getServiceUsage = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysBack = Number.isFinite(+period) ? parseInt(period, 10) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const usage = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startDate } } },

      {
        $group: {
          _id: '$serviceId',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },

      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: '$service.name',
          totalBookings: 1,
          totalRevenue: 1,
        },
      },

      { $sort: { totalBookings: -1 } },
    ]);

    return res.json({ success: true, data: usage, period: daysBack });
  } catch (err) {
    console.error('getServiceUsage error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to compute service usage' });
  }
};

/**
 * Get top services by shop - returns the most popular service for each shop
 */
export const getTopServicesByShop = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysBack = Number.isFinite(+period) ? parseInt(period, 10) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // First, let's get all shop-service combinations with their booking counts
    const serviceUsageByShop = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate },
          status: 'completed'  // Only count completed payments
        }
      },

      {
        $group: {
          _id: { shopId: '$shopId', serviceId: '$serviceId' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },

      // Look up service details
      {
        $lookup: {
          from: 'services',
          localField: '_id.serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },

      // Look up shop details
      {
        $lookup: {
          from: 'shops',
          localField: '_id.shopId',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },

      // Filter out entries without proper shop/service data
      {
        $match: {
          'shop.name': { $exists: true },
          'service.name': { $exists: true }
        }
      },

      // Group by shop to find the top service per shop
      {
        $group: {
          _id: '$_id.shopId',
          shopName: { $first: '$shop.name' },
          services: {
            $push: {
              serviceId: '$_id.serviceId',
              serviceName: '$service.name',
              bookingCount: '$totalBookings',
              totalRevenue: '$totalRevenue'
            }
          }
        }
      },

      // Sort services within each shop by booking count and get the top one
      {
        $addFields: {
          topService: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: '$services',
                  sortBy: { bookingCount: -1 }
                }
              },
              0
            ]
          }
        }
      },

      // Final projection to match the expected format
      {
        $project: {
          _id: 0,
          shopId: '$_id',
          shopName: 1,
          topService: {
            serviceId: '$topService.serviceId',
            serviceName: '$topService.serviceName',
            bookingCount: '$topService.bookingCount',
            totalRevenue: '$topService.totalRevenue'
          }
        },
      },

      // Sort by booking count descending
      { $sort: { 'topService.bookingCount': -1 } }
    ]);

    console.log(`Found ${serviceUsageByShop.length} shops with service data for period: ${daysBack} days`);

    return res.json({
      success: true,
      data: serviceUsageByShop,
      period: daysBack,
      count: serviceUsageByShop.length
    });
  } catch (err) {
    console.error('getTopServicesByShop error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute top services by shop',
      error: err.message
    });
  }
};