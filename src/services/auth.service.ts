import {
  supabase,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
} from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: UserRole;
  }): Promise<{ user: Profile | null; error: Error | null }> {
    try {
      const { data: authData, error: authError } = await signUp(
        data.email,
        data.password,
        data.fullName
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء الحساب");

      // Profile is created automatically by database trigger
      // Wait briefly for trigger to complete, then fetch profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update profile with additional data if provided
      const updates: { phone?: string; role?: UserRole } = {};
      if (data.phone) updates.phone = data.phone;
      if (data.role) updates.role = data.role;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("profiles")
          .update(updates)
          .eq("id", authData.user.id);
      }

      const profile = await this.getProfile(authData.user.id);
      return { user: profile, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async login(
    email: string,
    password: string
  ): Promise<{ user: Profile | null; error: Error | null }> {
    try {
      const { data: authData, error: authError } = await signIn(
        email,
        password
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل تسجيل الدخول");

      // Simple profile fetch
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        // Create profile if not exists
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            email: authData.user.email || "",
            full_name:
              authData.user.user_metadata?.full_name ||
              authData.user.email?.split("@")[0] ||
              "User",
            role: "CUSTOMER",
          })
          .select()
          .single();

        return { user: newProfile || null, error: null };
      }

      return { user: profile, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async logout(): Promise<{ error: Error | null }> {
    const { error } = await signOut();
    return { error };
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCurrentProfile(): Promise<Profile | null> {
    const { user } = await getCurrentUser();
    if (!user) return null;
    return this.getProfile(user.id);
  },

  async checkRole(userId: string, allowedRoles: UserRole[]): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile) return false;
    return allowedRoles.includes(profile.role);
  },
};

// Profile helpers
export const profileService = {
  async getAll(options?: {
    role?: UserRole;
    regionId?: string;
    search?: string;
  }): Promise<Profile[]> {
    let query = supabase.from("profiles").select("*");

    if (options?.role) {
      query = query.eq("role", options.role);
    }

    if (options?.regionId) {
      query = query.eq("region_id", options.regionId);
    }

    if (options?.search) {
      query = query.ilike("full_name", `%${options.search}%`);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  },
};
