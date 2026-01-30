import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import type { OrderStatus } from "@/types/database";

const statusIcons: Record<OrderStatus, typeof Package> = {
  PLACED: ClipboardList,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: XCircle,
};

const statusOrder: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const statusColors: Record<OrderStatus, string> = {
  PLACED: "bg-amber-500",
  CONFIRMED: "bg-blue-500",
  PREPARING: "bg-purple-500",
  OUT_FOR_DELIVERY: "bg-cyan-500",
  DELIVERED: "bg-success",
  CANCELLED: "bg-destructive",
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => orderService.getById(id!),
    enabled: !!id && isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const copyOrderNumber = () => {
    if (order) {
      navigator.clipboard.writeText(order.order_number);
      toast.success("تم نسخ رقم الطلب");
    }
  };

  const contactShop = () => {
    if (order?.shop?.phone) {
      window.open(`tel:${order.shop.phone}`, "_self");
    }
  };

  const contactWhatsApp = () => {
    if (order?.shop?.phone) {
      const phone = order.shop.phone.replace(/^0/, "20");
      const message = `مرحباً، أستفسر عن الطلب رقم ${order.order_number}`;
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    }
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

  if (!order) {
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
                onClick={copyOrderNumber}
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
                          {item.quantity} × {formatPrice(item.product_price)}
                        </p>
                      </div>
                      <span className="font-bold text-primary">
                        {formatPrice(item.total)}
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
                        {order.delivery_phone}
                      </p>
                    </div>
                  </div>
                </div>
                {order.notes && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {AR.checkout.notes}
                      </p>
                      <p className="font-medium">{order.notes}</p>
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
                      onClick={contactShop}
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={contactWhatsApp}
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
