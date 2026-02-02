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
            product:products(
              *,
              shop:shops(id, name, slug, logo_url)
            )
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
    // Get or create multi-shop cart
    let { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cart) {
      // Create new multi-shop cart (shop_id = null)
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: userId, shop_id: null })
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
      .maybeSingle();

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
        subtotal: acc.subtotal + (item.product?.price || 0) * item.quantity,
        itemCount: acc.itemCount + item.quantity,
      }),
      { subtotal: 0, itemCount: 0 }
    );
  },
  async getParentOrder(parentId: string): Promise<any> {
    const { data, error } = await supabase
      .from("parent_orders")
      .select(`
        *,
        suborders:orders(
          id,
          shop:shops(id, name, address, phone, latitude, longitude),
          items:order_items(product_name, quantity, total_price)
        )
      `)
      .eq("id", parentId)
      .single();

    if (error) throw error;
    return data;
  },
};

// Order Service
export const orderService = {
  async getParentOrder(orderId: string): Promise<any | null> {
    const { data: parentOrder, error } = await supabase
      .from("parent_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !parentOrder) return null;

    // Fetch suborders
    const { data: suborders, error: subError } = await supabase
      .from("orders")
      .select(`
        *,
        shop:shops(id, name, slug, logo_url, phone, address, latitude, longitude),
        items:order_items(*),
        status_history:order_status_history(*)
      `)
      .eq("parent_order_id", orderId)
      .order("created_at", { ascending: true });

    if (subError) throw subError;

    return {
      ...parentOrder,
      suborders: suborders || [],
    };
  },

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

  async getByDeliveryUser(userId: string): Promise<any[]> {
    // Return Parent Orders assigned to this user
    const { data: parentOrders, error } = await supabase
      .from("parent_orders")
      .select("*")
      .eq("delivery_user_id", userId)
      .neq("status", "DELIVERED")
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!parentOrders) return [];

    // Fetch suborders for each parent
    const ordersWithDetails = await Promise.all(
      parentOrders.map(async (pOrder) => {
         return await this.getParentOrder(pOrder.id);
      })
    );

    return ordersWithDetails.filter(Boolean);
  },

  async getDeliveryHistory(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("parent_orders")
      .select("*")
      .eq("delivery_user_id", userId)
      .in("status", ["DELIVERED", "CANCELLED"])
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDeliveryStats(userId: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: orders, error } = await supabase
      .from("parent_orders")
      .select("total_delivery_fee, status, created_at")
      .eq("delivery_user_id", userId)
      .eq("status", "DELIVERED")
      .gte("updated_at", firstDayOfMonth);

    if (error) throw error;

    const totalEarning = orders?.reduce((sum, o) => sum + (o.total_delivery_fee || 0), 0) || 0;
    const count = orders?.length || 0;

    return {
      monthly_earnings: totalEarning,
      monthly_count: count
    };
  },



  async assignDriver(orderId: string, driverId: string): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({ delivery_user_id: driverId })
      .eq("id", orderId);

    if (error) throw error;
  },

  async assignDriverToParent(parentOrderId: string, driverId: string): Promise<void> {
    const { data, error } = await supabase.rpc('assign_driver_to_parent', {
      p_parent_order_id: parentOrderId,
      p_driver_id: driverId
    });

    if (error) throw error;
    if (!data.success) {
      throw new Error(data.message || 'فشل قبول الطلب');
    }
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

    // Update order status ATOMICALLY via RPC to sync Parent Status
    const { error: orderError } = await supabase
      .rpc('update_shop_order_status', { 
        p_order_id: orderId, 
        p_status: status 
      });

    if (orderError) throw orderError;

    // Fetch updated order to return
    const { data: order } = await supabase
      .from("orders")
      .select()
      .eq("id", orderId)
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

  async updateParentStatus(
    parentId: string,
    status: OrderStatus,
    userId: string
  ): Promise<void> {
    // 1. Update Parent
    const { error: pError } = await supabase
      .from("parent_orders")
      .update({ status })
      .eq("id", parentId);

    if (pError) throw pError;

    // 2. Cascade to Sub-Orders (Simple approach)
    // If Parent is Delivered/Cancelled/Out, Sub-orders should match.
    if (["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(status)) {
        await supabase
          .from("orders")
          .update({ status })
          .eq("parent_order_id", parentId);
    }
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
