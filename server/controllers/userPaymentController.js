import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Pet from '../models/Pet.js';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const createUserPayment = async (req, res) => {
    try {
        const {
            amount,              // TOTAL incl GST from frontend
            paymentMethod = 'cash',
            transactionId,
            petId,
            petName,             // not stored in Payment schema (ignored)
            paymentType = 'full',
            advancePercentage = 0,
            notes = '',
            shopId,
            serviceId,
            managerId,
            emergencyContact
        } = req.body;

        const userId = req.user?._id;

        if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Valid amount is required' });
        }
        if (!shopId) {
            return res.status(400).json({ message: 'shopId is required' });
        }

        // Resolve manager (if not provided)
        let finalManagerId = managerId;
        if (!finalManagerId) {
            const manager = await User.findOne({ assignedShop: shopId, role: 'manager' });
            finalManagerId = manager?._id;
        }
        if (!finalManagerId) {
            return res.status(400).json({ message: 'No manager found for this shop' });
        }

        const totalWithGst = r2(Number(amount));
        let paidNow = totalWithGst;
        let balanceAmount = 0;
        let status = 'completed';

        if (paymentType === 'advance') {
            const advPct = Number(advancePercentage) > 0 ? Number(advancePercentage) : 30;
            paidNow = r2((totalWithGst * advPct) / 100);
            balanceAmount = r2(totalWithGst - paidNow);
        }

        const gstPortion = r2((paidNow * 0.18) / 1.18);

        let finalPetId = petId;
        let finalPetName = petName;
        let finalOwnerName = emergencyContact;

        // If petId is present, trust the DB for owner and name
        if (finalPetId && !finalOwnerName) {
            const pet = await Pet.findById(finalPetId).select('name emergencyContact');
            if (pet) {
                finalPetName = pet.name || finalPetName;
                finalOwnerName = pet.emergencyContact || finalOwnerName;
            }
        }

        // If petId is missing but we have a name, try to resolve within shop
        if (!finalPetId && finalPetName) {
            const pet = await Pet.findOne({ shop: shopId, name: finalPetName }).select('name emergencyContact');
            if (pet) {
                finalPetId = pet._id;
                finalPetName = pet.name || finalPetName;
                if (!finalOwnerName) finalOwnerName = pet.emergencyContact || '';
            }
        }

        // then build the Payment using these finals
        const payment = new Payment({
            customerId: userId,
            serviceId,
            shopId,
            managerId: finalManagerId,
            amount: paidNow,
            gstAmount: gstPortion,
            totalWithGst: paidNow,
            taxAmount: gstPortion,
            paymentType,
            advancePercentage: paymentType === 'advance' ? Number(advancePercentage || 30) : 0,
            balanceAmount,
            paymentMethod,
            transactionId: paymentMethod !== 'cash' ? (transactionId || '') : '',
            notes,
            status,
            paymentDate: new Date(),
            petId: finalPetId,
            petName: finalPetName,
            ownerName: finalOwnerName, // ← emergencyContact is owner
        });

        await payment.save();

        if (finalPetId) {
            const pet = await Pet.findById(finalPetId);
            if (pet) {
                // reflect payment on the appointment (Pet) so Manager > Appointments shows correctly
                pet.paymentStatus = 'paid';

                if (paymentType === 'full') {
                    pet.status = 'completed';
                    // if price wasn’t set earlier, ensure it’s visible in appointments
                    if (!pet.servicePrice || Number(pet.servicePrice) === 0) {
                        pet.servicePrice = Number(paidNow);
                    }
                    if (!pet.estimatedPrice || Number(pet.estimatedPrice) === 0) {
                        pet.estimatedPrice = Number(paidNow);
                    }
                } else {
                    // for advance payments, mark the flow as ongoing
                    if (!pet.status || pet.status === 'pending') pet.status = 'in-progress';
                }

                await pet.save();
            }
        }

        return res.json({
            success: true,
            message:
                paymentType === 'advance'
                    ? `Advance payment of ₹${paidNow} recorded successfully. Balance: ₹${balanceAmount}`
                    : `Payment of ₹${paidNow} completed successfully.`,
            data: payment
        });
    } catch (error) {
        console.error('createUserPayment error:', error);

        if (error.name === 'ValidationError') {
            const errors = {};
            Object.keys(error.errors).forEach(key => { errors[key] = error.errors[key].message; });
            return res.status(400).json({ success: false, message: 'Validation error', details: errors });
        }
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};


export const getUserPaymentHistory = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { page = 1, limit = 10, status, paymentType } = req.query;

        const query = { customerId: userId };

        // Add filters if provided
        if (status) query.status = status;
        if (paymentType) query.paymentType = paymentType;

        const payments = await Payment.find(query)
            .populate('shopId', 'name address')
            .populate('serviceId', 'serviceName price')
            .sort({ paymentDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Payment.countDocuments(query);

        return res.json({
            success: true,
            data: {
                payments,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalPayments: total
            }
        });
    } catch (error) {
        console.error('getUserPaymentHistory error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// Get specific payment by ID
export const getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?._id;

        const payment = await Payment.findOne({
            _id: paymentId,
            customerId: userId
        })
            .populate('shopId', 'name address phone')
            .populate('serviceId', 'serviceName price description')
            .populate('managerId', 'fullName email');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        return res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error('getPaymentById error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// Update payment status (for managers/admins)
export const updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status, notes } = req.body;
        const userId = req.user?._id;

        if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, completed, failed, or refunded'
            });
        }

        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Check if user has permission to update this payment
        if (req.user.role === 'manager' && payment.managerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update payments for your shop'
            });
        }

        payment.status = status;
        if (notes) {
            payment.notes = payment.notes ? `${payment.notes}\n---\n${notes}` : notes;
        }
        payment.updatedAt = new Date();

        await payment.save();

        return res.json({
            success: true,
            message: `Payment status updated to ${status}`,
            data: payment
        });
    } catch (error) {
        console.error('updatePaymentStatus error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};