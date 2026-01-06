import { supabase } from "../lib/supabase";

export interface OntimeUser {
    id: string;
    name: string;
    email: string;
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
    }
};
