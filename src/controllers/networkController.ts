import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getNetworkTree = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const rootId = req.query.rootId as string;

        // Determine the root. If none is passed, fallback to the first ADMIN we can find.
        let rootNode;
        if (rootId) {
            rootNode = await prisma.user.findUnique({ where: { id: rootId } });
        } else {
            rootNode = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        }

        if (!rootNode) {
            res.status(404).json({ error: 'Root node for tree not found' });
            return;
        }

        // A helper function to recursively fetch children (up to a particular depth if needed).
        const maxDepth = 5;

        const buildTree = async (parentId: string, currentDepth: number): Promise<any> => {
            if (currentDepth > maxDepth) {
                return [];
            }

            const children = await prisma.user.findMany({
                where: { parent_id: parentId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                }
            });

            const childrenWithSubtree: any[] = [];
            for (const child of children) {
                const grandChildren = await buildTree(child.id, currentDepth + 1);
                childrenWithSubtree.push({
                    ...child,
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
            children: await buildTree(rootNode.id, 1) // Start recursion
        };

        res.status(200).json({ tree: treeData });
    } catch (error) {
        console.error('Network tree error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
