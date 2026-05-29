import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'admin', description: 'Full platform access' },
  { name: 'editor', description: 'Can manage forms and view submissions' },
  { name: 'user', description: 'Standard end user (form submitter)' },
];

const PERMISSIONS = [
  { key: 'forms.read', description: 'View forms' },
  { key: 'forms.write', description: 'Create and edit forms' },
  { key: 'forms.delete', description: 'Delete forms' },
  { key: 'submissions.read', description: 'View submissions' },
  { key: 'submissions.export', description: 'Export submissions to CSV/PDF' },
  { key: 'users.read', description: 'View user list' },
  { key: 'users.manage', description: 'Manage users and roles' },
  { key: 'settings.manage', description: 'Edit platform settings' },
];

const ROLE_PERMISSIONS = {
  admin: PERMISSIONS.map((p) => p.key),
  editor: ['forms.read', 'forms.write', 'submissions.read', 'submissions.export'],
  user: [],
};

async function main() {
  // Roles
  for (const r of ROLES) {
    await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  // Permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: p.key }, update: {}, create: p });
  }

  // Role-permission links
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    for (const key of keys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // Bootstrap admin
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
      await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          name: process.env.ADMIN_NAME || 'Site Admin',
          roleId: adminRole?.id,
        },
      });
      console.log(`✓ Seeded admin user: ${email}`);
    } else {
      console.log(`• Admin already exists: ${email}`);
    }
  } else {
    console.log('• Skipping admin seed (ADMIN_EMAIL/ADMIN_PASSWORD not set)');
  }

  // Default settings
  const defaults = [
    { key: 'site.name', value: 'Pawsome 4 Pets' },
    { key: 'forms.allowPublicRegistration', value: 'true' },
  ];
  for (const s of defaults) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log('✓ Seed complete');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
