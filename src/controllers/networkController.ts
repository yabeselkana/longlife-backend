import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

// Utility to find all downline IDs for a given member recursively
const getAllDownlineIds = async (memberId: string): Promise<string[]> => {
    const downlineIds: string[] = [];

    const getChildrenStr = async (parentId: string) => {
        const children = await prisma.member.findMany({
            where: { parent_id: parentId },
            select: { id: true }
        });

        for (const child of children) {
            downlineIds.push(child.id);
            await getChildrenStr(child.id);
        }
    };

    await getChildrenStr(memberId);
    return downlineIds;
};

export const getNetworkTree = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const rootId = req.query.rootId as string;

        // Determine the root based on role
        let rootNode: any;

        // If the requester is a MEMBER, they can only see their own tree
        // For simplicity, we force the rootId to be their own ID if they don't provide one, 
        // or ensure they can't query above their own level.
        // If the requester is a MEMBER, they can only see their own tree or a valid downline
        if (req.user?.role === 'MEMBER') {
            const requestedId = rootId || req.user.id;

            // Validate if requestedId is in their downline or is themselves
            if (requestedId !== req.user.id) {
                const allowedDownlines = await getAllDownlineIds(req.user.id);
                if (!allowedDownlines.includes(requestedId)) {
                    res.status(403).json({ error: 'Access denied: You can only view your own downline network.' });
                    return;
                }
            }

            rootNode = await prisma.member.findUnique({ where: { id: requestedId } });
            if (rootNode) rootNode.role = 'MEMBER';
        } else {
            // ADMIN logic
            const requestedId = rootId || req.user!.id;

            if (requestedId === req.user!.id) {
                // If the admin is querying their own root
                rootNode = await prisma.admin.findUnique({ where: { id: req.user!.id } });
                if (rootNode) rootNode.role = 'ADMIN';
            } else {
                // An admin is trying to query a specific rootId
                // It must be a member belonging to their admin network.
                // An admin cannot query another admin.
                const checkAdmin = await prisma.admin.findUnique({ where: { id: requestedId } });
                if (checkAdmin) {
                    res.status(403).json({ error: 'Access denied: You cannot view another Admin\'s network.' });
                    return;
                }

                rootNode = await prisma.member.findUnique({ where: { id: requestedId } });

                if (rootNode && rootNode.admin_id !== req.user!.id) {
                    res.status(403).json({ error: 'Access denied: This member is not in your network.' });
                    return;
                }

                if (rootNode) rootNode.role = 'MEMBER';
            }
        }

        if (!rootNode) {
            res.status(404).json({ error: 'Root node for tree not found' });
            return;
        }

        const maxDepth = 5;

        // Global counters for the requested tree
        let globalTotalNodes = 0;
        let globalActiveNodes = 0;
        let globalMaxDepth = 0;

        // Recursively build tree. Root can be Admin or Member, but children are always Members (or direct downlines for an Admin)
        const buildTree = async (parentId: string, currentDepth: number, parentRole: string): Promise<any> => {
            if (currentDepth > globalMaxDepth) {
                globalMaxDepth = currentDepth; // track deepest level reached
            }

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
                    phone: true,
                    city: true,
                    created_at: true,
                    personal_sales: true,
                    parent_id: true,
                    parent: { select: { name: true } },
                    admin: { select: { name: true } },
                    commissions: {
                        where: { status: 'PAID' },
                        select: { amount: true }
                    },
                    _count: {
                        select: { children: true }
                    }
                }
            });

            const childrenWithSubtree: any[] = [];
            for (const child of children) {
                globalTotalNodes++;
                if (child.status === 'ACTIVE') {
                    globalActiveNodes++;
                }

                const grandChildren = await buildTree(child.id, currentDepth + 1, 'MEMBER');

                const total_commissions = child.commissions.reduce((sum, c) => sum + Number(c.amount), 0);

                // Calculate deeply nested downline count
                const downline_count = grandChildren.length + grandChildren.reduce((acc: number, gc: any) => acc + (gc.downline_count || 0), 0);

                // remove commissions and parent relation object from output to save bandwidth
                const { commissions, parent, admin, _count, ...childData } = child;

                childrenWithSubtree.push({
                    ...childData,
                    total_commissions,
                    parent_name: parent?.name || admin?.name || null,
                    downline_count,
                    role: 'MEMBER',
                    children: grandChildren
                });
            }

            return childrenWithSubtree;
        };

        let rootTotalCommissions = 0;
        let rootPersonalSales = 0;
        let rootParentName: string | null = null;

        if (rootNode.parent_id && rootNode.role === 'MEMBER') {
            const parent = await prisma.member.findUnique({ where: { id: rootNode.parent_id }, select: { name: true } });
            if (parent) rootParentName = parent.name;
        } else if (rootNode.parent_id && rootNode.role === 'ADMIN') {
            const parentAdmin = await prisma.admin.findUnique({ where: { id: rootNode.parent_id }, select: { name: true } });
            if (parentAdmin) rootParentName = parentAdmin.name;
        }

        if (rootNode.role === 'MEMBER') {
            const commissions = await prisma.commission.findMany({
                where: { member_id: rootNode.id, status: 'PAID' },
                select: { amount: true }
            });
            rootTotalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
            rootPersonalSales = Number(rootNode.personal_sales) || 0;
        } else if (rootNode.role === 'ADMIN') {
            // all paid commissions to show total system payouts, or just mock as per request.
            // But if we want it to match exactly the screenshot, we can query total system commissions and sales
            // Restrict admin aggregate to ONLY their own members

            // First fetch all members for this admin
            const adminMembers = await prisma.member.findMany({
                where: { admin_id: rootNode.id },
                select: { id: true }
            });
            const adminMemberIds = adminMembers.map(m => m.id);

            if (adminMemberIds.length > 0) {
                const totalCommissions = await prisma.commission.aggregate({
                    where: {
                        status: 'PAID',
                        member_id: { in: adminMemberIds }
                    },
                    _sum: { amount: true }
                });
                rootTotalCommissions = Number(totalCommissions._sum.amount || 0);

                const totalSales = await prisma.order.aggregate({
                    where: {
                        status: 'APPROVED',
                        member_id: { in: adminMemberIds }
                    },
                    _sum: { total_amount: true }
                });
                rootPersonalSales = Number(totalSales._sum.total_amount || 0);
            } else {
                rootTotalCommissions = 0;
                rootPersonalSales = 0;
            }
        }

        // Count the root node itself if it's a member (or decide if admin counts as a node)
        if (rootNode) {
            globalTotalNodes++;
            if (rootNode.status === 'ACTIVE') {
                globalActiveNodes++;
            }
        }

        const rootChildren = await buildTree(rootNode.id, 1, rootNode.role);
        const rootDownlineCount = rootChildren.length + rootChildren.reduce((acc: number, gc: any) => acc + (gc.downline_count || 0), 0);

        const treeData: any = {
            id: rootNode.id,
            name: rootNode.name,
            email: rootNode.email,
            role: rootNode.role,
            status: rootNode.status,
            phone: rootNode.phone || null,
            city: rootNode.district || null,
            created_at: rootNode.created_at || new Date('2023-01-01').toISOString(),
            personal_sales: rootPersonalSales,
            parent_id: rootNode.parent_id || null,
            parent_name: rootParentName,
            total_commissions: rootTotalCommissions,
            downline_count: rootDownlineCount,
            total_nodes_in_tree: globalTotalNodes,
            active_nodes_in_tree: globalActiveNodes,
            max_depth_in_tree: globalMaxDepth,
            children: rootChildren
        };

        res.status(200).json({ tree: treeData });
    } catch (error) {
        console.error('Network tree error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({ error: 'Access denied: Only admins can delete members.' });
            return;
        }

        const id = req.params.id as string;

        const member = await prisma.member.findUnique({ where: { id } });

        if (!member) {
            res.status(404).json({ error: 'Member not found.' });
            return;
        }

        // Ensure the member belongs to the requesting admin's network
        if (member.admin_id !== req.user!.id) {
            res.status(403).json({ error: 'Access denied: This member is not in your network.' });
            return;
        }

        // Use a transaction to safely delete related records then the member
        await prisma.$transaction(async (tx) => {
            // Detach children from this member so they aren't cascade-deleted
            await tx.member.updateMany({
                where: { parent_id: id },
                data: { parent_id: null }
            });

            // Delete commissions tied to orders of this member first
            const memberOrders = await tx.order.findMany({
                where: { member_id: id },
                select: { id: true }
            });
            const orderIds = memberOrders.map(o => o.id);
            if (orderIds.length > 0) {
                await tx.commission.deleteMany({ where: { related_order_id: { in: orderIds } } });
            }

            // Delete commissions where this member is the recipient
            await tx.commission.deleteMany({ where: { member_id: id } });

            // Delete member's orders
            await tx.order.deleteMany({ where: { member_id: id } });

            // Delete invitations linked to this member
            await tx.invitation.deleteMany({ where: { parent_id: id } });

            // Finally delete the member
            await tx.member.delete({ where: { id } });
        });

        res.status(200).json({ message: 'Member deleted successfully.' });
    } catch (error) {
        console.error('Delete member error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const search = req.query.search as string | undefined;
        const sortBy = (req.query.sortBy as string) || 'created_at';
        const order = (req.query.order as string) || 'desc';
        const page = (req.query.page as string) || '1';
        const limit = (req.query.limit as string) || '10';

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
        // If the requester is a MEMBER, restrict the list to their entire downline hierarchy
        if (req.user?.role === 'MEMBER') {
            const downlineIds = await getAllDownlineIds(req.user.id);

            // If they have no downlines, return empty list immediately to save query
            if (downlineIds.length === 0) {
                res.status(200).json({
                    data: [],
                    meta: { total: 0, page: pageNumber, limit: limitNumber, totalPages: 0 }
                });
                return;
            }

            whereClause.id = { in: downlineIds };
        } else if (req.user?.role === 'ADMIN') {
            // If the requester is an ADMIN, restrict the list to members belonging to their network
            whereClause.admin_id = req.user!.id;
        }

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
                    parent: { select: { name: true } },
                    admin_id: true,
                    admin: { select: { name: true } },
                    commissions: {
                        where: { status: 'PAID' },
                        select: { amount: true }
                    },
                    _count: {
                        select: { children: true }
                    }
                }
            }),
            prisma.member.count({ where: whereClause })
        ]);

        const mappedMembers = members.map(m => {
            const total_commissions = m.commissions.reduce((sum, c) => sum + Number(c.amount), 0);
            const { commissions, parent, admin, _count, ...memberData } = m;
            return {
                ...memberData,
                parent_name: parent?.name || admin?.name || null,
                downline_count: _count.children,
                total_commissions
            };
        });

        res.status(200).json({
            data: mappedMembers,
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
