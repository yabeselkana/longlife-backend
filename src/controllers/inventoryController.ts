import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const inventory = await prisma.inventory.findMany({
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ data: inventory });
    } catch (error) {
        console.error('Get inventory error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createInventory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sku, name, price, cost, stock = 0 } = req.body;

        const existingItem = await prisma.inventory.findUnique({ where: { sku } });
        if (existingItem) {
            res.status(400).json({ error: 'Item with this SKU already exists' });
            return;
        }

        const newItem = await prisma.inventory.create({
            data: {
                sku,
                name,
                price,
                cost,
                stock
            }
        });

        res.status(201).json({ message: 'Inventory item created successfully', data: newItem });
    } catch (error) {
        console.error('Create inventory error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sku } = req.params;
        const skuString = Array.isArray(sku) ? sku[0] : sku;
        const { name, price, cost, stock, sold } = req.body;

        const existingItem = await prisma.inventory.findUnique({ where: { sku: skuString } });
        if (!existingItem) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        const updatedItem = await prisma.inventory.update({
            where: { sku: skuString },
            data: {
                ...(name !== undefined && { name }),
                ...(price !== undefined && { price }),
                ...(cost !== undefined && { cost }),
                ...(stock !== undefined && { stock }),
                ...(sold !== undefined && { sold })
            }
        });

        res.status(200).json({ message: 'Inventory item updated successfully', data: updatedItem });
    } catch (error) {
        console.error('Update inventory error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteInventory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sku } = req.params;
        const skuString = Array.isArray(sku) ? sku[0] : sku;

        // Check if item exists
        const existingItem = await prisma.inventory.findUnique({ where: { sku: skuString } });
        if (!existingItem) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        // Check if item is tied to any orders (foreign key constraint guard)
        const orderCount = await prisma.order.count({ where: { sku: skuString } });
        if (orderCount > 0) {
            res.status(400).json({ error: 'Cannot delete item because it is associated with existing orders' });
            return;
        }

        await prisma.inventory.delete({ where: { sku: skuString } });

        res.status(200).json({ message: 'Inventory item deleted successfully' });
    } catch (error) {
        console.error('Delete inventory error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
