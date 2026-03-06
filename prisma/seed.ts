import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding system settings...');

    const settings = await prisma.systemSetting.findFirst();

    if (!settings) {
        await prisma.systemSetting.create({
            data: {
                base_commission_percentage: 25.00,
                halving_logic: 'Standard',
                reduction_factor: 0.50,
                max_depth_limit: 10,
                min_payout_threshold: 500000.00,
                supported_methods: 'Bank Transfer',
                payout_cycle: 'Weekly',
                automatic_approvals: false,
                max_order_limit: 50,
                low_stock_threshold: 20,
                invite_expiration_days: 7,
                system_lock: false,
            }
        });
        console.log('Initial system settings created.');
    } else {
        console.log('System settings already exist, skipping.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
