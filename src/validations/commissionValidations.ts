import { z } from 'zod';

export const updateCommissionSchema = z.object({
    params: z.object({
        id: z.string().refine(val => !isNaN(Number(val)), { message: 'Commission ID must be a numeric string' }).transform(Number)
    }),
    body: z.object({
        status: z.enum(['PAID', 'PENDING']).optional(),
    }).strict()
});

export const deleteCommissionSchema = z.object({
    params: z.object({
        id: z.string().refine(val => !isNaN(Number(val)), { message: 'Commission ID must be a numeric string' }).transform(Number)
    })
});
