import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, city, invitation_code } = req.body;

        if (!name || !email || !password || !invitation_code) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Check if email exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        // Validate Invitation Code
        const invitation = await prisma.invitation.findUnique({ where: { code: invitation_code } });

        if (!invitation) {
            res.status(400).json({ error: 'Invalid invitation code' });
            return;
        }

        if (invitation.status !== 'PENDING') {
            res.status(400).json({ error: 'Invitation code has already been used or is cancelled' });
            return;
        }

        // Hash Password
        const password_hash = await bcrypt.hash(password, 10);

        // Create User and Update Invitation in a Transaction
        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password_hash,
                    phone,
                    city,
                    role: 'MEMBER',
                    status: 'ACTIVE',
                    parent_id: invitation.parent_id,
                },
            });

            await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: 'USED' },
            });

            return user;
        });

        // Generate JWT
        const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                parent_id: newUser.parent_id
            },
        });
    } catch (error) {
        console.error('Registration error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, id, password } = req.body;

        if (!password) {
            res.status(400).json({ error: 'Password is required' });
            return;
        }

        if (!email && !id) {
            res.status(400).json({ error: 'Email or ID is required' });
            return;
        }

        // Find User
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined },
                    { id: id || undefined }
                ]
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Validate Password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate JWT
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const generateInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parent_id = req.user?.id;
        if (!parent_id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Generate a simple random alphanumeric code (e.g., INV-XXXX)
        const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `INV-${randomString}`;

        const invitation = await prisma.invitation.create({
            data: {
                code,
                parent_id,
                status: 'PENDING'
            }
        });

        res.status(201).json({
            message: 'Invitation code generated',
            invitation
        });
    } catch (error) {
        console.error('Generate invitation error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
