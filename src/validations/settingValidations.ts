import { z } from 'zod';

export const updateSettingsSchema = z.object({
    body: z.object({
        base_commission_percentage: z.number().min(0).max(100).optional(),
        halving_logic: z.string().optional(),
        reduction_factor: z.number().min(0).max(1).optional(),
        max_depth_limit: z.number().int().min(1).optional(),
        effective_date: z.string().datetime().optional(),

        min_payout_threshold: z.number().min(0).optional(),
        supported_methods: z.string().optional(),
        payout_cycle: z.enum(['Weekly', 'Monthly']).optional(),
        automatic_approvals: z.boolean().optional(),

        max_order_limit: z.number().int().min(1).optional(),
        low_stock_threshold: z.number().int().min(0).optional(),
        invite_expiration_days: z.number().int().min(1).optional(),

        system_lock: z.boolean().optional(),
    })
});
