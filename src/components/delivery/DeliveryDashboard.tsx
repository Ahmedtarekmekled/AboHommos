import { useState, useEffect } from "react";
import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import type { OrderStatus, ParentOrderWithSuborders } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, Phone, CheckCircle, Package, Truck, Clock, Navigation, Volume2, VolumeX, Bell, Loader2, Map as MapIcon, ArrowUpRight, User } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { SoundService } from "@/services/sound.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

// Hook for Available Orders (Marketplace)
function useAvailableOrders() {
  const [orders, setOrders] = useState<ParentOrderWithSuborders[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAvailable = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("parent_orders")
        .select("*")
        .eq("status", "READY_FOR_PICKUP")
        .is("delivery_user_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (pOrder) => {
           // We'll fetch details manually if getParentOrder is not reliable,
           // but `getParentOrder` SHOULD exist. 
           // If it's missing, we must implement it or use a raw query.
           // Let's assume it exists for now based on previous code context.
           try {
             return await orderService.getParentOrder(pOrder.id);
           } catch (e) {
             console.error("Error enrichment:", e);
             return pOrder; // Fallback
           }
        })
      );
      
      setOrders(ordersWithDetails.filter(Boolean));
    } catch (err) {
      console.error("Error fetching available orders:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailable();

    const channel = supabase
      .channel("courier-marketplace")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parent_orders",
        },
        (payload) => {
            const newOrder = payload.new as any;
            // Refresh on any change to keep list in sync
            // Specifically check for new available orders to play sound
            if (
              (payload.eventType === 'INSERT' && newOrder.status === 'READY_FOR_PICKUP') ||
              (payload.eventType === 'UPDATE' && newOrder.status === 'READY_FOR_PICKUP')
            ) {
               SoundService.playNewOrderSound();
            }
            fetchAvailable(true); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, isLoading, refresh: fetchAvailable };
}

