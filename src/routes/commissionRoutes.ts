import { Router } from 'express';
import { getCommissions, payCommission, updateCommissionStatus, updateCommission, deleteCommission, createCommission } from '../controllers/commissionController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Both admins and members can view commissions (handled inside controller)
router.get('/', authenticateToken, getCommissions);

// Only admins can create commissions manually
router.post('/', authenticateToken, requireAdmin, createCommission);

// Only admins can pay or reject commissions
router.put('/:id/pay', authenticateToken, requireAdmin, payCommission);

// Only admins can change status directly
router.put('/:id/status', authenticateToken, requireAdmin, updateCommissionStatus);

// Individual commission management (Admin only)
router.put('/:id', authenticateToken, requireAdmin, updateCommission);
router.delete('/:id', authenticateToken, requireAdmin, deleteCommission);

export default router;
