import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        let settings = await prisma.systemSetting.findFirst();

        // If no settings exist, create default ones
        if (!settings) {
            settings = await prisma.systemSetting.create({
                data: {} // Uses defaults from schema
            });
        }

        res.status(200).json({ settings });
    } catch (error) {
        console.error('Get settings error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const currentSettings = await prisma.systemSetting.findFirst();

        let updatedSettings;
        if (currentSettings) {
            updatedSettings = await prisma.systemSetting.update({
                where: { id: currentSettings.id },
                data: req.body
            });
        } else {
            updatedSettings = await prisma.systemSetting.create({
                data: req.body
            });
        }

        res.status(200).json({ message: 'Settings updated successfully', settings: updatedSettings });
    } catch (error) {
        console.error('Update settings error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