// Hook for My Assigned Orders
function useMyDeliveries(userId: string | undefined) {
  const [orders, setOrders] = useState<ParentOrderWithSuborders[]>([]); // Changed type to ParentOrderWithSuborders
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyOrders = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      // 1. Get raw parent orders
      const rawOrders = await orderService.getByDeliveryUser(userId);
      
      // 2. Enrich with suborders/items
      const enrichedOrders = await Promise.all(
        (rawOrders || []).map(async (pOrder) => {
           // We need getParentOrder to fetch suborders & items
           return await orderService.getParentOrder(pOrder.id);
        })
      );

      setOrders(enrichedOrders.filter(Boolean));
    } catch (error) {
      console.error("Failed to load delivery orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMyOrders();
      
      const channel = supabase
        .channel(`my-deliveries-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "parent_orders", // Watch parent_orders instead of orders
            filter: `delivery_user_id=eq.${userId}`,
          },
          () => fetchMyOrders()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  return { orders, isLoading, refresh: fetchMyOrders, setOrders };
}

interface DeliveryDashboardProps {
  initialTab?: string;
}

export function DeliveryDashboard({ initialTab = "available" }: DeliveryDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orders: availableOrders, isLoading: loadingAvailable, refresh: refreshAvailable } = useAvailableOrders();
  const { orders: myOrders, isLoading: loadingMy, refresh: refreshMy, setOrders: setMyOrders } = useMyDeliveries(user?.id);
  
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(SoundService.getMuteStatus());
  
  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<ParentOrderWithSuborders | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<ParentOrderWithSuborders | null>(null);

  // Sound Controls
  const toggleMute = () => {
    const newMuteStatus = SoundService.toggleMute();
    setIsMuted(newMuteStatus);
    toast.success(newMuteStatus ? "تم كتم الصوت" : "تم تفعيل الصوت");
  };

  const enableAudio = async () => {
    const enabled = await SoundService.enableAudio();
    if (enabled) toast.success("تم تفعيل التنبيهات الصوتية");
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;
    setIsAccepting(orderId);
    try {
      await orderService.assignDriverToParent(orderId, user.id);
      toast.success("تم قبول الطلب بنجاح! 🚀");
      await SoundService.playNewOrderSound(); 
      refreshAvailable();
      refreshMy();
    } catch (err: any) {
      console.error("Accept order failed:", err);
      toast.error("حدث خطأ أثناء قبول الطلب");
    } finally {
      setIsAccepting(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;
    setIsUpdating(orderId);
    
    // OPTIMISTIC UPDATE
    const previousOrders = [...myOrders];
    setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    try {
      await orderService.updateParentStatus(orderId, newStatus, user.id);
      toast.success(`تم تحديث الحالة إلى ${ORDER_STATUS_CONFIG[newStatus].label}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error("فشل تحديث الحالة");
      // Revert optimism
      setMyOrders(previousOrders);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!orderToConfirm || !user) return;
    
    const orderId = orderToConfirm.id;
    setOrderToConfirm(null); // Close modal
    
    setIsUpdating(orderId); // Show loading/processing state
    
    try {
      // 1. Update Server
      await orderService.updateParentStatus(orderId, 'DELIVERED', user.id);
      toast.success(`تم تسليم الطلب بنجاح ✅`);
      
      // 2. Play success sound
      // (Optional: Add a cash register sound or similar here if available)

      // 3. Smooth Disappear (Optimistic UI)
      // Keep it as 'DELIVERED' in the list for 3 seconds, then remove it.
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DELIVERED' } : o));
      
      setTimeout(() => {
          setMyOrders(prev => prev.filter(o => o.id !== orderId));
          // Refresh actual data to ensure sync
          refreshMy();
      }, 3000);

    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      toast.error("فشل إتمام التسليم");
    } finally {
      setIsUpdating(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4 p-4 max-w-md mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
           <h1 className="text-2xl font-bold">لوحة التوصيل</h1>
           <div className="flex items-center gap-2">
             <Badge variant={user.role === "DELIVERY" ? "default" : "outline"}>
               {user.full_name}
             </Badge>
             <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate('/dashboard/account')}>
                حسابي
             </Button>
           </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="icon" onClick={toggleMute} title={isMuted ? "تفعيل الصوت" : "كتم الصوت"}>
             {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
           </Button>
           <Button variant="outline" size="icon" onClick={enableAudio} title="تفعيل التنبيهات">
             <Bell className="w-4 h-4" />
           </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available" className="relative">
            طلبات متاحة
            {availableOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {availableOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-orders">
             طلباتي
             {myOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                {myOrders.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* AVAILABLE ORDERS TAB */}
        <TabsContent value="available" className="space-y-4 mt-4">
          {loadingAvailable ? (
            <p className="text-center text-muted-foreground">جاري البحث عن طلبات...</p>
          ) : availableOrders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">لا توجد طلبات متاحة حالياً</h3>
              <p className="text-sm text-muted-foreground">انتظر وصول طلبات جديدة...</p>
            </div>
          ) : (
            availableOrders.map((order: any, i: number) => (
              <Card key={order.id} className="border-l-4 border-l-green-500 shadow-md">
                <CardHeader className="pb-2">
                   <div className="flex justify-between items-start">
                     <div>
                       <Badge variant="outline" className="mb-2">جديد</Badge>
                       <CardTitle className="text-lg">طلب #{order.order_number}</CardTitle>
                       <CardDescription>{new Date(order.created_at).toLocaleTimeString('ar-EG')}</CardDescription>
                     </div>
                     <div className="text-left">
                       <p className="font-bold text-lg text-primary">{formatPrice(order.total_delivery_fee)}</p>
                       <p className="text-xs text-muted-foreground">أرباح التوصيل</p>
                     </div>
                   </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <PickupPointsList suborders={order.suborders} />
                  
                  <div className="space-y-2 mt-4 pt-4 border-t">
                       <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold">نقطة التوصيل:</span>
                       </div>
                       <AddressDisplay address={order.delivery_address} />
                  </div>

                  <Button 
                      className="w-full mt-4" 
                      size="lg" 
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={isAccepting === order.id}
                    >
                      {isAccepting === order.id ? "جاري القبول..." : "قبول الطلب"}
                    </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* MY ORDERS TAB */}
        <TabsContent value="my-orders" className="space-y-4 mt-4">
           {loadingMy ? (
             <p className="text-center">جاري تحميل طلباتك...</p>
           ) : myOrders.length === 0 ? (
             <div className="text-center py-12">
               <p className="text-muted-foreground">ليس لديك طلبات حالية</p>
               <Button variant="link" onClick={() => document.querySelector<HTMLElement>('[value="available"]')?.click()}>
                 ابحث عن طلبات جديدة
               </Button>
             </div>
           ) : (
             myOrders.map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus];
                const gpsMatch = (order.delivery_address || "").match(/GPS:\s*([\d.-]+),\s*([\d.-]+)/) || 
                                 (order.delivery_address || "").match(/([\d.]+),([\d.]+)/);
                const lat = gpsMatch ? gpsMatch[1] : null;
                const lng = gpsMatch ? gpsMatch[2] : null;
                const customerPhone = order.customer_phone || ""; 
                
                // Calculate Amount to Collect
                const isPaid = order.payment_status === 'PAID' || order.payment_method !== 'COD';
                const amountToCollect = isPaid ? 0 : order.total;

                return (
                  <Card key={order.id} className="overflow-hidden border border-border shadow-sm mb-4">
                     {/* 1. Header */}
                     <div className="bg-muted/30 p-3 flex justify-between items-center border-b">
                        <div className="flex flex-col">
                           <span className="font-bold text-lg">#{order.order_number}</span>
                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <Badge className={`${statusConfig?.color} text-white px-3 py-1 text-sm text-center min-w-[100px]`}>
                           {statusConfig?.label}
                        </Badge>
                     </div>

                     <CardContent className="p-4 space-y-4">
                        
                        {/* 2. Dropoff Section */}
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-primary font-semibold">
                              <MapPin className="w-4 h-4" />
                              <h3>إلى: {order.customer_name}</h3>
                           </div>
                           
                           <div className="bg-muted/20 p-3 rounded-lg border">
                              <p className="text-sm font-medium line-clamp-2 mb-2 leading-relaxed">
                                 {(order.delivery_address || "").split("موقع GPS:")[0].trim() || "عنوان العميل"}
                              </p>
                              
                              {lat && lng && (
                                 <div className="space-y-2 mt-2">
                                     <div className="flex items-center justify-between bg-background p-2 rounded border border-dashed">
                                        <code className="text-xs font-mono text-muted-foreground" dir="ltr">
                                           {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                                        </code>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6"
                                          onClick={() => {
                                             navigator.clipboard.writeText(`${lat},${lng}`);
                                             toast.success("تم نسخ الإحداثيات");
                                          }}
                                        >
                                           <span className="text-xs">نسخ</span>
                                        </Button>
                                     </div>
                                     
                                     <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                           variant="outline" 
                                           size="sm" 
                                           className="w-full text-xs"
                                           onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
                                        >
                                           <MapIcon className="w-3 h-3 ml-1" />
                                           فتح الخريطة
                                        </Button>
                                        <Button 
                                           size="sm" 
                                           className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                           onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')}
                                        >
                                           <Navigation className="w-3 h-3 ml-1" />
                                           بدء التوجيه
                                        </Button>
                                     </div>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* 3. Contact Section */}
                        {customerPhone && (
                           <div className="grid grid-cols-2 gap-3">
                              <Button 
                                 variant="outline" 
                                 className="w-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                 onClick={() => window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}`, '_blank')}
                              >
                                 <svg viewBox="0 0 24 24" className="w-4 h-4 ml-2 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                 واتساب
                              </Button>
                              <Button 
                                 variant="outline"
                                 onClick={() => window.open(`tel:${customerPhone}`, '_blank')}
                              >
                                 <Phone className="w-4 h-4 ml-2" />
                                 اتصال
                              </Button>
                           </div>
                        )}

                        {/* 4. Payment Section */}
                        <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/10">
                           <span className="text-sm font-medium">المبلغ المطلوب تحصيله:</span>
                           <div className="text-left">
                              <span className="text-xl font-bold block text-primary">
                                {isPaid ? "0 ج.م" : formatPrice(amountToCollect)}
                              </span>
                              <Badge variant={isPaid ? "default" : "outline"} className={`text-[10px] mt-0.5 ${!isPaid ? 'border-primary/20 text-primary' : 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'}`}>
                                 {isPaid ? "مدفوع مسبقاً" : "الدفع عند الاستلام"}
                              </Badge>
                           </div>
                        </div>

                        {/* 5. Actions */}
                        <div className="pt-2">
                           {order.status === 'READY_FOR_PICKUP' && (
                              <Button 
                                className="w-full mb-2" 
                                size="lg"
                                variant="secondary"
                                onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                                disabled={isUpdating === order.id}
                              >
                                {isUpdating === order.id && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                استلام وبدء التوصيل 🛵
                              </Button>
                           )}

                           {order.status === 'OUT_FOR_DELIVERY' && (
                              <Button 
                                className="w-full mb-2 bg-green-600 hover:bg-green-700 text-white" 
                                size="lg"
                                onClick={() => setOrderToConfirm(order)}
                                disabled={isUpdating === order.id}
                              >
                                {isUpdating === order.id && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                <CheckCircle className="w-4 h-4 ml-2" />
                                إتمام التسليم
                              </Button>
                           )}
                           
                           <Button 
                              variant="ghost" 
                              className="w-full text-xs text-muted-foreground" 
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowDetailsModal(true);
                              }}
                           >
                              عرض تفاصيل المنتجات والمتاجر
                           </Button>
                        </div>
                     </CardContent>
                  </Card>
                );
              })
           )}
        </TabsContent>
      </Tabs>

      {/* DELIVERY CONFIRMATION MODAL */}
      <Dialog open={!!orderToConfirm} onOpenChange={(open) => !open && setOrderToConfirm(null)}>
        <DialogContent>
           <DialogHeader>
             <DialogTitle>تأكيد تسليم الطلب</DialogTitle>
             <DialogDescription>
               هل قام العميل باستلام الطلب ودفع المبلغ المطلوب؟
               <br/>
               <span className="font-bold text-black block mt-2">
                 المبلغ: {orderToConfirm?.payment_method === 'COD' && orderToConfirm.payment_status !== 'PAID' ? formatPrice(orderToConfirm.total) : "0 ج.م"}
               </span>
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button variant="outline" onClick={() => setOrderToConfirm(null)}>إلغاء</Button>
             <Button className="bg-green-600 hover:bg-green-700" onClick={handleConfirmDelivery}>
               نعم، تم التسليم
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ORDER DETAILS MODAL */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
             {selectedOrder?.suborders?.map((sub, i) => (
                <div key={i} className="border rounded-lg p-3">
                   <div className="flex justify-between items-center mb-2 border-b pb-2">
                      <h4 className="font-bold flex items-center gap-2">
                        <StoreBadge count={1} />
                        {sub.shop?.name}
                      </h4>
                      <a href={`tel:${sub.shop?.phone}`}><Phone className="w-4 h-4" /></a>
                   </div>
                   <div className="space-y-2">
                     {sub.items?.map((item, idx) => (
                       <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="font-mono">{formatPrice(item.total_price)}</span>
                       </div>
                     ))}
                   </div>
                   <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      <MapPin className="inline w-3 h-3 ml-1" />
                      {(sub.shop as any)?.address}
                   </div>
                </div>
             ))}
             {!selectedOrder?.suborders?.length && <p>لا توجد تفاصيل للمنتجات</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponents
function PickupPointsList({ suborders }: { suborders?: any[] }) {
    if (!suborders?.length) return null;
    return (
        <div className="space-y-3 mb-4">
             <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">نقاط الاستلام ({suborders.length}):</span>
             </div>
             {suborders.map((sub, i) => (
                <div key={i} className="bg-muted/40 p-3 rounded-md border border-muted-foreground/10">
                   <div className="flex justify-between items-start">
                      <div>
                         <div className="font-bold text-sm flex items-center gap-1.5">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {i + 1}
                            </div>
                            {sub.shop?.name || "متجر"}
                         </div>
                         <p className="text-xs text-muted-foreground mt-1 pr-7">
                           {sub.shop?.address}
                         </p>
                      </div>
                      
                      {sub.shop?.latitude && sub.shop?.longitude ? (
                           <Button 
                             size="sm" 
                             variant="secondary"
                             className="h-7 text-xs px-2"
                             onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${sub.shop.latitude},${sub.shop.longitude}`, '_blank')}
                           >
                             <Navigation className="w-3 h-3 ml-1" />
                             توجيه
                           </Button>
                      ) : null}
                   </div>
                </div>
             ))}
        </div>
    );
}

function AddressDisplay({ address }: { address: string }) {
    const gpsMatch = (address || "").match(/GPS:\s*([\d.-]+),\s*([\d.-]+)/) || 
                     (address || "").match(/([\d.]+),([\d.]+)/);

    const cleanAddress = (address || "").split("موقع GPS:")[0].trim() || "عنوان العميل";

    return (
        <div className="bg-orange-50 p-3 rounded-md text-sm border border-orange-100">
             <p className="font-medium mb-1">{cleanAddress}</p>
             {gpsMatch && (
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 p-1 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-100 mt-1"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${gpsMatch[1]},${gpsMatch[2]}`, '_blank')}
                  >
                     <Navigation className="w-3 h-3 ml-1" />
                     توجيه ({Number(gpsMatch[1]).toFixed(4)}, {Number(gpsMatch[2]).toFixed(4)})
                  </Button>
             )}
        </div>
    );
}

function StoreBadge({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">
      <Package className="w-3 h-3" />
      {count} متاجر
    </div>
  );
}
