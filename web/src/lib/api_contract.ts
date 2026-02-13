export interface ApiResponse<T = any> {
    ok: boolean;
    error?: string;
    [key: string]: any;
}

export interface UserProfile {
    wallet: string;
    role: 'admin_super' | 'admin_ops' | 'node_operator' | 'builder' | 'distributor_lco' | 'enterprise' | 'user';
    permissions: string[];
}

export interface NodeStatus {
    node_id: string;
    wallet: string;
    status: 'active' | 'inactive' | 'pending';
    last_seen: number;
    device_type: string;
}

export interface BuilderUsage {
    summary: {
        count: number;
        total_usdt: number;
    };
    details: Array<{
        op_type: string;
        count: number;
        total_usdt: number;
    }>;
}

export interface PairRequestResponse {
    pair_code: string;
    expires_in: number;
}

export interface PairStatusResponse {
    status: 'LINKED' | 'WAITING_FOR_USER' | 'EXPIRED';
    owner_wallet?: string;
    device_id?: string;
}

// Endpoints
export const API_ROUTES = {
    AUTH: {
        LOGIN: '/auth/login', // or /staging/login
        ME: '/me' // or /auth/me
    },
    ADMIN: {
        USERS: '/admin-api/users',
        NODES: '/admin-api/nodes'
    },
    NODE: {
        STATS: '/node-api/stats',
        CLAIM: '/node-api/claim'
    },
    BUILDER: {
        USAGE: '/builder-api/usage',
        KEYS: '/builder-api/keys',
        REQUESTS: '/builder-api/requests'
    },
    DISTRIBUTOR: {
        STATS: '/dist-api/stats',
        REFERRALS: '/dist-api/referrals',
        CONVERSIONS: '/dist-api/conversions'
    },
    PAIR: {
        REQUEST: '/pair/request',
        CONFIRM: '/pair/confirm',
        STATUS: (code: string) => `/pair/status/${code}`
    }
};
