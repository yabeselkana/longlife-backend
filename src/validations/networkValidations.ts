import { z } from 'zod';

export const getNetworkTreeSchema = z.object({
    query: z.object({
        rootId: z.string().uuid('rootId must be a valid UUID').optional()
    })
});

export const getMembersSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        sortBy: z.enum(['name', 'email', 'status', 'created_at', 'personal_sales', 'commissions', 'downline', 'city']).optional(),
        order: z.enum(['asc', 'desc']).optional(),
        page: z.preprocess((val) => val === undefined ? undefined : String(val), z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0).optional()),
        limit: z.preprocess((val) => val === undefined ? undefined : String(val), z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0).optional())
    })
});
