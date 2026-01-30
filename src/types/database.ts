// =====================================================
// DATABASE TYPES - MATCHES SUPABASE SCHEMA
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = "CUSTOMER" | "SHOP_OWNER" | "ADMIN" | "DELIVERY";
export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
export type ShopStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      regions: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      districts: {
        Row: {
          id: string;
          region_id: string;
          name: string;
          name_en: string | null;
          slug: string;
          delivery_fee: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          region_id: string;
          name: string;
          name_en?: string | null;
          slug: string;
          delivery_fee?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          region_id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          delivery_fee?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          slug: string;
          description: string | null;
          image_url: string | null;
          icon: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          icon?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          icon?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      shops: {
        Row: {
          id: string;
          owner_id: string;
          region_id: string;
          district_id: string | null;
          name: string;
          name_en: string | null;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          phone: string;
          whatsapp: string | null;
          address: string;
          status: ShopStatus;
          is_open: boolean;
          rating: number;
          total_ratings: number;
          total_orders: number;
          opening_time: string | null;
          closing_time: string | null;
          delivery_fee: number;
          min_order_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          region_id: string;
          district_id?: string | null;
          name: string;
          name_en?: string | null;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone: string;
          whatsapp?: string | null;
          address: string;
          status?: ShopStatus;
          is_open?: boolean;
          rating?: number;
          total_ratings?: number;
          total_orders?: number;
          opening_time?: string | null;
          closing_time?: string | null;
          delivery_fee?: number;
          min_order_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          region_id?: string;
          district_id?: string | null;
          name?: string;
          name_en?: string | null;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone?: string;
          whatsapp?: string | null;
          address?: string;
          status?: ShopStatus;
          is_open?: boolean;
          rating?: number;
          total_ratings?: number;
          total_orders?: number;
          opening_time?: string | null;
          closing_time?: string | null;
          delivery_fee?: number;
          min_order_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string;
          name: string;
          name_en: string | null;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          sku: string | null;
          barcode: string | null;
          stock_quantity: number;
          low_stock_threshold: number | null;
          track_inventory: boolean;
          image_url: string | null;
          images: string[];
          unit: string;
          weight: number | null;
          is_featured: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id: string;
          name: string;
          name_en?: string | null;
          slug: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number;
          low_stock_threshold?: number | null;
          track_inventory?: boolean;
          image_url?: string | null;
          images?: string[];
          unit?: string;
          weight?: number | null;
          is_featured?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          category_id?: string;
          name?: string;
          name_en?: string | null;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number;
          low_stock_threshold?: number | null;
          track_inventory?: boolean;
          image_url?: string | null;
          images?: string[];
          unit?: string;
          weight?: number | null;
          is_featured?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          shop_id: string;
          status: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          delivery_address: string;
          delivery_notes: string | null;
          payment_method: string;
          payment_status: string;
          estimated_delivery: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          delivery_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id: string;
          shop_id: string;
          status?: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          discount?: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          delivery_address: string;
          delivery_notes?: string | null;
          payment_method?: string;
          payment_status?: string;
          estimated_delivery?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          delivery_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          shop_id?: string;
          status?: OrderStatus;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          total?: number;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_notes?: string | null;
          payment_method?: string;
          payment_status?: string;
          estimated_delivery?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          delivery_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_image?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: OrderStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address: string;
          district_id: string | null;
          phone: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          address: string;
          district_id?: string | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          address?: string;
          district_id?: string | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          order_id: string | null;
          rating: number;
          title: string | null;
          comment: string | null;
          is_verified_purchase: boolean;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          order_id?: string | null;
          rating: number;
          title?: string | null;
          comment?: string | null;
          is_verified_purchase?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          order_id?: string | null;
          rating?: number;
          title?: string | null;
          comment?: string | null;
          is_verified_purchase?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_shop_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      owns_shop: {
        Args: { shop_id: string };
        Returns: boolean;
      };
      get_user_shop_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      shop_status: ShopStatus;
    };
  };
}

// =====================================================
// CONVENIENCE TYPES
// =====================================================

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Entity types
export type Profile = Tables<"profiles">;
export type Region = Tables<"regions">;
export type District = Tables<"districts">;
export type Category = Tables<"categories">;
export type Shop = Tables<"shops">;
export type Product = Tables<"products">;
export type Cart = Tables<"carts">;
export type CartItem = Tables<"cart_items">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderStatusHistory = Tables<"order_status_history">;
export type Address = Tables<"addresses">;
export type Review = Tables<"reviews">;

// =====================================================
// EXTENDED TYPES WITH RELATIONS
// =====================================================

export type ProductWithShop = Product & {
  shop: Pick<Shop, "id" | "name" | "slug" | "logo_url">;
  category: Pick<Category, "id" | "name" | "slug">;
};

export type CartItemWithProduct = CartItem & {
  product: Product;
};

export type CartWithItems = Cart & {
  items: CartItemWithProduct[];
  shop: Pick<Shop, "id" | "name" | "slug" | "logo_url" | "delivery_fee"> | null;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
  shop: Pick<Shop, "id" | "name" | "slug" | "logo_url" | "phone">;
  status_history: OrderStatusHistory[];
};

export type ShopWithProducts = Shop & {
  products: Product[];
  region: Region;
};

export type CategoryWithSubcategories = Category & {
  subcategories: Category[];
};

export type DistrictWithRegion = District & {
  region: Region;
};

export type ReviewWithUser = Review & {
  user: Pick<Profile, "id" | "full_name" | "avatar_url">;
};

export type ProductWithReviews = Product & {
  reviews: ReviewWithUser[];
  average_rating: number;
  total_reviews: number;
};

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}
