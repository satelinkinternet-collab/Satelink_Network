import { useState, useEffect } from 'react';
import axios from 'axios';

type UserMode = 'SIMPLE' | 'ADVANCED';

export function useUserMode() {
    const [mode, setMode] = useState<UserMode>('SIMPLE');
    const [loading, setLoading] = useState(true);

    // Initial fetch
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/me/settings');
                if (res.data.ok) {
                    setMode(res.data.settings.ui_mode);
                    // Also store public ID in local storage for easy access if needed, 
                    // but better to return it from hook
                    if (res.data.settings.public_id) {
                        localStorage.setItem('satelink_public_id', res.data.settings.public_id);
                    }
                    // Sync local storage for sync checks
                    localStorage.setItem('satelink_ui_mode', res.data.settings.ui_mode);
                }
            } catch (e) {
                console.error('Failed to fetch user settings', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const toggleMode = async (newMode: UserMode) => {
        // Optimistic update
        setMode(newMode);
        localStorage.setItem('satelink_ui_mode', newMode);

        try {
            await axios.post('/me/settings', { ui_mode: newMode });
        } catch (e) {
            console.error('Failed to save mode preference', e);
            // Revert? simpler to just let it be for now or show toaster
        }
    };

    return { mode, toggleMode, loading, isAdvanced: mode === 'ADVANCED' };
}
