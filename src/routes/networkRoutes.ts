import { Router } from 'express';
import { getNetworkTree, getMembers } from '../controllers/networkController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { getNetworkTreeSchema, getMembersSchema } from '../validations/networkValidations';

const router = Router();

// Retrieve network tree
router.get('/tree', authenticateToken, validateRequest(getNetworkTreeSchema), getNetworkTree);

// Retrieve and search members
router.get('/', authenticateToken, validateRequest(getMembersSchema), getMembers);

export default router;
