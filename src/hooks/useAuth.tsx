import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearWorkspaceCache, getActiveWorkspaceId } from '../services/workspaceContext';

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getUser().then(({ data: { user: u } }) => {
            if (mounted) {
                if (u) getActiveWorkspaceId().catch(() => {});
                setUser(u);
                setIsLoading(false);
            }
        }).catch(() => {
            if (mounted) setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            setIsLoading(false);
            if (!u) clearWorkspaceCache();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
