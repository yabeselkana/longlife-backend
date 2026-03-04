import { z } from 'zod';

export const getNetworkTreeSchema = z.object({
    query: z.object({
        rootId: z.string().uuid('rootId must be a valid UUID').optional()
    })
});

export const getMembersSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        sortBy: z.enum(['name', 'email', 'status', 'created_at', 'personal_sales']).optional(),
        order: z.enum(['asc', 'desc']).optional(),
        page: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, { message: 'Page must be a positive number' }).optional(),
        limit: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, { message: 'Limit must be a positive number' }).optional()
    })
});
