// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import User from './models/User.js';
import userPaymentRoutes from './routes/userPaymentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import petRoutes from './routes/petRoutes.js';
import managerRoutes, { managerRouter } from './routes/managerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import adminReports from './routes/adminReportsRoutes.js'
import invoiceRoutes from './routes/invoiceRoutes.js'
// Removed appointmentRoutes import


dotenv.config();
const app = express();

// Middleware

app.use(cors());
// app.use(cors({
//     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//     credentials: true
// }));

app.use(express.json());

// DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB connected ✅');
        await createUniversalAdmin(); // 👈 works perfectly fine!
    })
    .catch(err => {
        console.error('MongoDB error ❌', err)
    });

const createUniversalAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

            const admin = new User({
                fullName: process.env.ADMIN_NAME,
                email: process.env.ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
                assignedShop: null
            });

            await admin.save();
            console.log('✅ Universal admin created:', admin.email);
        } else {
            console.log('✅ Universal admin already exists');
        }
    } catch (err) {
        console.error('❌ Error creating universal admin:', err.message);
    }
};

// Test route
app.get('/', (req, res) => {
    res.send('Pet Management API is running 🐾');
});

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/admin/managers', managerRoutes);
app.use('/api/manager', managerRouter);
app.use('/api/admin/users', userRoutes);
app.use('/api/shops', serviceRoutes);
app.use('/api/payments', userPaymentRoutes);
app.use('/api/admin/reports',adminReports)
app.use('/api/invoices',invoiceRoutes)

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} 🚀`);
});