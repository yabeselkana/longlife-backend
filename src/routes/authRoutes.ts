import { Router } from 'express';
import { register, login, generateInvitation, logout, getProfile, updateProfile, deleteProfile } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { registerSchema, loginSchema, updateProfileSchema, generateInvitationSchema } from '../validations/authValidations';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);

// Profile management
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), updateProfile);
router.delete('/profile', authenticateToken, deleteProfile);

// Both Admin and Member can generate invitation codes
router.post('/invitations', authenticateToken, validateRequest(generateInvitationSchema), generateInvitation);

export default router;
