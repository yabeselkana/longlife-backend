import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        phone: z.string().optional(),
        role: z.enum(['ADMIN', 'MEMBER']).optional(),
        invitation_code: z.string().optional()
    }).refine((data) => {
        if (data.role === 'MEMBER' && !data.invitation_code) {
            return false;
        }
        return true;
    }, {
        message: 'invitation_code is required for member registration',
        path: ['invitation_code']
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format').optional(),
        id: z.string().uuid('Invalid user ID format').optional(),
        password: z.string().min(1, 'Password is required')
    }).refine(data => data.email || data.id, {
        message: 'Either email or id must be provided',
        path: ['email']
    })
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        password: z.string().min(6, 'Password must be at least 6 characters').optional(),
        identity_id: z.string().optional(),
        avatar: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        province: z.string().optional(),
        district: z.string().optional(),
        sub_district: z.string().optional(),
        village: z.string().optional(),
        rw: z.string().optional(),
        rt: z.string().optional(),
        occupation: z.string().optional(),
        bank_name: z.string().optional(),
        bank_account: z.string().optional(),
        bank_owner: z.string().optional(),
    })
});

export const generateInvitationSchema = z.object({
    body: z.object({
        target_parent_id: z.string().uuid('target_parent_id must be a valid UUID').optional()
    })
});
