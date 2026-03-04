import { z } from 'zod';

export const createExpenseSchema = z.object({
    body: z.object({
        date: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO8601 or YYYY-MM-DD').optional()),
        category: z.string().min(1, 'Category is required'),
        description: z.string().optional(),
        amount: z.number().positive('Amount must be positive')
    }).strict()
});

export const updateExpenseSchema = z.object({
    params: z.object({
        id: z.string().refine(val => !isNaN(Number(val)), { message: 'Expense ID must be a numeric string' }).transform(Number)
    }),
    body: z.object({
        date: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO8601 or YYYY-MM-DD').optional()),
        category: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().positive('Amount must be positive').optional(),
        status: z.enum(['PAID', 'PENDING', 'CANCELLED']).optional()
    }).strict()
});

export const deleteExpenseSchema = z.object({
    params: z.object({
        id: z.string().refine(val => !isNaN(Number(val)), { message: 'Expense ID must be a numeric string' }).transform(Number)
    })
});
