import { supabase } from "@/lib/supabase";
import type { Review, ReviewWithUser, InsertTables } from "@/types/database";

export const reviewService = {
  // Get all reviews for a product
  async getByProduct(productId: string): Promise<ReviewWithUser[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
        *,
        user:profiles!user_id (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as ReviewWithUser[]) || [];
  },

  // Get review stats for a product
  async getProductStats(
    productId: string
  ): Promise<{ average: number; total: number; distribution: number[] }> {
    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", productId);

    if (error) throw error;

    const reviews = data || [];
    const total = reviews.length;

    if (total === 0) {
      return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    // Distribution: [1-star, 2-star, 3-star, 4-star, 5-star]
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1]++;
      }
    });

    return {
      average: Math.round(average * 10) / 10,
      total,
      distribution,
    };
  },

  // Get reviews by user
  async getByUser(userId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Check if user can review a product (must have purchased it)
  async canUserReview(
    userId: string,
    productId: string
  ): Promise<{ canReview: boolean; hasReviewed: boolean; orderId?: string }> {
    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single();

    if (existingReview) {
      return { canReview: false, hasReviewed: true };
    }

    // Check if user has a delivered order with this product
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(
        `
        order_id,
        orders!inner (
          id,
          user_id,
          status
        )
      `
      )
      .eq("product_id", productId)
      .eq("orders.user_id", userId)
      .eq("orders.status", "DELIVERED")
      .limit(1);

    if (error) {
      console.error("Error checking order:", error);
      return { canReview: false, hasReviewed: false };
    }

    if (orderItems && orderItems.length > 0) {
      return {
        canReview: true,
        hasReviewed: false,
        orderId: orderItems[0].order_id,
      };
    }

    return { canReview: false, hasReviewed: false };
  },

  // Create a new review
  async create(review: InsertTables<"reviews">): Promise<Review> {
    const { data, error } = await supabase
      .from("reviews")
      .insert(review)
      .select()
      .single();

    if (error) throw error;

    // Update shop rating after review
    await this.updateShopRating(review.product_id);

    return data;
  },

  // Update a review
  async update(reviewId: string, updates: Partial<Review>): Promise<Review> {
    const { data, error } = await supabase
      .from("reviews")
      .update(updates)
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a review
  async delete(reviewId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) throw error;

    // Update shop rating after deletion
    await this.updateShopRating(productId);
  },

  // Mark a review as helpful
  async markHelpful(reviewId: string): Promise<void> {
    const { error } = await supabase.rpc("increment_helpful_count", {
      review_id: reviewId,
    });

    // If RPC doesn't exist, fallback to direct update
    if (error) {
      const { data: review } = await supabase
        .from("reviews")
        .select("helpful_count")
        .eq("id", reviewId)
        .single();

      if (review) {
        await supabase
          .from("reviews")
          .update({ helpful_count: (review.helpful_count || 0) + 1 })
          .eq("id", reviewId);
      }
    }
  },

  // Update shop rating based on all product reviews
  async updateShopRating(productId: string): Promise<void> {
    try {
      // Get the shop for this product
      const { data: product } = await supabase
        .from("products")
        .select("shop_id")
        .eq("id", productId)
        .single();

      if (!product) return;

      // Get all reviews for all products in this shop
      const { data: shopProducts } = await supabase
        .from("products")
        .select("id")
        .eq("shop_id", product.shop_id);

      if (!shopProducts || shopProducts.length === 0) return;

      const productIds = shopProducts.map((p) => p.id);

      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .in("product_id", productIds);

      if (!reviews || reviews.length === 0) {
        await supabase
          .from("shops")
          .update({ rating: 0, total_ratings: 0 })
          .eq("id", product.shop_id);
        return;
      }

      const totalRatings = reviews.length;
      const averageRating =
        reviews.reduce((acc, r) => acc + r.rating, 0) / totalRatings;

      await supabase
        .from("shops")
        .update({
          rating: Math.round(averageRating * 10) / 10,
          total_ratings: totalRatings,
        })
        .eq("id", product.shop_id);
    } catch (error) {
      console.error("Error updating shop rating:", error);
    }
  },

  // Get shop rating summary
  async getShopRating(
    shopId: string
  ): Promise<{ average: number; total: number }> {
    const { data: shop } = await supabase
      .from("shops")
      .select("rating, total_ratings")
      .eq("id", shopId)
      .single();

    return {
      average: shop?.rating || 0,
      total: shop?.total_ratings || 0,
    };
  },
};
