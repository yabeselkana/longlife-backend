import { Router } from 'express';
import { register, login, generateInvitation } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Admin only: generate invitation codes
router.post('/invitations', authenticateToken, requireAdmin, generateInvitation);

export default router;
