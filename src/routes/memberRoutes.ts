import { Router } from 'express';
import { deleteMember, getMembers, updateMember } from '../controllers/networkController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { getMembersSchema } from '../validations/networkValidations';

const router = Router();

// List / search members
router.get('/', authenticateToken, validateRequest(getMembersSchema), getMembers);

// Update a member by ID (admin only)
router.put('/:id', authenticateToken, updateMember);

// Delete a member by ID (admin only)
router.delete('/:id', authenticateToken, deleteMember);

export default router;
