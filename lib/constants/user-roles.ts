/**
 * User Role Constants
 * Centralized constants for user role values
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  EDITOR: 'editor',
  EDITOR_SENIOR: 'editor_senior',
  ERE: 'ere',
  MARKETING: 'marketing',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/**
 * Array of all user role values (for iteration)
 */
export const USER_ROLE_VALUES: UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.SALES,
  USER_ROLES.EDITOR,
  USER_ROLES.EDITOR_SENIOR,
  USER_ROLES.ERE,
  USER_ROLES.MARKETING,
]

/**
 * User role labels for UI display
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.SALES]: 'Sales',
  [USER_ROLES.EDITOR]: 'Editor',
  [USER_ROLES.EDITOR_SENIOR]: 'Editor Senior',
  [USER_ROLES.ERE]: 'ERE',
  [USER_ROLES.MARKETING]: 'Marketing',
}

/**
 * User role options for select dropdowns
 */
export const USER_ROLE_OPTIONS = USER_ROLE_VALUES.map(role => ({
  value: role,
  label: USER_ROLE_LABELS[role],
}))
