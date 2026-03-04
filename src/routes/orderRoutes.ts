import { Router } from 'express';
import { createOrder, approveOrder } from '../controllers/orderController';
import { authenticateToken, requireAdmin, requireMember } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createOrderSchema, approveOrderSchema } from '../validations/orderValidations';

const router = Router();

// Members can create orders
router.post('/', authenticateToken, requireMember, validateRequest(createOrderSchema), createOrder);

// Admin only: Approve order
router.put('/:id/status', authenticateToken, requireAdmin, validateRequest(approveOrderSchema), approveOrder);

export default router;
