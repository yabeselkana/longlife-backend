import { z } from 'zod';

export const createInventorySchema = z.object({
    body: z.object({
        sku: z.string().min(1, 'SKU is required'),
        name: z.string().min(1, 'Product name is required'),
        price: z.coerce.number().positive('Price must be a positive number'),
        cost: z.coerce.number().nonnegative('Cost must be a positive number or zero'),
        stock: z.coerce.number().int().nonnegative('Stock must be an integer (>= 0)').optional()
    })
});

export const updateInventorySchema = z.object({
    params: z.object({
        sku: z.string().min(1, 'SKU parameter is required')
    }),
    body: z.object({
        name: z.string().min(1, 'Product name cannot be empty').optional(),
        price: z.coerce.number().positive('Price must be a positive number').optional(),
        cost: z.coerce.number().nonnegative('Cost must be a positive number or zero').optional(),
        stock: z.coerce.number().int().nonnegative('Stock must be a valid integer').optional(),
        sold: z.coerce.number().int().nonnegative('Sold items must be a valid integer').optional()
    })
});

export const deleteInventorySchema = z.object({
    params: z.object({
        sku: z.string().min(1, 'SKU parameter is required')
    })
});
