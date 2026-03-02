import { Router } from 'express';
import { createOrder, approveOrder } from '../controllers/orderController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Members can create orders
router.post('/', authenticateToken, createOrder);

// Admin only: Approve order
router.put('/:id/status', authenticateToken, requireAdmin, approveOrder);

export default router;
