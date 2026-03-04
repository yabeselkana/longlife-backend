import { Router } from 'express';
import { createExpense, getExpenses, updateExpense, deleteExpense } from '../controllers/expenseController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createExpenseSchema, updateExpenseSchema, deleteExpenseSchema } from '../validations/expenseValidations';

const router = Router();

// Only admin can manage expenses
router.post('/', authenticateToken, requireAdmin, validateRequest(createExpenseSchema), createExpense);
router.get('/', authenticateToken, requireAdmin, getExpenses);
router.put('/:id', authenticateToken, requireAdmin, validateRequest(updateExpenseSchema), updateExpense);
router.delete('/:id', authenticateToken, requireAdmin, validateRequest(deleteExpenseSchema), deleteExpense);

export default router;
