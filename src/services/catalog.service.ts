import { supabase } from "@/lib/supabase";
import type {
  Category,
  Product,
  Shop,
  ProductWithShop,
  Region,
  District,
  Address,
} from "@/types/database";

// Extended Address type with district info
export type AddressWithDistrict = Address & {
  district?: District & { region?: Region };
};

// Categories
export const categoriesService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) return null;
    return data;
  },

  async create(
    category: Omit<Category, "id" | "created_at" | "updated_at">
  ): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
  },
};

// Products
export const productsService = {
  async getAll(options?: {
    categoryId?: string;
    shopId?: string;
    regionId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    featured?: boolean;
  }): Promise<ProductWithShop[]> {
    let query = supabase
      .from("products")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, region_id),
        category:categories(id, name, slug)
      `
      )
      .eq("is_active", true);

    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }

    if (options?.shopId) {
      query = query.eq("shop_id", options.shopId);
    }

    if (options?.regionId) {
      query = query.eq("shop.region_id", options.regionId);
    }

    if (options?.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    if (options?.featured) {
      query = query.eq("is_featured", true);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data as unknown as ProductWithShop[]) || [];
  },

  async getById(id: string): Promise<ProductWithShop | null> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone, address),
        category:categories(id, name, slug)
      `
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data as unknown as ProductWithShop;
  },

  async getBySlug(
    slug: string,
    shopId: string
  ): Promise<ProductWithShop | null> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone, address),
        category:categories(id, name, slug)
      `
      )
      .eq("slug", slug)
      .eq("shop_id", shopId)
      .single();

    if (error) return null;
    return data as unknown as ProductWithShop;
  },

  async create(
    product: Omit<Product, "id" | "created_at" | "updated_at">
  ): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;
  },
};

// Shops
export const shopsService = {
  async getAll(options?: {
    regionId?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Shop[]> {
    let query = supabase.from("shops").select("*");

    if (options?.regionId) {
      query = query.eq("region_id", options.regionId);
    }

    if (options?.status) {
      query = query.eq("status", options.status as any);
    } else {
      query = query.eq("status", "APPROVED" as any);
    }

    if (options?.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    query = query.order("rating", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Shop | null> {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  async getBySlug(slug: string): Promise<Shop | null> {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data;
  },

  async getByOwnerId(ownerId: string): Promise<Shop | null> {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", ownerId)
      .single();

    if (error) return null;
    return data;
  },

  async create(
    shop: Omit<
      Shop,
      "id" | "created_at" | "updated_at" | "rating" | "total_orders"
    >
  ): Promise<Shop> {
    const { data, error } = await supabase
      .from("shops")
      .insert(shop)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Shop>): Promise<Shop> {
    const { data, error } = await supabase
      .from("shops")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Shop["status"]): Promise<Shop> {
    return this.update(id, { status });
  },
};

// Regions
export const regionsService = {
  async getAll(): Promise<Region[]> {
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Region | null> {
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  async getDistricts(regionId: string): Promise<District[]> {
    const { data, error } = await supabase
      .from("districts")
      .select("*")
      .eq("region_id", regionId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAllDistricts(): Promise<(District & { region: Region })[]> {
    const { data, error } = await supabase
      .from("districts")
      .select("*, region:regions(*)")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as unknown as (District & { region: Region })[]) || [];
  },

  async create(region: Omit<Region, "id" | "created_at" | "updated_at">): Promise<Region> {
    const { data, error } = await supabase.from("regions").insert(region).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Region>): Promise<Region> {
    const { data, error } = await supabase.from("regions").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) throw error;
  },
};

// Addresses Service - Saved customer addresses
export const addressesService = {
  async getByUser(userId: string): Promise<AddressWithDistrict[]> {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        `
        *,
        district:districts(*, region:regions(*))
      `
      )
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as AddressWithDistrict[]) || [];
  },

  async getById(id: string): Promise<AddressWithDistrict | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        `
        *,
        district:districts(*, region:regions(*))
      `
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data as unknown as AddressWithDistrict;
  },

  async getDefault(userId: string): Promise<AddressWithDistrict | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select(
        `
        *,
        district:districts(*, region:regions(*))
      `
      )
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (error) return null;
    return data as unknown as AddressWithDistrict;
  },

  async create(address: {
    user_id: string;
    label: string;
    address: string;
    district_id?: string | null;
    phone?: string | null;
    is_default?: boolean;
  }): Promise<Address> {
    // If this is set as default, unset other defaults first
    if (address.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", address.user_id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert(address)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    userId: string,
    updates: Partial<Omit<Address, "id" | "user_id" | "created_at">>
  ): Promise<Address> {
    // If setting as default, unset others first
    if (updates.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async setDefault(id: string, userId: string): Promise<void> {
    // Unset all defaults
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId);

    // Set new default
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },
};
