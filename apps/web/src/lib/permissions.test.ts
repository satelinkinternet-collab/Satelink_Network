import { canAccess, ROLE_ROUTES, Role } from './permissions';

describe('RBAC Permissions', () => {
    it('should allow public access to root, login, and 403', () => {
        expect(canAccess('builder', '/')).toBe(true);
        expect(canAccess('node_operator', '/login')).toBe(true);
        expect(canAccess('admin_super', '/403')).toBe(true);
    });

    it('should allow admin_super to access all protected routes', () => {
        expect(canAccess('admin_super', '/admin')).toBe(true);
        expect(canAccess('admin_super', '/node')).toBe(true);
        expect(canAccess('admin_super', '/builder')).toBe(true);
        expect(canAccess('admin_super', '/distributor')).toBe(true);
    });

    it('should restrict access based on role', () => {
        // Node Operator
        expect(canAccess('node_operator', '/node')).toBe(true);
        expect(canAccess('node_operator', '/admin')).toBe(false);

        // Builder
        expect(canAccess('builder', '/builder')).toBe(true);
        expect(canAccess('builder', '/distributor')).toBe(false);

        // Distributor
        expect(canAccess('distributor_lco', '/distributor')).toBe(true);
        expect(canAccess('distributor_lco', '/enterprise')).toBe(false);
    });

    it('should handle sub-routes correctly', () => {
        expect(canAccess('admin_ops', '/admin/settings')).toBe(true);
        expect(canAccess('node_operator', '/admin/settings')).toBe(false);
    });
});
