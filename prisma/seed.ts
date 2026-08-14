import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { RoleName } from "../app/generated/prisma/enums";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const PERMISSION_KEYS = [
  "user.manage",
  "record.create",
  "record.approve",
  "record.lock",
  "dashboard.view",
  "import.run",
  "export.run",
  "kpi.configure",
  "audit.view",
  "backup.view",
  "quality.view",
  "quality.record",
  "quality.approve",
] as const;

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN: [...PERMISSION_KEYS],
  ADMIN: ["user.manage", "record.create", "record.approve", "record.lock", "dashboard.view", "import.run", "export.run", "kpi.configure", "audit.view", "backup.view", "quality.view", "quality.record", "quality.approve"],
  ENGINEERING_MANAGER: ["record.approve", "record.lock", "dashboard.view", "export.run", "kpi.configure", "backup.view", "quality.view", "quality.approve"],
  ENGINEERING_STAFF: ["record.create", "dashboard.view", "import.run", "export.run", "quality.view", "quality.record"],
  VIEWER: ["dashboard.view", "export.run", "quality.view"],
};

const ACCOUNTS: { email: string; password: string; name: string; role: RoleName }[] = [
  { email: "superadmin@eps.local", password: "Superadmin123!", name: "Super Admin", role: RoleName.SUPER_ADMIN },
  { email: "admin@eps.local", password: "Admin123!", name: "Admin", role: RoleName.ADMIN },
  { email: "manager@eps.local", password: "Manager123!", name: "Engineering Manager", role: RoleName.ENGINEERING_MANAGER },
  { email: "staff@eps.local", password: "Staff123!", name: "Engineering Staff", role: RoleName.ENGINEERING_STAFF },
  { email: "viewer@eps.local", password: "Viewer123!", name: "Viewer", role: RoleName.VIEWER },
];

async function main() {
  const permissions: Record<string, string> = {};
  for (const key of PERMISSION_KEYS) {
    const p = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });
    permissions[key] = p.id;
  }

  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName as RoleName },
      update: {},
      create: { name: roleName as RoleName, description: roleName },
    });
    for (const key of keys) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permissions[key] } },
        update: {},
        create: { roleId: role.id, permissionId: permissions[key] },
      });
    }
  }

  for (const account of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash: await hash(account.password) },
      create: {
        email: account.email,
        passwordHash: await hash(account.password),
        name: account.name,
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: account.role } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  console.log("Seed done: 5 roles, 10 permissions, 5 accounts (superadmin/admin/manager/staff/viewer)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
