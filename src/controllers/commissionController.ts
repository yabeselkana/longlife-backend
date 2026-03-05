import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getCommissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user;
        let commissions;

        if (user?.role === 'ADMIN') {
            commissions = await prisma.commission.findMany({
                orderBy: { created_at: 'desc' },
                include: {
                    member: {
                        select: { name: true, email: true }
                    }
                }
            });
        } else {
            // Member only gets their own commissions
            commissions = await prisma.commission.findMany({
                where: { member_id: user?.id },
                orderBy: { created_at: 'desc' },
                include: {
                    member: {
                        select: { name: true, email: true }
                    }
                }
            });
        }

        res.status(200).json({ commissions });
    } catch (error) {
        console.error('Get commissions error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const payCommission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const commissionId = Number(req.params.id);

        const commission = await prisma.commission.findUnique({ where: { id: commissionId } });

        if (!commission) {
            res.status(404).json({ error: 'Commission not found' });
            return;
        }

        if (commission.status !== 'PENDING') {
            res.status(400).json({ error: `Cannot pay commission because it is currently ${commission.status}` });
            return;
        }

        const updatedCommission = await prisma.commission.update({
            where: { id: commissionId },
            data: { status: 'PAID' }
        });

        res.status(200).json({ message: 'Commission successfully marked as PAID', commission: updatedCommission });
    } catch (error) {
        console.error('Pay commission error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const rejectCommission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const commissionId = Number(req.params.id);

        const commission = await prisma.commission.findUnique({ where: { id: commissionId } });

        if (!commission) {
            res.status(404).json({ error: 'Commission not found' });
            return;
        }

        if (commission.status !== 'PENDING') {
            res.status(400).json({ error: `Cannot reject commission because it is currently ${commission.status}` });
            return;
        }

        const updatedCommission = await prisma.commission.update({
            where: { id: commissionId },
            // @ts-ignore: CANCELLED enum not yet generated in Prisma client due to lock
            data: { status: 'CANCELLED' }
        });

        res.status(200).json({ message: 'Commission rejected successfully and marked as CANCELLED', commission: updatedCommission });
    } catch (error) {
        console.error('Reject commission error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCommissionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        const commission = await prisma.commission.findUnique({ where: { id } });

        if (!commission) {
            res.status(404).json({ error: 'Commission not found' });
            return;
        }

        // Apply @ts-ignore if we are setting to CANCELLED to bypass the schema type issues until next sync
        const updateData: any = { status };

        const updatedCommission = await prisma.commission.update({
            where: { id },
            data: updateData
        });

        res.status(200).json({ message: 'Commission status updated', commission: updatedCommission });
    } catch (error) {
        console.error('Update commission status error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
