import { Request, Response } from 'express';
import prisma from '../config/db';
import { generateCommission } from '../services/commissionService';
import { AuthRequest } from '../middlewares/authMiddleware';
import { OrderStatus } from '@prisma/client';

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                member: { select: { name: true, email: true } },
                product: { select: { name: true, price: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ orders });
    } catch (error) {
        console.error('Get all orders error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const member_id = req.user?.id;
        if (!member_id) {
            res.status(400).json({ error: 'Member not found' });
            return;
        }

        const orders = await prisma.order.findMany({
            where: { member_id },
            include: {
                product: { select: { name: true, price: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ orders });
    } catch (error) {
        console.error('Get my orders error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sku, qty } = req.body;
        const member_id = req.user?.id;

        if (!member_id || !sku || !qty) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const product = await prisma.inventory.findUnique({ where: { sku } });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        if (product.stock < qty) {
            res.status(400).json({ error: 'Insufficient stock' });
            return;
        }

        const total_amount = Number(product.price) * qty;

        const order = await prisma.order.create({
            data: {
                member_id,
                sku,
                qty,
                total_amount,
                status: 'PENDING'
            }
        });

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        console.error('Create order error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const approveOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const orderId = Number(req.params.id);

        // Using transaction to ensure stock update and commission logic are atomic
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { product: true }
            });

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status === 'APPROVED') {
                throw new Error('Order is already approved');
            }

            if (order.product.stock < order.qty) {
                throw new Error('Insufficient stock to approve this order');
            }

            // Update Order Status
            const approvedOrder = await tx.order.update({
                where: { id: orderId },
                data: { status: 'APPROVED' }
            });

            // Update Stock and Sold
            await tx.inventory.update({
                where: { sku: order.sku },
                data: {
                    stock: { decrement: order.qty },
                    sold: { increment: order.qty }
                }
            });

            // Update Personal Sales for member
            await tx.member.update({
                where: { id: order.member_id },
                data: {
                    personal_sales: { increment: order.total_amount }
                }
            });

            // Trigger Commission Halving Logic
            // Passing tx might be tricky since commissionService uses the global prisma instance, 
            // but in a real-world scenario you'd pass the transaction client (tx).
            // For this implementation, we will perform it after the transaction or inline it here.
            // Refactoring it inline to ensure transactional integrity:

            const rates = [0.25, 0.125, 0.0625];
            let currentId = order.member_id;

            for (let i = 0; i < 3; i++) {
                const user = await tx.member.findUnique({
                    where: { id: currentId },
                    select: { parent_id: true }
                });

                if (!user || !user.parent_id) break;

                const commission_amount = Number(order.total_amount) * rates[i];

                await tx.commission.create({
                    data: {
                        member_id: user.parent_id,
                        related_order_id: approvedOrder.id,
                        amount: commission_amount,
                        type: 'Network Bonus',
                        status: 'PENDING'
                    }
                });

                currentId = user.parent_id;
            }
        });

        res.status(200).json({ message: 'Order approved and commissions generated' });
    } catch (error: any) {
        console.error('Approve order error', error);
        res.status(400).json({ error: error.message || 'Internal server error' });
    }
};

export const rejectOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const orderId = Number(req.params.id);

        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        if (order.status !== 'PENDING') {
            res.status(400).json({ error: `Order cannot be cancelled because it is already ${order.status}` });
            return;
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
        });

        res.status(200).json({ message: 'Order rejected and cancelled successfully' });
    } catch (error) {
        console.error('Reject order error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

