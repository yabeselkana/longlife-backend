import { z } from 'zod';

export const createOrderSchema = z.object({
    body: z.object({
        sku: z.string().min(1, 'Product SKU is required'),
        qty: z.number().int().positive('Quantity must be a positive integer')
    }).strict()
});

export const approveOrderSchema = z.object({
    params: z.object({
        id: z.string().refine(val => !isNaN(Number(val)), {
            message: 'Order ID must be a numeric string'
        }).transform(Number)
    })
});
