import Shop from '../models/Shop.js';
import User from '../models/User.js';

// GET /api/shops
export const getShops = async (req, res) => {
  try {
    const shops = await Shop.find()
      .populate('managerId', 'fullName email phone')
      .populate('userIds', 'fullName email');

    res.json(shops);
  } catch (err) {
    console.error('Error in getShops:', err);
    res.status(500).json({ message: err.message });
  }
};


// POST /api/shops
export const createShop = async (req, res) => {
  try {
    const { name, address, phone, email, managerId, userIds } = req.body;

    // Create shop with proper managerId handling
    const shop = new Shop({
      name,
      address,
      phone,
      email,
      managerId: managerId || null,
      userIds: userIds || []
    });
    
    

    await shop.save();

    // Update manager's assignedShop if managerId provided
    if (managerId) {
      await User.findByIdAndUpdate(managerId, { assignedShop: shop._id });
    }

    // Populate managerId properly
    const populatedShop = await Shop.findById(shop._id)
      .populate('managerId', 'fullName email phone')
      .populate('userIds', 'fullName email');

    res.status(201).json(populatedShop);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/shops/:id
export const updateShop = async (req, res) => {
  try {
    const { name, address, phone, email, managerId, userIds } = req.body;

    const oldShop = await Shop.findById(req.params.id);
    if (!oldShop) return res.status(404).json({ message: 'Shop not found' });

    // Update shop with proper managerId handling
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      {
        name,
        address,
        phone,
        email,
        managerId: managerId || null,
        userIds
      },
      { new: true }
    )
      .populate('managerId', 'fullName email phone')
      .populate('userIds', 'fullName email');

    // Update manager assignments
    if (oldShop.managerId) {
      await User.findByIdAndUpdate(oldShop.managerId, { assignedShop: null });
    }
    if (managerId) {
      await User.findByIdAndUpdate(managerId, { assignedShop: shop._id });
    }

    res.json(shop);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/shops/:id
export const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    // Remove shop assignment from users
    await User.updateMany(
      { assignedShop: req.params.id },
      { assignedShop: null }
    );

    await Shop.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shop deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/shops/:id - Get single shop by ID
export const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('managerId', 'fullName email phone')
      .populate('userIds', 'fullName email');

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    res.json(shop);
  } catch (err) {
    console.error('Error in getShopById:', err);
    res.status(500).json({ message: err.message });
  }
};

export const verifyManager = async (req, res) => {
  try {
    const shopId = req.params.id;
    const managerId = req.user.id; // From auth middleware

    // Check if this manager is assigned to this shop
    const manager = await User.findOne({
      _id: managerId,
      role: 'manager',
      assignedShop: shopId
    });

    if (!manager) {
      return res.json({ isAuthorized: false });
    }

    res.json({ isAuthorized: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};