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
                    },
                    order: {
                        select: { total_amount: true }
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

export const updateCommission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const { amount, member_id, type, status } = req.body;

        const commission = await prisma.commission.findUnique({ where: { id } });

        if (!commission) {
            res.status(404).json({ error: 'Commission not found' });
            return;
        }

        const updateData: any = {};
        if (amount !== undefined) updateData.amount = Number(amount);
        if (member_id !== undefined) updateData.member_id = member_id;
        if (type !== undefined) updateData.type = type;
        if (status !== undefined) updateData.status = status;

        const updated = await prisma.commission.update({
            where: { id },
            data: updateData
        });

        res.status(200).json({ message: 'Commission updated successfully', commission: updated });
    } catch (error) {
        console.error('Update commission error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteCommission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const commission = await prisma.commission.findUnique({ where: { id } });

        if (!commission) {
            res.status(404).json({ error: 'Commission not found' });
            return;
        }

        await prisma.commission.delete({ where: { id } });

        res.status(200).json({ message: 'Commission deleted successfully' });
    } catch (error) {
        console.error('Delete commission error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createCommission = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { member_id, amount, type, related_order_id, status } = req.body;

        if (!member_id || !amount) {
            res.status(400).json({ error: 'member_id and amount are required' });
            return;
        }

        const newCommission = await prisma.commission.create({
            data: {
                member_id,
                amount: Number(amount),
                type: type || 'Manual Bonus',
                related_order_id: related_order_id ? Number(related_order_id) : undefined,
                status: status || 'PENDING'
            }
        });

        res.status(201).json({ message: 'Commission created successfully', commission: newCommission });
    } catch (error) {
        console.error('Create commission error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
