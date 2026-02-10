import { useState, useEffect } from "react";
import { useAuth } from "@/store";
import { profileService } from "@/services/auth.service";
import { deliveryAdminService, CourierSummary, CourierAnalytics } from "@/services/delivery-admin.service";
import { ParentOrder, Profile } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Package, 
  Settings, 
  BarChart2, 
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Eye,
  RefreshCw
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// --- COURIERS TAB ---
function CouriersTab({ couriers, period, setPeriod }: { couriers: CourierSummary[], period: number, setPeriod: (p: number) => void }) {
  const [selectedCourier, setSelectedCourier] = useState<CourierSummary | null>(null);
  const [analytics, setAnalytics] = useState<CourierAnalytics[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const loadAnalytics = async (courierId: string) => {
    setLoadingAnalytics(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), 30)); // Always fetch 30d for chart
      const data = await deliveryAdminService.getCourierAnalytics(courierId, startDate, endDate);
      
      // Fill gaps
      const days = [];
      let currentDate = startDate;
      while(currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const existing = data.find(d => d.date === dateStr);
        days.push(existing || { date: dateStr, earnings: 0, delivered_count: 0 });
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      }
      setAnalytics(days);
    } catch (e) {
      console.error(e);
      notify.error("فشل تحميل التحليلات");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (selectedCourier) {
      loadAnalytics(selectedCourier.courier_id);
    }
  }, [selectedCourier]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">أداء المناديب</h2>
        <div className="flex gap-2">
           <Button variant={period === 7 ? "default" : "outline"} onClick={() => setPeriod(7)}>7 أيام</Button>
           <Button variant={period === 30 ? "default" : "outline"} onClick={() => setPeriod(30)}>30 يوم</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-6 gap-4 p-4 font-medium bg-muted text-sm">
           <div className="col-span-2">المندوب</div>
           <div>الطلبات (فترة)</div>
           <div>الأرباح (فترة)</div>
           <div>إجمالي الأرباح</div>
           <div>إجراءات</div>
        </div>
        <div className="divide-y">
           {couriers.map((courier) => (
             <div key={courier.courier_id} className="grid grid-cols-6 gap-4 p-4 text-sm items-center hover:bg-muted/50">
               <div className="col-span-2 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {courier.profile?.avatar_url ? (
                      <img src={courier.profile.avatar_url} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                 </div>
                 <div>
                   <p className="font-medium">{courier.profile?.full_name || 'غير معروف'}</p>
                   <p className="text-xs text-muted-foreground">{courier.profile?.phone}</p>
                 </div>
               </div>
               <div>{courier.delivered_count_period}</div>
               <div className="font-medium text-green-600">{formatPrice(courier.earnings_period)}</div>
               <div className="text-muted-foreground">{formatPrice(courier.total_earnings)}</div>
               <div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCourier(courier)}>
                     <BarChart2 className="w-4 h-4 ml-1" />
                     تفاصيل
                  </Button>
               </div>
             </div>
           ))}
           {couriers.length === 0 && (
             <div className="p-8 text-center text-muted-foreground">لا يوجد مناديب نشطين في هذه الفترة</div>
           )}
        </div>
      </div>

      <Dialog open={!!selectedCourier} onOpenChange={(open) => !open && setSelectedCourier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <Truck className="w-5 h-5" />
               تقرير أداء: {selectedCourier?.profile?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {loadingAnalytics ? (
            <div className="h-[300px] flex items-center justify-center">جاري التحميل...</div>
          ) : (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">أرباح (30 يوم)</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatPrice(analytics.reduce((acc, curr) => acc + curr.earnings, 0))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">طلبات (30 يوم)</p>
                      <p className="text-xl font-bold">
                        {analytics.reduce((acc, curr) => acc + curr.delivered_count, 0)}
                      </p>
                    </CardContent>
                  </Card>
               </div>

               <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'd MMM', { locale: ar })} fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip labelFormatter={(d) => format(new Date(d), 'd MMMM', { locale: ar })} />
                      <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- ORDERS TAB ---
function OrdersTab({ couriers }: { couriers: CourierSummary[] }) {
  const [orders, setOrders] = useState<ParentOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ParentOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data } = await deliveryAdminService.getParentOrders({ 
          status: statusFilter,
          limit: 50 // limit for MVP
      });
      setOrders(data);
    } catch (e) {
      notify.error("فشل تحميل الطلبات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (orderId: string, courierId: string | undefined) => {
     try {
       await deliveryAdminService.assignCourier(orderId, courierId || null);
       notify.success(courierId ? "تم تعيين المندوب" : "تم إلغاء تعيين المندوب");
       setOrders(orders.map(o => o.id === orderId ? { ...o, delivery_user_id: courierId || null } : o));
     } catch (e) {
       notify.error("فشل التحديث");
     }
  };

  return (
    <div className="space-y-6">
       <div className="flex gap-4 items-center">
          <Input placeholder="بحث برقم الطلب..." className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="ALL">الكل</SelectItem>
               <SelectItem value="READY_FOR_PICKUP">جاهز للاستلام</SelectItem>
               <SelectItem value="OUT_FOR_DELIVERY">جاري التوصيل</SelectItem>
               <SelectItem value="DELIVERED">تم التوصيل</SelectItem>
               <SelectItem value="CANCELLED">ملغي</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadOrders} size="icon"><RefreshCw className="w-4 h-4" /></Button>
       </div>

       <div className="space-y-4">
          {orders.map(order => (
             <Card key={order.id}>
                <CardContent className="p-4">
                   <div className="flex flex-col md:flex-row gap-4 justify-between">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{order.order_number}</span>
                            <Badge variant="outline">{order.status}</Badge>
                            {order.delivery_settings_snapshot && (
                               <Badge variant="secondary" className="text-xs">
                                  {(order.delivery_settings_snapshot as any).fallBackMode ? "Fallback" : "Standard"}
                               </Badge>
                            )}
                         </div>
                         <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {order.delivery_address}
                         </div>
                         <div className="text-sm text-muted-foreground flex items-center gap-2">
                             <Truck className="w-3 h-3" />
                             {order.route_km ? `${order.route_km.toFixed(1)} كم` : 'N/A'} • 
                             {order.route_minutes ? `${Math.round(order.route_minutes)} دقيقة` : 'N/A'}
                         </div>
                      </div>

                      <div className="min-w-[200px] flex flex-col gap-2">
                          <div className="flex items-center justify-between text-sm">
                             <span>رسوم التوصيل:</span>
                             <span className="font-bold">{formatPrice(order.total_delivery_fee)}</span>
                          </div>
                          <Select 
                             value={order.delivery_user_id || "unassigned"}
                             onValueChange={(val) => handleAssign(order.id, val === "unassigned" ? undefined : val)}
                             disabled={order.status === 'DELIVERED'}
                          >
                             <SelectTrigger className="h-8">
                                <SelectValue placeholder="اختر مندوب" />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="unassigned">-- غير معين --</SelectItem>
                                {couriers.map(c => (
                                   <SelectItem key={c.courier_id} value={c.courier_id}>
                                      {c.profile?.full_name} ({c.profile?.phone})
                                   </SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="w-full">
                             <Eye className="w-3 h-3 ml-1" />
                             عرض التفاصيل
                          </Button>
                      </div>
                   </div>
                </CardContent>
             </Card>
          ))}
          {orders.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد طلبات</div>}
       </div>

       {/* Order Route Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent>
           <DialogHeader>
              <DialogTitle>تفاصيل التوصيل: {selectedOrder?.order_number}</DialogTitle>
           </DialogHeader>
           {selectedOrder && (
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-lg">
                    <div>
                       <span className="text-muted-foreground block">المسافة</span>
                       <span className="font-bold">{selectedOrder.route_km?.toFixed(2)} كم</span>
                    </div>
                    <div>
                       <span className="text-muted-foreground block">الوقت المقدر</span>
                       <span className="font-bold">{Math.round(selectedOrder.route_minutes || 0)} دقيقة</span>
                    </div>
                    <div>
                       <span className="text-muted-foreground block">رسوم التوصيل</span>
                       <span className="font-bold text-primary">{formatPrice(selectedOrder.total_delivery_fee)}</span>
                    </div>
                 </div>
                 
                 <div>
                    <h4 className="font-semibold text-sm mb-2">تفاصيل الرسوم</h4>
                    {selectedOrder.delivery_fee_breakdown ? (
                        <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto h-[150px] whitespace-pre-wrap">
                          {JSON.stringify(selectedOrder.delivery_fee_breakdown, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-sm text-muted-foreground">غير متوفر</p>
                    )}
                 </div>

                 {/* Future: Add Mapbox Preview here */}
                 <div className="bg-muted/20 border-2 border-dashed rounded-lg h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                    Map Preview Placeholder
                 </div>
              </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- SETTINGS TAB ---
function SettingsTab() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
     try {
       const data = await deliveryAdminService.getSettings();
       setSettings(data || {});
     } catch(e) { /* ignore */ } finally { setLoading(false); }
  };

  const handleSave = async () => {
     try {
       await deliveryAdminService.updateSettings(settings);
       notify.success("تم حفظ الإعدادات");
     } catch (e) {
       notify.error("فشل الحفظ");
     }
  };

  if (loading) return <div>Loadings...</div>;

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
             <CardHeader><CardTitle>التسعير</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <div className="grid gap-2">
                   <Label>سعر الفتح (Base Fee)</Label>
                   <Input type="number" value={settings.base_fee || 0} onChange={e => setSettings({...settings, base_fee: +e.target.value})} />
                </div>
                <div className="grid gap-2">
                   <Label>سعر الكيلومتر</Label>
                   <Input type="number" value={settings.km_rate || 0} onChange={e => setSettings({...settings, km_rate: +e.target.value})} />
                </div>
                <div className="grid gap-2">
                   <Label>سعر المحطة الإضافية</Label>
                   <Input type="number" value={settings.pickup_stop_fee || 0} onChange={e => setSettings({...settings, pickup_stop_fee: +e.target.value})} />
                </div>
                <div className="flex gap-4">
                   <div className="grid gap-2 flex-1">
                      <Label>الحد الأدنى</Label>
                      <Input type="number" value={settings.min_fee || 0} onChange={e => setSettings({...settings, min_fee: +e.target.value})} />
                   </div>
                   <div className="grid gap-2 flex-1">
                      <Label>الحد الأقصى</Label>
                      <Input type="number" value={settings.max_fee || 0} onChange={e => setSettings({...settings, max_fee: +e.target.value})} />
                   </div>
                </div>
             </CardContent>
          </Card>


          
          {/* Limits & Constraints */}
          <Card>
             <CardHeader><CardTitle>القيود والحدود</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <div className="grid gap-2">
                   <Label>الحد الأقصى للطلبات النشطة (للمندوب الواحد)</Label>
                   <p className="text-xs text-muted-foreground">عدد الطلبات التي يمكن للمندوب قبولها في نفس الوقت (قيد التوصيل أو الاستلام)</p>
                   <Input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={settings.max_active_orders || 3} 
                      onChange={e => setSettings({...settings, max_active_orders: +e.target.value})} 
                   />
                </div>
             </CardContent>
          </Card>

          <Card>
             <CardHeader><CardTitle>التوجيه والسلوك</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                   <Label>العودة للمنزل؟ (Return Trip)</Label>
                   <Switch checked={settings.return_to_customer} onCheckedChange={(checked: boolean) => setSettings({...settings, return_to_customer: checked})} />
                </div>
                <div className="grid gap-2">
                   <Label>Mapbox Profile</Label>
                   <Select value={settings.mapbox_profile || "driving"} onValueChange={v => setSettings({...settings, mapbox_profile: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="driving">Driving</SelectItem>
                         <SelectItem value="driving-traffic">Traffic Aware</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="grid gap-2 pt-4 border-t">
                   <Label className="text-destructive">Fallback (عند فشل الخرائط)</Label>
                   <Select value={settings.fallback_mode || "fixed_fee"} onValueChange={v => setSettings({...settings, fallback_mode: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="fixed_fee">تطبيق سعر ثابت</SelectItem>
                         <SelectItem value="block_checkout">منع الطلب</SelectItem>
                      </SelectContent>
                   </Select>
                   {settings.fallback_mode === 'fixed_fee' && (
                       <Input type="number" placeholder="Fixed Fee" value={settings.fixed_fallback_fee || 0} onChange={e => setSettings({...settings, fixed_fallback_fee: +e.target.value})} />
                   )}
                </div>
             </CardContent>
          </Card>
       </div>
       <div className="flex justify-end">
          <Button onClick={handleSave} className="w-full md:w-auto">حفظ التغييرات</Button>
       </div>
    </div>
  );
}

// --- MAIN PAGE ---
export function AdminDelivery() {
  const [activeTab, setActiveTab] = useState("overview");
  const [couriers, setCouriers] = useState<CourierSummary[]>([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCouriers();
  }, [period]);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), period));
      
      const summaries = await deliveryAdminService.getCouriersSummary(startDate, endDate);
      
      // Enrich with profile data
      const profiles = await profileService.getAll({ role: "DELIVERY" });
      
      const combined = summaries.map(s => ({
        ...s,
        profile: profiles.find(p => p.id === s.courier_id)
      }));
      
      // Also add couriers who have 0 stats
      profiles.forEach(p => {
         if (!combined.find(c => c.courier_id === p.id)) {
            combined.push({
               courier_id: p.id,
               total_earnings: 0,
               earnings_period: 0,
               delivered_count_lifetime: 0,
               delivered_count_period: 0,
               last_delivery_date: null,
               profile: p
            });
         }
      });

      setCouriers(combined);
    } catch (e) {
      console.error(e);
      notify.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  if (loading && couriers.length === 0) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold">مركز إدارة التوصيل</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">الأداء والمناديب</TabsTrigger>
          <TabsTrigger value="orders">تدقيق الطلبات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
           <CouriersTab couriers={couriers} period={period} setPeriod={setPeriod} />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
           <OrdersTab couriers={couriers} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
           <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
