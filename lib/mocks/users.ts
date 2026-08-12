// Shape meniru respons GET /api/users (frontend-first; backend butuh DB —
// lihat app/api/users/route.ts). Aksi "ubah peran" & "tambah pengguna" belum
// diimplementasi — halaman layout ini hanya membaca data.
import { RoleName } from "@/app/generated/prisma/enums";

export type MockUser = {
  id: string;
  email: string;
  name: string;
  role: { name: RoleName };
  area: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type MockUserFilter = {
  role?: RoleName | "";
  search?: string;
  page?: number;
  perPage?: number;
};

export type MockUserPage = {
  items: MockUser[];
  total: number;
  page: number;
  perPage: number;
};

const area = (id: string, name: string) => ({ id, name });

export function seedMockUsers(): MockUser[] {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000).toISOString();
  const u = (
    id: string,
    name: string,
    email: string,
    role: RoleName,
    isActive: boolean,
    createdDaysAgo: number,
    userArea: { id: string; name: string } | null = null
  ): MockUser => ({
    id,
    email,
    name,
    role: { name: role },
    area: userArea,
    isActive,
    createdAt: days(createdDaysAgo),
    updatedAt: days(Math.max(0, createdDaysAgo - 14)),
  });

  return [
    u("usr_superadmin", "Super Admin", "superadmin@eps.local", RoleName.SUPER_ADMIN, true, 420),
    u("usr_admin", "Admin", "admin@eps.local", RoleName.ADMIN, true, 395),
    u(
      "usr_manager",
      "Engineering Manager",
      "manager@eps.local",
      RoleName.ENGINEERING_MANAGER,
      true,
      380,
      area("area_machining_1", "Machining Line 1")
    ),
    u(
      "usr_staff",
      "Engineering Staff",
      "staff@eps.local",
      RoleName.ENGINEERING_STAFF,
      true,
      350,
      area("area_machining_1", "Machining Line 1")
    ),
    u("usr_viewer", "Viewer", "viewer@eps.local", RoleName.VIEWER, true, 320),
    u(
      "usr_staff_2",
      "Rina Kusuma",
      "rina.kusuma@eps.local",
      RoleName.ENGINEERING_STAFF,
      true,
      240,
      area("area_machining_2", "Machining Line 2")
    ),
    u(
      "usr_manager_2",
      "Budi Santoso",
      "budi.santoso@eps.local",
      RoleName.ENGINEERING_MANAGER,
      true,
      200,
      area("area_assembly_1", "Assembly Line 1")
    ),
    u("usr_admin_2", "Siti Rahayu", "siti.rahayu@eps.local", RoleName.ADMIN, true, 150),
    u(
      "usr_staff_3",
      "Andi Wijaya",
      "andi.wijaya@eps.local",
      RoleName.ENGINEERING_STAFF,
      false,
      120,
      area("area_quality_lab", "Quality Lab")
    ),
    u(
      "usr_viewer_2",
      "Dewi Lestari",
      "dewi.lestari@eps.local",
      RoleName.VIEWER,
      false,
      60,
      area("area_assembly_1", "Assembly Line 1")
    ),
    u(
      "usr_staff_4",
      "Agus Prasetyo",
      "agus.prasetyo@eps.local",
      RoleName.ENGINEERING_STAFF,
      true,
      30,
      area("area_maintenance", "Maintenance")
    ),
  ];
}

// Filter + pagination murni, meniru GET /api/users (role eksak, search lintas
// email/nama; page 1-based, default 10; urut createdAt terbaru dulu).
export function filterUsers(items: MockUser[], params: MockUserFilter = {}): MockUserPage {
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 10) || 10));
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const search = params.search?.trim().toLowerCase() ?? "";

  const filtered = items
    .filter((it) => {
      if (params.role && it.role.name !== params.role) return false;
      if (search) {
        const hay = `${it.name} ${it.email}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const start = (page - 1) * perPage;
  return { items: filtered.slice(start, start + perPage), total: filtered.length, page, perPage };
}
