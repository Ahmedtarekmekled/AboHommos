import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Package,
  ShoppingBag,
  Phone,
  MapPin,
  Clock,
  ClipboardList,
  CheckCircle,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Store,
  MessageCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { formatPrice, cn } from "@/lib/utils";
import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services";
import type { OrderStatus, ParentOrderWithSuborders, OrderWithItems } from "@/types/database";

const statusIcons: Record<OrderStatus, typeof Package> = {
  PLACED: ClipboardList,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY_FOR_PICKUP: Store,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: XCircle,
};

const statusOrder: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const statusColors: Record<OrderStatus, string> = {
  PLACED: "bg-amber-500",
  CONFIRMED: "bg-blue-500",
  PREPARING: "bg-purple-500",
  READY_FOR_PICKUP: "bg-indigo-500",
  OUT_FOR_DELIVERY: "bg-cyan-500",
  DELIVERED: "bg-success",
  CANCELLED: "bg-destructive",
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      // 1. Try single/sub order
      const order = await orderService.getById(id!);
      if (order) return { type: 'single' as const, data: order as OrderWithItems };

      // 2. Try parent order
      const parent = await orderService.getParentOrder(id!);
      if (parent) return { type: 'parent' as const, data: parent as ParentOrderWithSuborders };

      return null;
    },
    enabled: !!id && isAuthenticated,
    refetchInterval: 10000, 
  });

  const queryClient = useQueryClient();

  // Real-time Subscription
  useEffect(() => {
    if (!orderData || !id) return;

    const channels: any[] = [];

    if (orderData.type === 'parent') {
      // Subscribe to Parent Order
      const parentChannel = supabase
        .channel(`parent-order-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "parent_orders",
            filter: `id=eq.${id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            toast.info("تم تحديث حالة الطلب");
          }
        )
        .subscribe();
      channels.push(parentChannel);

      // Subscribe to Suborders
      const subChannel = supabase
        .channel(`suborders-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `parent_order_id=eq.${id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
          }
        )
        .subscribe();
      channels.push(subChannel);
      
    } else {
      // Subscribe to Single Order
      const singleChannel = supabase
        .channel(`order-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `id=eq.${id}`,
          },
          () => {
             queryClient.invalidateQueries({ queryKey: ["order", id] });
             toast.info("تم تحديث حالة الطلب");
          }
        )
        .subscribe();
      channels.push(singleChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [id, orderData?.type, queryClient]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const copyOrderNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    toast.success("تم نسخ رقم الطلب");
  };

  const contactShop = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const contactWhatsApp = (phone: string, orderNum: string) => {
    const p = phone.replace(/^0/, "20");
    const message = `مرحباً، أستفسر عن الطلب رقم ${orderNum}`;
    window.open(
      `https://wa.me/${p}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <Link to="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container-app">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">الطلب غير موجود</h2>
            <p className="text-muted-foreground mb-4">
              تأكد من رقم الطلب وحاول مرة أخرى
            </p>
            <Link to="/orders">
              <Button>{AR.orders.title}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Parent Order View
  if (orderData.type === 'parent') {
    const order = orderData.data;
    const isCancelled = order.status === 'CANCELLED';
    const activeSuborders = order.suborders.filter(s => s.status !== 'CANCELLED');
    const allDelivered = activeSuborders.length > 0 && activeSuborders.every(s => s.status === 'DELIVERED');
    
    // Calculate overall progress based on suborders
    // This is simplified; specific logic can be added later
    let overallStatus = order.status;
    if (activeSuborders.length > 0) {
      if (activeSuborders.some(s => s.status === 'OUT_FOR_DELIVERY')) overallStatus = 'OUT_FOR_DELIVERY';
      else if (activeSuborders.some(s => s.status === 'READY_FOR_PICKUP')) overallStatus = 'READY_FOR_PICKUP';
      else if (activeSuborders.some(s => s.status === 'PREPARING')) overallStatus = 'PREPARING';
    }

    return (
      <div className="py-8">
        <div className="container-app">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للطلبات
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  طلب مجمّع
                </Badge>
                <p className="text-muted-foreground text-sm">
                  {AR.orders.orderNumber}
                </p>
                <button
                  onClick={() => copyOrderNumber(order.order_number)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-mono">
                {order.order_number}
              </h1>
              <p className="text-muted-foreground mt-1">
                {formatDateTime(order.created_at)}
              </p>
            </div>
            <Badge
              variant="default" // Use custom mapping if needed
              className={cn("text-sm px-4 py-2 self-start", 
                order.status === 'CANCELLED' ? "bg-destructive text-destructive-foreground" : 
                order.status === 'DELIVERED' ? "bg-success text-success-foreground" : 
                "bg-primary text-primary-foreground"
              )}
            >
              {order.status === 'PLACED' ? 'جاري المعالجة' : order.status}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Parent Order Status / Map Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    حالة التوصيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                     <div className="p-3 bg-primary/10 rounded-full">
                       <Clock className="w-6 h-6 text-primary" />
                     </div>
                     <div>
                       <p className="font-semibold">الوقت المقدر</p>
                       <p className="text-muted-foreground">
                         {order.route_minutes ? `${Math.ceil(order.route_minutes)} - ${Math.ceil(order.route_minutes + 15)} دقيقة` : '30-45 دقيقة'}
                       </p>
                     </div>
                  </div>
                  
                  {/* Suborders List */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">تفاصيل المتاجر ({order.suborders.length})</h3>
                    {order.suborders.map((suborder) => (
                      <div key={suborder.id} className="border rounded-xl p-4 bg-muted/20">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white p-1 border">
                              <img src={suborder.shop?.logo_url || ''} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div>
                               <h4 className="font-semibold">{suborder.shop?.name}</h4>
                               <Badge variant="outline" className="text-xs mt-1">
                                 {ORDER_STATUS_CONFIG[suborder.status].label}
                               </Badge>
                            </div>
                          </div>
                          {suborder.shop?.phone && (
                             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => contactShop(suborder.shop.phone)}>
                               <Phone className="w-4 h-4" />
                             </Button>
                          )}
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-2 pl-12 border-l-2 border-muted ml-5">
                          {suborder.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.product_name}</span>
                              <span className="font-medium">{formatPrice(item.total_price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {AR.checkout.deliveryInfo}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">{AR.checkout.address}</p>
                        <p className="font-medium">{order.delivery_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                       <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                       <div>
                         <p className="text-sm text-muted-foreground">{AR.checkout.phone}</p>
                         <p className="font-medium font-mono" dir="ltr">{order.customer_phone}</p>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Sidebar Summary */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>{AR.checkout.orderSummary}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{AR.cart.subtotal}</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{AR.cart.deliveryFee}</span>
                      <span>{formatPrice(order.total_delivery_fee)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>{AR.cart.total}</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                  
                  <div className="pt-2 text-center text-sm text-muted-foreground">
                    {order.payment_method === 'COD' ? 'الدفع عند الاستلام' : order.payment_method}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Single Order View (Existing Logic)
  const order = orderData.data as OrderWithItems;
  const currentStatusIndex = statusOrder.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  const isActive = !isCancelled && !isDelivered;

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Back Button */}
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للطلبات
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-muted-foreground text-sm">
                {AR.orders.orderNumber}
              </p>
              <button
                onClick={() => copyOrderNumber(order.order_number)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="نسخ رقم الطلب"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono">
              {order.order_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <Badge
            variant={
              isCancelled
                ? "cancelled"
                : isDelivered
                ? "delivered"
                : "preparing"
            }
            className="text-sm px-4 py-2 self-start"
          >
            {ORDER_STATUS_CONFIG[order.status as OrderStatus]?.label}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Card - Visual Timeline */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  {AR.orders.trackOrder}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {isCancelled ? (
                  <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-xl">
                    <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">تم إلغاء الطلب</p>
                      {order.status_history?.find(
                        (h) => h.status === "CANCELLED"
                      ) && (
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(
                            order.status_history.find(
                              (h) => h.status === "CANCELLED"
                            )!.created_at
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Progress Bar */}
                    <div className="relative mb-8">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-700 ease-out rounded-full",
                            isDelivered ? "bg-success" : "bg-primary"
                          )}
                          style={{
                            width: `${
                              ((currentStatusIndex + 1) / statusOrder.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>

                      {/* Status Dots */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between">
                        {statusOrder.map((status, index) => {
                          const isCompleted = currentStatusIndex >= index;
                          const isCurrent = currentStatusIndex === index;
                          const StatusIcon = statusIcons[status];

                          return (
                            <div
                              key={status}
                              className={cn(
                                "relative flex flex-col items-center",
                                index === 0 && "-ml-1",
                                index === statusOrder.length - 1 && "-mr-1"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                                  isCompleted
                                    ? isDelivered
                                      ? "bg-success text-success-foreground"
                                      : "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground",
                                  isCurrent &&
                                    !isDelivered &&
                                    "ring-4 ring-primary/20"
                                )}
                              >
                                <StatusIcon className="w-4 h-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Labels */}
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {statusOrder.map((status, index) => {
                        const isCompleted = currentStatusIndex >= index;
                        const isCurrent = currentStatusIndex === index;
                        const historyEntry = order.status_history?.find(
                          (h) => h.status === status
                        );

                        return (
                          <div key={status} className="space-y-1">
                            <p
                              className={cn(
                                "text-xs font-medium",
                                isCompleted
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {ORDER_STATUS_CONFIG[status].label}
                            </p>
                            {historyEntry && (
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(
                                  historyEntry.created_at
                                ).toLocaleTimeString("ar-EG", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Estimated Time */}
                {isActive && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">الوقت المتوقع للتوصيل</p>
                      <p className="text-sm text-muted-foreground">
                        30-45 دقيقة
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  {AR.orders.items} ({order.items?.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-4",
                        index !== order.items!.length - 1 &&
                          "pb-4 border-b border-border"
                      )}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatPrice(item.unit_price)}
                        </p>
                      </div>
                      <span className="font-bold text-primary">
                        {formatPrice(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {AR.checkout.deliveryInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {AR.checkout.address}
                      </p>
                      <p className="font-medium">{order.delivery_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {AR.checkout.phone}
                      </p>
                      <p className="font-medium font-mono" dir="ltr">
                        {order.customer_phone}
                      </p>
                    </div>
                  </div>
                </div>
                {order.delivery_notes && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {AR.checkout.notes}
                      </p>
                      <p className="font-medium">{order.delivery_notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shop Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {order.shop?.logo_url ? (
                      <img
                        src={order.shop.logo_url}
                        alt={order.shop.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{order.shop?.name}</p>
                    {order.shop?.phone && (
                      <p
                        className="text-sm text-muted-foreground font-mono"
                        dir="ltr"
                      >
                        {order.shop.phone}
                      </p>
                    )}
                  </div>
                </div>

                {order.shop?.phone && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => contactShop(order.shop.phone)}
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() =>
                        contactWhatsApp(order.shop.phone, order.order_number)
                      }
                    >
                      <MessageCircle className="w-4 h-4" />
                      واتساب
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{AR.checkout.orderSummary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {AR.cart.subtotal}
                    </span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {AR.cart.deliveryFee}
                    </span>
                    <span>{formatPrice(order.delivery_fee)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>{AR.cart.total}</span>
                  <span className="text-primary">
                    {formatPrice(order.total)}
                  </span>
                </div>

                <div className="pt-2 text-center text-sm text-muted-foreground">
                  الدفع عند الاستلام
                </div>

                {/* Reorder Button - Only for delivered orders */}
                {isDelivered && (
                  <Link
                    to={`/shops/${order.shop?.slug}`}
                    className="block pt-2"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <RotateCcw className="w-4 h-4" />
                      اطلب مرة أخرى
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
