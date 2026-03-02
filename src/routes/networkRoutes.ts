import { Router } from 'express';
import { getNetworkTree } from '../controllers/networkController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve network tree
router.get('/tree', authenticateToken, getNetworkTree);

export default router;
