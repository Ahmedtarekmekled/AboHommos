import { useState, useEffect } from "react";
import { useAuth } from "@/store";
import { profileService } from "@/services/auth.service";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import type { OrderWithItems, Profile, OrderStatus } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, MapPin, User, Phone, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export function AdminDelivery() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    loadData();
    // Realtime subscription for orders
    const channel = supabase
      .channel("admin-delivery-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch drivers
      const allProfiles = await profileService.getAll({ role: "DELIVERY" });
      setDrivers(allProfiles);

      // 2. Fetch orders (All active orders ideally, but for now let's fetch all relevant ones)
      // We don't have a "getAll" in orderService yet that returns ALL orders across shops for admin.
      // But typically delivery is per shop or platform wide? 
      // Assuming Admin sees ALL orders.
      // Wait, orderService.getByShop gets orders for a shop.
      // Admin might want to see orders ready for delivery.
      // Let's use supabase direct query here for agility or add to service.
      // Direct query:
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
        .order("created_at", { ascending: false });
        
      if (statusFilter !== "ALL") {
          query = query.eq("status", statusFilter);
      } else {
          // Filter out delivered/cancelled to keep view clean?
          // Maybe just show active ones: PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY
          // query = query.in("status", ["PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"]);
      }

      const { data: ordersData, error } = await query;
      
      if (error) throw error;
      setOrders((ordersData as OrderWithItems[]) || []);

    } catch (error) {
      console.error("Failed to load delivery data:", error);
      toast.error("فشل تحميل بيانات التوصيل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      await orderService.assignDriver(orderId, driverId);
      toast.success("تم تعيين السائق بنجاح");
      // Optimistic update
      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, delivery_user_id: driverId } : o)
      );
      
      // Also update status to READY_FOR_PICKUP if it was PREPARING? 
      // Or maybe assigning driver doesn't change status automatically.
    } catch (error) {
      toast.error("فشل تعيين السائق");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
      const config = ORDER_STATUS_CONFIG[status as OrderStatus];
      return config ? config.color : "default"; 
      // Note: Badge variants in this project might differ from config.color logic.
      // Looking at dashboard.tsx, variants are: "default", "secondary", "destructive", "outline", "success", "warning".
      // ORDER_STATUS_CONFIG uses: "info", "primary", "warning", "accent", "success", "destructive".
      // We need to map them or just use what works.
      const map: Record<string, string> = {
          "info": "secondary",
          "primary": "default",
          "warning": "warning", // if exists or secondary
          "accent": "default",
          "success": "success",
          "destructive": "destructive"
      };
      return map[config?.color || "primary"] || "default";
  };

  if (isLoading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة التوصيل</h1>
        <div className="flex gap-2">
             <Button variant="outline" onClick={loadData}>
                تحديث
             </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">الكل</SelectItem>
                    <SelectItem value="PREPARING">جاري التجهيز</SelectItem>
                    <SelectItem value="READY_FOR_PICKUP">جاهز للاستلام</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">في الطريق</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => {
            const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus];
            return (
            <Card key={order.id}>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-mono">{order.order_number}</CardTitle>
                     <Badge variant={getStatusBadgeVariant(order.status) as any}>
                        {statusConfig?.label || order.status}
                    </Badge>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        {/* Order Info */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                {order.delivery_address}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {order.customer_phone}
                            </div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Package className="w-4 h-4" />
                                {order.items?.length || 0} منتجات ({formatPrice(order.total)})
                            </div>
                             {order.delivery_user_id && (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                    <Truck className="w-4 h-4" />
                                    <span>
                                        السائق: {drivers.find(d => d.id === order.delivery_user_id)?.full_name || "غير معروف"}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Driver Assignment */}
                        <div className="min-w-[200px] space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <User className="w-4 h-4" />
                                تعيين سائق
                            </label>
                            <Select 
                                value={order.delivery_user_id || "unassigned"} 
                                onValueChange={(val) => handleAssignDriver(order.id, val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر سائق" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">-- غير معين --</SelectItem>
                                    {drivers.map(driver => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                            {driver.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )})}
        {orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                لا توجد طلبات
            </div>
        )}
      </div>
    </div>
  );
}
