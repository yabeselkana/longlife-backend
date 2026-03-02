import { Router } from 'express';
import { createExpense, getExpenses, updateExpense, deleteExpense } from '../controllers/expenseController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Only admin can manage expenses
router.post('/', authenticateToken, requireAdmin, createExpense);
router.get('/', authenticateToken, requireAdmin, getExpenses);
router.put('/:id', authenticateToken, requireAdmin, updateExpense);
router.delete('/:id', authenticateToken, requireAdmin, deleteExpense);

export default router;
