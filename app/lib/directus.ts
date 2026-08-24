export const DIRECTUS_URL = (process.env.DIRECTUS_URL || "https://demo.ibex.mn").replace(/\/+$/, "");

const allowedRoleNames = (process.env.DIRECTUS_ADMIN_ROLE_NAMES ||
  "Administrator,Website Content Editor")
  .split(",")
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

export type DirectusAdminUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  role?: { id?: string; name?: string | null } | string | null;
};

export async function getDirectusUser(accessToken: string) {
  const response = await fetch(
    `${DIRECTUS_URL}/users/me?fields=id,email,first_name,last_name,status,role.id,role.name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: DirectusAdminUser };
  return payload.data || null;
}

export function isWebsiteAdmin(user: DirectusAdminUser | null) {
  if (!user || user.status === "suspended" || user.status === "archived") return false;
  const roleName = typeof user.role === "object" ? user.role?.name : null;
  return Boolean(roleName && allowedRoleNames.includes(roleName.toLowerCase()));
}

export function displayName(user: DirectusAdminUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

export function directusRoleName(user: DirectusAdminUser | null) {
  return typeof user?.role === "object" ? user.role?.name || "" : "";
}

export function canManageWebsiteAdmins(user: DirectusAdminUser | null) {
  return directusRoleName(user).toLowerCase() === "administrator";
}
