import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const generateInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let parent_id: string | null = null;
        let admin_id: string | null = null;

        if (userRole === 'ADMIN') {
            admin_id = userId;
            const { target_parent_id } = req.body;
            if (target_parent_id) {
                parent_id = target_parent_id;
            }
        } else if (userRole === 'MEMBER') {
            parent_id = userId;
        } else {
            res.status(400).json({ error: 'Invalid user role' });
            return;
        }

        const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `INV-${randomString}`;

        const invitation = await prisma.invitation.create({
            data: {
                code,
                parent_id,
                admin_id,
                status: 'PENDING'
            }
        });

        res.status(201).json({
            message: 'Invitation code generated successfully',
            invitation
        });
    } catch (error) {
        console.error('Generate invitation error', error);
        res.status(500).json({ error: 'Internal server error while generating invitation' });
    }
};

export const getAllInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (userRole === 'ADMIN') {
            const invitations = await prisma.invitation.findMany({
                orderBy: { created_at: 'desc' },
                include: {
                    parent: { select: { name: true, email: true } },
                    admin: { select: { name: true, email: true } }
                }
            });
            res.status(200).json({ invitations });
        } else {
            const invitations = await prisma.invitation.findMany({
                where: { parent_id: userId },
                orderBy: { created_at: 'desc' }
            });
            res.status(200).json({ invitations });
        }
    } catch (error) {
        console.error('Get all invitations error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
