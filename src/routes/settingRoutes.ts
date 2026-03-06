import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { updateSettingsSchema } from '../validations/settingValidations';

const router = Router();

// Retrieve system settings
router.get('/', authenticateToken, getSettings);

// Update system settings (Admin only)
router.put('/', authenticateToken, validateRequest(updateSettingsSchema), updateSettings);

export default router;
