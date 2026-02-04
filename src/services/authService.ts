import { supabase } from "../lib/supabase";

export interface User {
    email: string;
    password: string;
    name?: string;
}

export const authService = {
    async checkAvailability(email: string, name: string) {
        const { data, error } = await supabase.rpc('check_user_exists', {
            email_input: email,
            name_input: name
        });

        if (error) throw error;
        return data as { emailExists: boolean, nameExists: boolean };
    },

    async register(request: User) {
                const existsData = await this.checkAvailability(request.email, request.name!);

        if (existsData) {
            if (existsData.emailExists) {
                throw new Error("Email already registered");
            }
            if (existsData.nameExists) {
                throw new Error("Username already taken");
            }
        }

                const { data: authData, error: authError } = await supabase.auth.signUp({
            email: request.email,
            password: request.password,
            options: {
                data: {
                    name: request.name,
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration failed: No user returned");

        return authData.user;
    },

    async login(request: User) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: request.email,
            password: request.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Login failed: No user returned");

                const { data: ontimeUser, error: ontimeUserError } = await supabase
            .from('ontime_user')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (ontimeUserError) {
            console.warn("Could not fetch ontime_user:", ontimeUserError.message);
        }

        return {
            user: authData.user,
            profile: ontimeUser
        };
    },
    
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }
};
