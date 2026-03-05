import { Router } from 'express';
import { getCommissions, payCommission, updateCommissionStatus } from '../controllers/commissionController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Both admins and members can view commissions (handled inside controller)
router.get('/', authenticateToken, getCommissions);

// Only admins can pay or reject commissions
router.put('/:id/pay', authenticateToken, requireAdmin, payCommission);
// Only admins can change status directly
router.put('/:id/status', authenticateToken, requireAdmin, updateCommissionStatus);

export default router;
