import { supabase } from "@/lib/supabase";
import type {
  CartItem,
  CartWithItems,
  CartItemWithProduct,
  Order,
  OrderWithItems,
  OrderStatus,
  OrderStatusHistory,
} from "@/types/database";

// Cart Service
export const cartService = {
  async getCart(userId: string): Promise<CartWithItems | null> {
    try {
      const { data: cart, error: cartError } = await supabase
        .from("carts")
        .select(
          `
          *,
          shop:shops(id, name, slug, logo_url),
          items:cart_items(
            *,
            product:products(*)
          )
        `
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (cartError) {
        console.warn("Cart fetch error:", cartError.message);
        return null;
      }
      return cart as unknown as CartWithItems;
    } catch (error) {
      console.warn("Cart service error:", error);
      return null;
    }
  },

  async addItem(
    userId: string,
    shopId: string,
    productId: string,
    quantity: number
  ): Promise<CartItem> {
    // Get or create cart for this shop
    let { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .eq("shop_id", shopId)
      .single();

    if (!cart) {
      // Clear any existing cart from other shops
      await supabase.from("carts").delete().eq("user_id", userId);

      // Create new cart
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: userId, shop_id: shopId })
        .select("id")
        .single();

      if (createError) throw createError;
      cart = newCart;
    }

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .single();

    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Add new item
    const { data, error } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<CartItem> {
    if (quantity <= 0) {
      await this.removeItem(itemId);
      throw new Error("Item removed");
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;
  },

  async clearCart(userId: string): Promise<void> {
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (cart) {
      await supabase.from("cart_items").delete().eq("cart_id", cart.id);
      await supabase.from("carts").delete().eq("id", cart.id);
    }
  },

  calculateTotal(items: CartItemWithProduct[]): {
    subtotal: number;
    itemCount: number;
  } {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.product.price * item.quantity,
        itemCount: acc.itemCount + item.quantity,
      }),
      { subtotal: 0, itemCount: 0 }
    );
  },
};

// Order Service
export const orderService = {
  async create(orderData: {
    userId: string;
    shopId: string;
    customerName: string;
    items: Array<{
      productId: string;
      productName: string;
      productPrice: number;
      quantity: number;
    }>;
    deliveryAddress: string;
    deliveryPhone: string;
    notes?: string;
    deliveryFee?: number;
  }): Promise<Order> {
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + item.productPrice * item.quantity,
      0
    );
    const deliveryFee = orderData.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: orderData.userId,
        shop_id: orderData.shopId,
        status: "PLACED",
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customer_name: orderData.customerName,
        customer_phone: orderData.deliveryPhone,
        delivery_address: orderData.deliveryAddress,
        delivery_notes: orderData.notes || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = orderData.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.productPrice,
      quantity: item.quantity,
      total_price: item.productPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Create initial status history
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "PLACED",
      created_by: orderData.userId,
    });

    // Clear cart
    await cartService.clearCart(orderData.userId);

    return order;
  },

  async getByUser(userId: string): Promise<OrderWithItems[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as OrderWithItems[]) || [];
  },

  async getByShop(
    shopId: string,
    status?: OrderStatus
  ): Promise<OrderWithItems[]> {
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*)
      `
      )
      .eq("shop_id", shopId);

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data as unknown as OrderWithItems[]) || [];
  },

  async getById(orderId: string): Promise<OrderWithItems | null> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*)
      `
      )
      .eq("id", orderId)
      .single();

    if (error) return null;
    return data as unknown as OrderWithItems;
  },

  async getByDeliveryUser(userId: string): Promise<OrderWithItems[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        shop:shops(id, name, slug, logo_url, phone),
        items:order_items(*),
        status_history:order_status_history(*)
      `
      )
      .eq("delivery_user_id", userId)
      .neq("status", "DELIVERED")
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as OrderWithItems[]) || [];
  },

  async assignDriver(orderId: string, driverId: string): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({ delivery_user_id: driverId })
      .eq("id", orderId);

    if (error) throw error;
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    userId: string,
    notes?: string
  ): Promise<Order> {
    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
      READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      CANCELLED: [],
    };


    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (!currentOrder) throw new Error("الطلب غير موجود");

    const allowedStatuses =
      validTransitions[currentOrder.status as OrderStatus];
    if (!allowedStatuses.includes(status)) {
      throw new Error("لا يمكن تغيير حالة الطلب إلى هذه الحالة");
    }

    // Update order status
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    // Add to status history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status,
      notes,
      created_by: userId,
    });

    return order;
  },

  async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    const { data, error } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

// Order Status helpers
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    icon: string;
  }
> = {
  PLACED: {
    label: "تم استلام الطلب",
    color: "info",
    icon: "ClipboardList",
  },
  CONFIRMED: {
    label: "تم تأكيد الطلب",
    color: "primary",
    icon: "CheckCircle",
  },
  PREPARING: {
    label: "جاري التجهيز",
    color: "warning",
    icon: "Package",
  },
  READY_FOR_PICKUP: {
    label: "جاهز للاستلام",
    color: "info",
    icon: "PackageCheck",
  },
  OUT_FOR_DELIVERY: {
    label: "في الطريق",
    color: "accent",
    icon: "Truck",
  },
  DELIVERED: {
    label: "تم التسليم",
    color: "success",
    icon: "CheckCircle2",
  },
  CANCELLED: {
    label: "تم الإلغاء",
    color: "destructive",
    icon: "XCircle",
  },
};
