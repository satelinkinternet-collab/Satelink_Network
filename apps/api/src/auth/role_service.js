/**
 * Role Service — Centralized role and permission definitions.
 *
 * Single source of truth for:
 *   - Valid roles
 *   - Permission mapping
 *   - Dashboard routing priority
 */

export const VALID_ROLES = [
    'admin_super',
    'admin_ops',
    'admin_readonly',
    'node_operator',
    'builder',
    'distributor_lco',
    'distributor_influencer',
    'enterprise',
    'user',
];

const ROLE_PERMISSIONS = {
    admin_super:           ['view_dashboard', 'manage_system', 'manage_treasury', 'manage_ops'],
    admin_ops:             ['view_dashboard', 'manage_ops'],
    admin_readonly:        ['view_dashboard'],
    node_operator:         ['view_dashboard', 'view_node_stats', 'claim_rewards'],
    builder:               ['view_dashboard', 'manage_keys', 'view_usage'],
    distributor_lco:       ['view_dashboard', 'view_referrals', 'claim_commissions'],
    distributor_influencer:['view_dashboard', 'view_referrals', 'claim_commissions'],
    enterprise:            ['view_dashboard', 'view_usage', 'view_invoices'],
    user:                  ['view_dashboard'],
};

/**
 * Dashboard routing priority — first match wins.
 */
const DASHBOARD_ROUTES = {
    admin_super:           '/admin/command-center',
    admin_ops:             '/admin/command-center',
    admin_readonly:        '/admin/command-center',
    node_operator:         '/run-node/dashboard',
    builder:               '/builder',
    distributor_lco:       '/distributor',
    distributor_influencer:'/distributor',
    enterprise:            '/enterprise',
    user:                  '/',
};

/**
 * Get permissions for a given role.
 * @param {string} role
 * @returns {string[]}
 */
export function getPermissions(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

/**
 * Get the default dashboard path for a role.
 * @param {string} role
 * @returns {string}
 */
export function getDashboardRoute(role) {
    return DASHBOARD_ROUTES[role] || '/';
}

/**
 * Check if a role is valid.
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
    return VALID_ROLES.includes(role);
}

/**
 * Check if a role has a specific permission.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
    const perms = getPermissions(role);
    return perms.includes(permission);
}
