import { useState, useEffect } from "react";
import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import type { OrderWithItems, OrderStatus } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Phone, CheckCircle, Package, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export function DeliveryDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
      // Realtime subscription
      const channel = supabase
        .channel(`delivery-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `delivery_user_id=eq.${user.id}`,
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await orderService.getByDeliveryUser(user.id);
      setOrders(data);
    } catch (error) {
      console.error("Failed to load delivery orders:", error);
      toast.error("فشل تحميل الطلبات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;
    try {
      await orderService.updateStatus(orderId, newStatus, user.id);
      toast.success("تم تحديث الحالة");
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      // Re-fetch to be safe
      loadOrders();
    } catch (error) {
      toast.error("فشل تحديث الحالة");
    }
  };

  if (isLoading) return <div className="p-4 text-center">جاري التحميل...</div>;

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <Truck className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">لا توجد طلبات توصيل</h2>
        <p className="text-muted-foreground">ليس لديك أي طلبات نشطة حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">طلباتي للتوصيل</h1>
      
      {orders.map((order) => {
        const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus];
        
        return (
          <Card key={order.id} className="overflow-hidden border-2">
            <CardContent className="p-0">
              {/* Header */}
              <div className={`p-3 flex justify-between items-center bg-${statusConfig?.color || "muted"}/10`}>
                <span className="font-mono font-bold text-lg">{order.order_number}</span>
                <Badge variant="outline">{statusConfig?.label}</Badge>
              </div>
              
              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Shop Info */}
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {order.shop.logo_url ? (
                        <img src={order.shop.logo_url} alt={order.shop.name} className="w-full h-full object-cover" />
                    ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">استلام من: {order.shop.name}</p>
                    {order.shop.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${order.shop.phone}`} className="hover:underline">{order.shop.phone}</a>
                        </div>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                    <p className="font-semibold text-sm text-muted-foreground">توصيل إلى:</p>
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">{order.delivery_address}</p>
                            {order.delivery_notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    ملاحظات: {order.delivery_notes}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-dashed mt-2">
                        <Phone className="w-4 h-4 text-primary shrink-0" />
                        <a href={`tel:${order.customer_phone}`} className="text-sm font-medium hover:underline text-primary">
                            {order.customer_phone}
                        </a>
                    </div>
                </div>

                {/* Amount */}
                <div className="flex justify-between items-center font-bold">
                    <span>تحصيل مبلغ:</span>
                    <span className="text-xl text-primary">{formatPrice(order.total)}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid gap-2 pt-2">
                    {order.status === "READY_FOR_PICKUP" && (
                        <Button 
                            className="w-full"
                            onClick={() => handleUpdateStatus(order.id, "OUT_FOR_DELIVERY")}
                        >
                            <Truck className="w-4 h-4 ml-2" />
                            بدء التوصيل (استلمت الطلب)
                        </Button>
                    )}
                    
                    {order.status === "OUT_FOR_DELIVERY" && (
                        <Button 
                            className="w-full" 
                            variant="success"
                            onClick={() => handleUpdateStatus(order.id, "DELIVERED")}
                        >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            تم التسليم
                        </Button>
                    )}
                    
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="w-full mt-2">
                            <MapPin className="w-4 h-4 ml-2" />
                            فتح الموقع في الخريطة
                        </Button>
                    </a>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
