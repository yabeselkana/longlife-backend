import { Request, Response } from 'express';
import prisma from '../config/db';

export const createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, category, description, amount } = req.body;

        if (!category || !amount) {
            res.status(400).json({ error: 'Missing required fields: category, amount' });
            return;
        }

        const expense = await prisma.expense.create({
            data: {
                date: date ? new Date(date) : undefined,
                category,
                description,
                amount,
                status: 'PAID', // Or 'PENDING' depending on further flows
            }
        });

        res.status(201).json({ message: 'Expense created', expense });
    } catch (error) {
        console.error('Create expense error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        // Optional filters for dates can be added here
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });

        res.status(200).json({ expenses });
    } catch (error) {
        console.error('Get expenses error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const expenseId = Number(req.params.id);
        const { category, description, amount, status, date } = req.body;

        const expense = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                category,
                description,
                amount,
                status,
                date: date ? new Date(date) : undefined
            }
        });

        res.status(200).json({ message: 'Expense updated', expense });
    } catch (error) {
        console.error('Update expense error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const expenseId = Number(req.params.id);

        await prisma.expense.delete({
            where: { id: expenseId }
        });

        res.status(200).json({ message: 'Expense deleted' });
    } catch (error) {
        console.error('Delete expense error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
