import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // Token member = 1 hari
const JWT_ADMIN_EXPIRES_IN = process.env.JWT_ADMIN_EXPIRES_IN || '8h'; // Token admin = 8 jam

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, city, invitation_code, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Check if email exists in Admin or Member
        const existingAdmin = await prisma.admin.findUnique({ where: { email } });
        const existingMember = await prisma.member.findUnique({ where: { email } });
        if (existingAdmin || existingMember) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const userRole = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
        let parent_id: string | null = null;
        let admin_id: string | null = null;
        const expiresIn = userRole === 'ADMIN' ? JWT_ADMIN_EXPIRES_IN : JWT_EXPIRES_IN;

        if (userRole === 'MEMBER') {
            if (invitation_code) {
                const invitation = await prisma.invitation.findUnique({
                    where: { code: invitation_code },
                    include: { parent: true, admin: true }
                });

                if (!invitation) {
                    res.status(400).json({ error: 'Invalid invitation code' });
                    return;
                }

                if (invitation.status !== 'PENDING') {
                    res.status(400).json({ error: 'Invitation code has already been used or is cancelled' });
                    return;
                }

                parent_id = invitation.parent_id;
                // Admin ID is inherited from the parent if a parent exists, otherwise directly from the Admin who created the invitation
                admin_id = invitation.parent ? invitation.parent.admin_id : (invitation.admin_id || null);

                if (!admin_id) {
                    res.status(400).json({ error: 'Invitation does not have a valid admin association' });
                    return;
                }
            } else {
                // Direct registration without invitation code: Directly under admin (Root Member)
                const topAdmin = await prisma.admin.findFirst();
                if (!topAdmin) {
                    res.status(500).json({ error: 'System configuration error: No admins exist' });
                    return;
                }
                admin_id = topAdmin.id;
                parent_id = null;
            }

            // BINARY TREE LOGIC: Max 2 downlines per sponsor
            if (parent_id) {
                const childrenCount = await prisma.member.count({
                    where: { parent_id }
                });

                if (childrenCount >= 2) {
                    res.status(400).json({ error: 'The sponsor member already has a maximum of 2 downlines' });
                    return;
                }
            }

            const password_hash = await bcrypt.hash(password, 10);

            const newMember = await prisma.$transaction(async (tx: any) => {
                const member = await tx.member.create({
                    data: {
                        name,
                        email,
                        password_hash,
                        phone,
                        city,
                        status: 'ACTIVE',
                        admin_id,
                        parent_id,
                    },
                });

                if (invitation_code) {
                    await tx.invitation.update({
                        where: { code: invitation_code },
                        data: { status: 'USED' },
                    });
                }

                return member;
            });

            const token = jwt.sign({ id: newMember.id, role: 'MEMBER' }, JWT_SECRET, { expiresIn: expiresIn as any });

            res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            res.status(201).json({
                message: 'Member registration successful',
                token,
                user: {
                    id: newMember.id,
                    name: newMember.name,
                    email: newMember.email,
                    phone: newMember.phone,
                    city: newMember.city,
                    role: 'MEMBER',
                    parent_id: newMember.parent_id,
                    admin_id: newMember.admin_id,
                },
            });

        } else {
            // Admin Registration
            const password_hash = await bcrypt.hash(password, 10);

            const newAdmin = await prisma.admin.create({
                data: {
                    name,
                    email,
                    password_hash,
                    phone,
                    city,
                    status: 'ACTIVE',
                },
            });

            const token = jwt.sign({ id: newAdmin.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: expiresIn as any });

            res.cookie('token', token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
            res.status(201).json({
                message: 'Admin registration successful',
                token,
                user: {
                    id: newAdmin.id,
                    name: newAdmin.name,
                    email: newAdmin.email,
                    phone: newAdmin.phone,
                    city: newAdmin.city,
                    role: 'ADMIN',
                },
            });
        }
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

        // Check Admin table
        let user: any = await prisma.admin.findFirst({
            where: {
                OR: [{ email: email || undefined }, { id: id || undefined }]
            },
        });
        let userRole = 'ADMIN';

        // Check Member table if not found in Admin
        if (!user) {
            user = await prisma.member.findFirst({
                where: {
                    OR: [{ email: email || undefined }, { id: id || undefined }]
                },
            });
            userRole = 'MEMBER';
        }

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const expiresIn = userRole === 'ADMIN' ? JWT_ADMIN_EXPIRES_IN : JWT_EXPIRES_IN;
        const token = jwt.sign({ id: user.id, role: userRole }, JWT_SECRET, { expiresIn: expiresIn as any });
        const maxAge = userRole === 'ADMIN' ? 8 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

        res.cookie('token', token, { httpOnly: true, maxAge });
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: userRole,
            },
        });
    } catch (error) {
        console.error('Login error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const logout = (req: Request, res: Response): void => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let profile;
        if (userRole === 'ADMIN') {
            profile = await prisma.admin.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, city: true, identity_id: true, avatar: true, address: true, country: true, province: true, district: true, sub_district: true, village: true, rw: true, rt: true, occupation: true, bank_name: true, bank_account: true, bank_owner: true, status: true, created_at: true } });
        } else {
            profile = await prisma.member.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, city: true, identity_id: true, avatar: true, address: true, country: true, province: true, district: true, sub_district: true, village: true, rw: true, rt: true, occupation: true, bank_name: true, bank_account: true, bank_owner: true, status: true, personal_sales: true, parent_id: true, admin_id: true, created_at: true } });
        }

        if (!profile) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        res.status(200).json({ profile });
    } catch (error) {
        console.error('Get profile error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { name, phone, city, password, identity_id, avatar, address, country, province, district, sub_district, village, rw, rt, occupation, bank_name, bank_account, bank_owner } = req.body;

        if (!userId || !userRole) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (city) updateData.city = city;
        if (identity_id) updateData.identity_id = identity_id;
        if (avatar) updateData.avatar = avatar;
        if (address) updateData.address = address;
        if (country) updateData.country = country;
        if (province) updateData.province = province;
        if (district) updateData.district = district;
        if (sub_district) updateData.sub_district = sub_district;
        if (village) updateData.village = village;
        if (rw) updateData.rw = rw;
        if (rt) updateData.rt = rt;
        if (occupation) updateData.occupation = occupation;
        if (bank_name) updateData.bank_name = bank_name;
        if (bank_account) updateData.bank_account = bank_account;
        if (bank_owner) updateData.bank_owner = bank_owner;
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        let updatedProfile;
        if (userRole === 'ADMIN') {
            updatedProfile = await prisma.admin.update({
                where: { id: userId },
                data: updateData,
                select: { id: true, name: true, email: true, phone: true, city: true, identity_id: true, avatar: true, address: true, country: true, province: true, district: true, sub_district: true, village: true, rw: true, rt: true, occupation: true, bank_name: true, bank_account: true, bank_owner: true, status: true }
            });
        } else {
            updatedProfile = await prisma.member.update({
                where: { id: userId },
                data: updateData,
                select: { id: true, name: true, email: true, phone: true, city: true, identity_id: true, avatar: true, address: true, country: true, province: true, district: true, sub_district: true, village: true, rw: true, rt: true, occupation: true, bank_name: true, bank_account: true, bank_owner: true, status: true }
            });
        }

        res.status(200).json({ message: 'Profile updated successfully', profile: updatedProfile });
    } catch (error) {
        console.error('Update profile error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Soft delete by updating status to INACTIVE
        if (userRole === 'ADMIN') {
            await prisma.admin.update({
                where: { id: userId },
                data: { status: 'INACTIVE' }
            });
        } else {
            await prisma.member.update({
                where: { id: userId },
                data: { status: 'INACTIVE' }
            });
        }

        res.clearCookie('token');
        res.status(200).json({ message: 'Account deleted (deactivated) successfully' });
    } catch (error) {
        console.error('Delete profile error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
