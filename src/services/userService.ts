import { supabase } from "../lib/supabase";

export interface OntimeUser {
    id: string;
    name: string;
    email: string;
    timezone?: string;
}

export const userService = {
    async getCurrentUser(): Promise<OntimeUser | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return null;

        const { data: ontimeUser } = await supabase
            .from('ontime_user')
            .select('*')
            .eq('id', user.id)
            .single();

        return ontimeUser;
    },

    async getCurrentUserName(): Promise<string | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return null;

        const { data: ontimeUser } = await supabase
            .from('ontime_user')
            .select('name')
            .eq('id', user.id)
            .single();

        return ontimeUser?.name || null;
    },

    async updateProfile(updates: { name?: string; email?: string; timezone?: string }): Promise<OntimeUser> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            throw new Error('Not authenticated');
        }

                if (updates.email && updates.email !== user.email) {
            const { error: authError } = await supabase.auth.updateUser({ email: updates.email });
            if (authError) throw authError;
        }

        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.timezone !== undefined) payload.timezone = updates.timezone;

        const { data, error } = await supabase
            .from('ontime_user')
            .update(payload)
            .eq('id', user.id)
            .select('*')
            .single();

        if (error) throw error;
        return data as OntimeUser;
    },

    async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            throw new Error('Not authenticated');
        }

                const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword,
        });

        if (signInError) {
            throw new Error('Current password is incorrect');
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }
};
