import { Router } from 'express';
import { getNetworkTree, getMembers } from '../controllers/networkController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve network tree
router.get('/tree', authenticateToken, getNetworkTree);

// Retrieve and search members
router.get('/', authenticateToken, getMembers);

export default router;
