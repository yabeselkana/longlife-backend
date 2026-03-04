import { Router } from 'express';
import { getInventory, createInventory, updateInventory, deleteInventory } from '../controllers/inventoryController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createInventorySchema, updateInventorySchema, deleteInventorySchema } from '../validations/inventoryValidations';

const router = Router();

// Everyone (authenticated) can view the inventory
router.get('/', authenticateToken, getInventory);

// Only admins can modify the inventory
router.post('/', authenticateToken, requireAdmin, validateRequest(createInventorySchema), createInventory);
router.put('/:sku', authenticateToken, requireAdmin, validateRequest(updateInventorySchema), updateInventory);
router.delete('/:sku', authenticateToken, requireAdmin, validateRequest(deleteInventorySchema), deleteInventory);

export default router;
