import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module.js';
import { Database } from '../database.js';
import { Role } from '../../../users/schema/role.entity.js';

const ROLES_SEED_DATA = [
    {
        name: 'ADMIN',
        displayName: 'Super Administrator',
        description: 'Platform owner with full system access',
    },
    {
        name: 'SELLER',
        displayName: 'Store Seller',
        description: 'Can manage products, inventory, and fulfill orders',
    },
    {
        name: 'BUYER',
        displayName: 'Customer',
        description: 'Can browse products and purchase items',
    },
];

async function runSeed() {
    console.log('[Seed] Starting database seeding...');

    // 1. Create a headless NestJS context (loads .env and Database connection)
    const app = await NestFactory.createApplicationContext(AppModule);

    // 2. Get the database connection directly
    const database = app.get(Database);
    const roleRepository = database.dataSource.getRepository(Role);

    // 3. Seed Roles
    console.log('[Seed] Seeding roles...');
    for (const roleData of ROLES_SEED_DATA) {
        const existing = await roleRepository.findOne({ where: { name: roleData.name } });
        if (!existing) {
            await roleRepository.save(roleRepository.create(roleData));
            console.log(`  \x1b[32m- Added role: ${roleData.name} (${roleData.displayName})\x1b[0m`);
        } else {
            console.log(`  \x1b[33m- Role already exists: ${roleData.name}\x1b[0m`);
        }
    }

    console.log('[Seed] Seeding completed successfully.');
    await app.close();
    process.exit(0);
}

runSeed().catch((err) => {
    console.error('[Error] Seeding failed:', err);
    process.exit(1);
});