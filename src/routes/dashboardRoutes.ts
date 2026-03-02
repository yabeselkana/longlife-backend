import { Router } from 'express';
import { getMemberSummary, getAdminSummary } from '../controllers/dashboardController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Member specific dashboard
router.get('/member-summary', authenticateToken, getMemberSummary);

// Admin specific dashboard
router.get('/admin-summary', authenticateToken, requireAdmin, getAdminSummary);

export default router;
