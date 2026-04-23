import { supabase } from "../lib/supabase";
import { clearWorkspaceCache } from "./workspaceContext";

export interface User {
    email: string;
    password: string;
    name?: string;
}

export interface AvailabilityResult {
    emailExists: boolean;
}

export const authService = {
    async checkAvailability(email: string): Promise<AvailabilityResult> {
        const { data, error } = await supabase.rpc("check_user_exists", {
            email_input: email,
        });
        if (error) throw error;
        return data as AvailabilityResult;
    },

    async register(request: User) {
        if (!request.name) throw new Error("Username is required");

        const { data, error } = await supabase.auth.signUp({
            email: request.email,
            password: request.password,
            options: { data: { name: request.name } },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Registration failed: no user returned");

        return data.user;
    },

    async login(request: User) {
        clearWorkspaceCache();

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: request.email,
            password: request.password,
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Login failed: no user returned");

        const { data: profile, error: profileError } = await supabase
            .from("ontime_user")
            .select("*")
            .eq("id", authData.user.id)
            .single();
        if (profileError) {
            console.warn("Could not fetch ontime_user:", profileError.message);
        }

        return { user: authData.user, profile };
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        clearWorkspaceCache();
        if (error) throw error;
    },

    async resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    },
};
