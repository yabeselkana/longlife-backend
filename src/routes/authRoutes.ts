import { Router } from 'express';
import { register, login, generateInvitation, logout, getProfile, updateProfile, deleteProfile } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Profile management
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.delete('/profile', authenticateToken, deleteProfile);

// Both Admin and Member can generate invitation codes
router.post('/invitations', authenticateToken, generateInvitation);

export default router;
