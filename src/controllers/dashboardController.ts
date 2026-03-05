import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getMemberSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const memberId = req.user?.id;

        if (!memberId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // My Earnings (Total Commissions)
        const commissions = await prisma.commission.aggregate({
            where: { member_id: memberId, status: 'PAID' },
            _sum: { amount: true }
        });

        // My Orders summary
        const orders = await prisma.order.findMany({
            where: { member_id: memberId },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        // My Referrals summary
        const referrals = await prisma.member.findMany({
            where: { parent_id: memberId },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                created_at: true,
            }
        });

        const totalEarnings = commissions._sum.amount ? commissions._sum.amount : 0;

        res.status(200).json({
            summary: {
                totalEarnings,
                recentOrders: orders,
                totalReferrals: referrals.length,
                referrals
            }
        });

    } catch (error) {
        console.error('Member summary error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAdminSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Total Revenue from Approved Orders
        const approvedOrders = await prisma.order.aggregate({
            where: { status: 'APPROVED' },
            _sum: { total_amount: true }
        });

        // Total Paid Out Commissions
        const paidCommissions = await prisma.commission.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        });

        // Total Paid Expenses
        const paidExpenses = await prisma.expense.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        });

        const topPerformers = await prisma.member.findMany({
            orderBy: { personal_sales: 'desc' },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true,
                personal_sales: true,
                created_at: true
            }
        });

        // Revenue Analytics (For Charts)
        const approvedOrdersAll = await prisma.order.findMany({
            where: { status: 'APPROVED' },
            select: { total_amount: true, created_at: true }
        });

        const dayMap: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dayMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
        }

        const monthMap: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            monthMap[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
        }

        const yearMap: Record<string, number> = {};
        for (let i = 2; i >= 0; i--) {
            yearMap[(new Date().getFullYear() - i).toString()] = 0;
        }

        approvedOrdersAll.forEach(o => {
            const d = new Date(o.created_at);
            const amt = Number(o.total_amount);

            const dayKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dayMap[dayKey] !== undefined) dayMap[dayKey] += amt;

            const monthKey = d.toLocaleDateString('en-US', { month: 'short' });
            if (monthMap[monthKey] !== undefined) monthMap[monthKey] += amt;

            const yearKey = d.getFullYear().toString();
            if (yearMap[yearKey] !== undefined) yearMap[yearKey] += amt;
        });

        const revenueAnalytics = {
            day: Object.entries(dayMap).map(([name, sales]) => ({ name, sales })),
            month: Object.entries(monthMap).map(([name, sales]) => ({ name, sales })),
            year: Object.entries(yearMap).map(([name, sales]) => ({ name, sales }))
        };

        const totalRevenue = Number(approvedOrders._sum.total_amount || 0);
        const totalCommissions = Number(paidCommissions._sum.amount || 0);
        const totalExpenses = Number(paidExpenses._sum.amount || 0);

        const netProfit = totalRevenue - totalCommissions - totalExpenses;

        res.status(200).json({
            summary: {
                totalRevenue,
                totalCommissions,
                totalExpenses,
                netProfit,
                topPerformers,
                revenueAnalytics
            }
        });
    } catch (error) {
        console.error('Admin summary error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
