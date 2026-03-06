import prisma from '../config/db';

/**
 * 3-Level Halving Logic:
 * Level 1: 25%
 * Level 2: 12.5%
 * Level 3: 6.25%
 */
export const generateCommission = async (
    order_amount: number,
    current_child_id: string,
    related_order_id: number,
    prismaClient: any = prisma
): Promise<void> => {
    // Fetch system settings
    const settings = await prismaClient.systemSetting.findFirst();

    // Default values if settings not found
    const baseRate = settings ? Number(settings.base_commission_percentage) / 100 : 0.25;
    const maxDepth = settings ? settings.max_depth_limit : 3;
    const halvingLogic = settings ? settings.halving_logic : 'Standard';

    // Halving logic calculation
    const rates: number[] = [];
    let currentRate = baseRate;

    // Determine the reduction factor based on logic
    let factor = 0.5; // Default halving
    if (halvingLogic === 'Standard') {
        factor = 0.5;
    } else if (halvingLogic === 'Conservative') {
        factor = 0.4;
    } else if (halvingLogic === 'Aggressive') {
        factor = 0.25;
    } else if (halvingLogic === 'Fixed') {
        factor = 1.0;
    } else if (halvingLogic === 'Custom') {
        // Use the custom factor from database if available
        factor = settings ? Number(settings.reduction_factor) : 0.5;
    }

    for (let i = 0; i < maxDepth; i++) {
        rates.push(currentRate);
        currentRate = currentRate * factor;
    }

    let currentId = current_child_id;

    for (let i = 0; i < maxDepth; i++) {
        // Find the parent of the current node
        const user = await prismaClient.member.findUnique({
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
        await prismaClient.commission.create({
            data: {
                member_id: parentId,
                related_order_id,
                amount: commission_amount,
                type: 'Network Bonus',
                status: 'PAID', // Assuming auto-approve for now
            }
        });

        // Move up the tree for the next iteration
        currentId = parentId;
    }
};
