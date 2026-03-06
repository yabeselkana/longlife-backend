import { Router } from 'express';
import { register, login, logout, getProfile, updateProfile, deleteProfile, googleLogin, updateAvatar } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { registerSchema, loginSchema, updateProfileSchema } from '../validations/authValidations';
import upload from '../middlewares/uploadMiddleware';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/google-login', googleLogin);
router.post('/avatar', authenticateToken, upload.single('avatar'), updateAvatar);
router.post('/logout', logout);

// Profile management
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), updateProfile);
router.delete('/profile', authenticateToken, deleteProfile);


export default router;
