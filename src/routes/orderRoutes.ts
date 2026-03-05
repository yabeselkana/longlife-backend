import { Router } from 'express';
import { createOrder, approveOrder, getAllOrders, getMyOrders, rejectOrder } from '../controllers/orderController';
import { authenticateToken, requireAdmin, requireMember } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createOrderSchema, approveOrderSchema } from '../validations/orderValidations';

const router = Router();

// Members can get their own orders
router.get('/me', authenticateToken, requireMember, getMyOrders);

// Members can create orders
router.post('/', authenticateToken, requireMember, validateRequest(createOrderSchema), createOrder);

// Admin only: Get all orders
router.get('/', authenticateToken, requireAdmin, getAllOrders);

// Admin only: Approve order
router.put('/:id/status', authenticateToken, requireAdmin, validateRequest(approveOrderSchema), approveOrder);

// Admin only: Reject order
router.put('/:id/reject', authenticateToken, requireAdmin, validateRequest(approveOrderSchema), rejectOrder);

export default router;
