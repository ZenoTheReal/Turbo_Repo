import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { AppModule } from '../../../app.module.js';
import { Database } from '../database.js';
import { User } from '../../../users/schema/user.entity.js';
import { Role } from '../../../users/schema/role.entity.js';

const ADMIN_CREDENTIALS = {
    name: 'Super Admin',
    email: 'admin@yopmail.com',
    password: 'Admin@123',
    roleName: 'ADMIN',
};

async function runAdminSeed() {
    console.log('🌱 Starting Admin user seeding...');

    // 1. Create a headless NestJS context (loads config and DB connection)
    const app = await NestFactory.createApplicationContext(AppModule);

    // 2. Get TypeORM repositories
    const database = app.get(Database);
    const userRepository = database.dataSource.getRepository(User);
    const roleRepository = database.dataSource.getRepository(Role);

    // 3. Find the ADMIN role entity
    const adminRole = await roleRepository.findOne({
        where: { name: ADMIN_CREDENTIALS.roleName },
    });

    if (!adminRole) {
        console.error(
            `❌ Error: Role '${ADMIN_CREDENTIALS.roleName}' not found. Please run 'yarn workspace api-gateway role:seed' first.`,
        );
        await app.close();
        process.exit(1);
    }

    // 4. Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
        where: { email: ADMIN_CREDENTIALS.email },
    });

    if (existingAdmin) {
        if (!existingAdmin.isEmailVerified) {
            existingAdmin.isEmailVerified = true;
            await userRepository.save(existingAdmin);
            console.log(`  \x1b[32m- Updated existing Admin user: set isEmailVerified = true\x1b[0m`);
        } else {
            console.log(`  \x1b[33m- Admin user already exists: ${ADMIN_CREDENTIALS.email}\x1b[0m`);
        }
    } else {
        // 5. Hash the password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, salt);

        // 6. Save admin user linked to the ADMIN role
        const adminUser = userRepository.create({
            name: ADMIN_CREDENTIALS.name,
            email: ADMIN_CREDENTIALS.email,
            password: hashedPassword,
            role: adminRole,
            isEmailVerified: true,
        });

        await userRepository.save(adminUser);
        console.log(
            `  \x1b[32m✔ Created Admin user: ${ADMIN_CREDENTIALS.email} (Role: ${adminRole.name})\x1b[0m`,
        );
    }

    console.log('✅ Admin seeding completed successfully!');
    await app.close();
    process.exit(0);
}

runAdminSeed().catch((err) => {
    console.error('❌ Admin seeding failed:', err);
    process.exit(1);
});