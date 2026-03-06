import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import networkRoutes from './routes/networkRoutes';
import expenseRoutes from './routes/expenseRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import commissionRoutes from './routes/commissionRoutes';
import invitationRoutes from './routes/invitationRoutes';
import memberRoutes from './routes/memberRoutes';
import settingRoutes from './routes/settingRoutes';

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true })); // Allow cookies in CORS
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/network', networkRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/commissions', commissionRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/settings', settingRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
