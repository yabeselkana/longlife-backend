import { Router } from 'express';
import { generateInvitation, getAllInvitations } from '../controllers/invitationController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { generateInvitationSchema } from '../validations/authValidations';

const router = Router();

router.get('/', authenticateToken, getAllInvitations);
router.post('/', authenticateToken, validateRequest(generateInvitationSchema), generateInvitation);

export default router;
