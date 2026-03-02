import prisma from '../config/db';

/**
 * 3-Level Halving Logic:
 * Level 1: 25%
 * Level 2: 12.5%
 * Level 3: 6.25%
 */
export const generateCommission = async (order_amount: number, current_child_id: string, related_order_id: number): Promise<void> => {
    const rates = [0.25, 0.125, 0.0625];
    let currentId = current_child_id;

    for (let i = 0; i < 3; i++) {
        // Find the parent of the current node
        const user = await prisma.user.findUnique({
            where: { id: currentId },
            select: { parent_id: true }
        });

        if (!user || !user.parent_id) {
            // Reached the top of the tree (Admin) or user not finding parent
            break;
        }

        const parentId = user.parent_id;
        const commission_amount = order_amount * rates[i];

        // Insert commission for the parent
        await prisma.commission.create({
            data: {
                member_id: parentId,
                related_order_id,
                amount: commission_amount,
                type: 'Network Bonus',
                status: 'PAID', // Assuming auto-approve for now based on requirement statement
            }
        });

        // Move up the tree for the next iteration
        currentId = parentId;
    }
};
