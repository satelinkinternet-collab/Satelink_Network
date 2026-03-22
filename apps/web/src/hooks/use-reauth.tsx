"use client";

import { useState, useCallback } from 'react';
import { ReAuthDialog } from '@/components/auth/ReAuthDialog';
import { useAuth } from '@/hooks/use-auth';

export function useReAuth() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [scope, setScope] = useState('');
    const [resolver, setResolver] = useState<((token: string) => void) | null>(null);
    const [rejecter, setRejecter] = useState<((reason?: any) => void) | null>(null);

    const requestReAuth = useCallback((actionScope: string): Promise<string> => {
        setScope(actionScope);
        setIsOpen(true);
        return new Promise((resolve, reject) => {
            setResolver(() => resolve);
            setRejecter(() => reject);
        });
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        if (rejecter) rejecter(new Error('Re-auth cancelled'));
        setResolver(null);
        setRejecter(null);
    };

    const handleSuccess = (token: string) => {
        // Don't close here, wait for caller? No, close immediately.
        // onSuccess in Dialog calls local success, then we resolve.
        if (resolver) resolver(token);
        setResolver(null);
        setRejecter(null);
    };

    const ReAuthComponent = (
        <ReAuthDialog
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handleSuccess}
            scope={scope}
            wallet={user?.wallet || ''}
        />
    );

    return { requestReAuth, ReAuthComponent };
}
