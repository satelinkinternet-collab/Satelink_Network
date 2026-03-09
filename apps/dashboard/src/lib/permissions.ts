export type Role =
    | 'admin_super'
    | 'admin_ops'
    | 'admin_readonly'
    | 'node_operator'
    | 'builder'
    | 'distributor_lco'
    | 'distributor_influencer'
    | 'enterprise';

export const ROLE_ROUTES: Record<string, Role[]> = {
    '/admin': ['admin_super', 'admin_ops', 'admin_readonly'],
    '/node': ['node_operator', 'admin_super'],
    '/builder': ['builder', 'admin_super'],
    '/distributor': ['distributor_lco', 'distributor_influencer', 'admin_super'],
    '/enterprise': ['enterprise', 'admin_super'],
};

export function canAccess(role: Role, path: string): boolean {
    // Allow all roles to access non-protected paths
    if (path === '/' || path === '/login' || path === '/403') return true;

    // Find the base path (e.g., /admin/users -> /admin)
    const basePath = Object.keys(ROLE_ROUTES).find((r) => path.startsWith(r));

    if (!basePath) return true; // Or false if everything should be protected

    return ROLE_ROUTES[basePath].includes(role);
}
