/**
 * Central RBAC permission matrix (backend_readme §5).
 * Roles are stored in DB; NEVER trust role/isAdmin from request body.
 */

export const ROLES = [
  "GUEST",
  "GUARDIAN",
  "TEACHER",
  "CONTENT_EDITOR",
  "SUPPORT",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  BOOK_READ_PUBLISHED: "book:read:published",
  BOOK_CREATE: "book:create",
  BOOK_UPDATE: "book:update",
  BOOK_PROCESS: "book:process",
  BOOK_PUBLISH: "book:publish",
  BOOK_UNPUBLISH: "book:unpublish",
  BOOK_REINDEX: "book:reindex",
  BOOK_ARCHIVE: "book:archive",
  BOOK_DELETE: "book:delete",
  JOB_READ: "job:read",
  JOB_RETRY: "job:retry",
  AI_CONFIG_READ: "ai-config:read",
  AI_CONFIG_WRITE: "ai-config:write",
  USAGE_READ: "usage:read",
  FEEDBACK_MODERATE: "feedback:moderate",
  AUDIT_READ: "audit:read",
  CHILD_PROFILE_MANAGE: "child-profile:manage",
  CONVERSATION_OWN: "conversation:own",
  UPLOAD_OWN: "upload:own",
  PROGRESS_OWN: "progress:own",
} as const;

/** Role -> granted permissions. TEACHER reserved (disabled unless implemented). */
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  GUEST: [],
  GUARDIAN: [
    PERMISSIONS.CHILD_PROFILE_MANAGE,
    PERMISSIONS.CONVERSATION_OWN,
    PERMISSIONS.UPLOAD_OWN,
    PERMISSIONS.PROGRESS_OWN,
  ],
  TEACHER: [], // reserved
  CONTENT_EDITOR: [
    PERMISSIONS.BOOK_READ_PUBLISHED,
    PERMISSIONS.BOOK_CREATE,
    PERMISSIONS.BOOK_UPDATE,
    PERMISSIONS.BOOK_PROCESS,
    PERMISSIONS.JOB_READ,
    PERMISSIONS.JOB_RETRY,
  ],
  SUPPORT: [PERMISSIONS.BOOK_READ_PUBLISHED, PERMISSIONS.JOB_READ, PERMISSIONS.USAGE_READ],
  SUPER_ADMIN: Object.values(PERMISSIONS),
};

export function hasPermission(role: Role | string | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  return Array.isArray(perms) && perms.includes(permission);
}

export function isPrivilegedRole(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "CONTENT_EDITOR" || role === "SUPPORT";
}
