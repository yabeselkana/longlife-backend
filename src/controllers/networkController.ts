import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getNetworkTree = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const rootId = req.query.rootId as string;

        // Determine the root.
        let rootNode: any;
        if (rootId) {
            // Check Admin first
            rootNode = await prisma.admin.findUnique({ where: { id: rootId } });
            if (rootNode) rootNode.role = 'ADMIN';

            // Check Member if not found in Admin
            if (!rootNode) {
                rootNode = await prisma.member.findUnique({ where: { id: rootId } });
                if (rootNode) rootNode.role = 'MEMBER';
            }
        } else {
            rootNode = await prisma.admin.findFirst();
            if (rootNode) rootNode.role = 'ADMIN';
        }

        if (!rootNode) {
            res.status(404).json({ error: 'Root node for tree not found' });
            return;
        }

        const maxDepth = 5;

        // Recursively build tree. Root can be Admin or Member, but children are always Members (or direct downlines for an Admin)
        const buildTree = async (parentId: string, currentDepth: number, parentRole: string): Promise<any> => {
            if (currentDepth > maxDepth) {
                return [];
            }

            // If the parent is an ADMIN, its direct "children" are members where admin_id = parentId AND parent_id = null (the true root members)
            // If the parent is a MEMBER, its direct children are members where parent_id = parentId
            const whereClause = parentRole === 'ADMIN'
                ? { admin_id: parentId, parent_id: null }
                : { parent_id: parentId };

            const children = await prisma.member.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                }
            });

            const childrenWithSubtree: any[] = [];
            for (const child of children) {
                const grandChildren = await buildTree(child.id, currentDepth + 1, 'MEMBER');
                childrenWithSubtree.push({
                    ...child,
                    role: 'MEMBER',
                    children: grandChildren
                });
            }

            return childrenWithSubtree;
        };

        const treeData = {
            id: rootNode.id,
            name: rootNode.name,
            email: rootNode.email,
            role: rootNode.role,
            status: rootNode.status,
            children: await buildTree(rootNode.id, 1, rootNode.role)
        };

        res.status(200).json({ tree: treeData });
    } catch (error) {
        console.error('Network tree error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { search, sortBy = 'created_at', order = 'desc', page = '1', limit = '10' } = req.query;

        const pageNumber = parseInt(page as string, 10) || 1;
        const limitNumber = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        // Valid sorting fields
        const validSortFields = ['name', 'email', 'status', 'created_at', 'personal_sales'];
        const orderByField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'created_at';
        const orderByDirection = order === 'asc' ? 'asc' : 'desc';

        // Build the where clause for search
        const whereClause: any = search
            ? {
                OR: [
                    { name: { contains: search as string, mode: 'insensitive' } },
                    { email: { contains: search as string, mode: 'insensitive' } }
                ]
            }
            : {};

        const [members, total] = await Promise.all([
            prisma.member.findMany({
                where: whereClause,
                orderBy: { [orderByField]: orderByDirection },
                skip,
                take: limitNumber,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    city: true,
                    status: true,
                    personal_sales: true,
                    created_at: true,
                    parent_id: true,
                    admin_id: true
                }
            }),
            prisma.member.count({ where: whereClause })
        ]);

        res.status(200).json({
            data: members,
            meta: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber)
            }
        });
    } catch (error) {
        console.error('Get members error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
