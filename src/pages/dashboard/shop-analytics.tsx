import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowRight, 
  Store, 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  AlertOctagon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shopsService } from "@/services/catalog.service";
import { Shop } from "@/types/database";
import { formatPrice, cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopHoursSettings } from "@/components/dashboard/ShopHoursSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface AnalyticsData {
  date: string;
  revenue: number;
  orders_count: number;
}

export function ShopAnalytics() {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30); // days

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id, period]);

  const loadData = async (shopId: string) => {
    setLoading(true);
    try {
      const shopData = await shopsService.getById(shopId);
      setShop(shopData);

      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), period));

      const analyticsData = await shopsService.getAnalytics(shopId, startDate, endDate);
      
      // Fill missing days with 0
      const days = [];
      let currentDate = startDate;
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const existing = analyticsData.find(d => d.date === dateStr);
        days.push(existing || { date: dateStr, revenue: 0, orders_count: 0 });
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      }
      
      setAnalytics(days);
    } catch (error) {
      console.error(error);
      notify.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!shop) {
    return <div className="p-8 text-center">المتجر غير موجود</div>;
  }

  const totalRevenue = analytics.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = analytics.reduce((acc, curr) => acc + curr.orders_count, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/shops">
            <Button variant="outline" size="icon">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
             {shop.logo_url && (
                <img src={shop.logo_url} alt={shop.name} className="w-10 h-10 rounded-full object-cover border" />
             )}
             <div>
                <h1 className="text-2xl font-bold">{shop.name}</h1>
                <p className="text-sm text-muted-foreground">لوحة التحكم والتحليلات</p>
             </div>
          </div>
        </div>
        <div className="flex gap-2">
            <Badge variant={shop.is_active ? "default" : "destructive"}>
                {shop.is_active ? "نشط" : "متوقف"}
            </Badge>
            <Badge variant="outline">
                {shop.override_mode === 'AUTO' ? "مجَدول" : (shop.override_mode === 'FORCE_OPEN' ? "مفتوح يدوياً" : "مغلق يدوياً")}
            </Badge>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6" dir="rtl">
        <TabsList>
            <TabsTrigger value="analytics">نظرة عامة والتحليلات</TabsTrigger>
            <TabsTrigger value="settings">ساعات العمل والإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
                   <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    خلال {period} يوم
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">عدد الطلبات</CardTitle>
                   <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    خلال {period} يوم
                  </p>
                </CardContent>
              </Card>

              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
                     <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(avgOrderValue)}</div>
                    <p className="text-xs text-muted-foreground">
                      معدل السلة
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">الفترة</CardTitle>
                     <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                     <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">آخر 7 أيام</SelectItem>
                          <SelectItem value="30">آخر 30 يوم</SelectItem>
                          <SelectItem value="90">آخر 90 يوم</SelectItem>
                        </SelectContent>
                     </Select>
                  </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>الإيرادات</CardTitle>
                    <CardDescription>المبيعات اليومية</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), "dd/MM")}
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: "8px", direction: "rtl", textAlign: "right" }}
                          labelFormatter={(label) => format(new Date(label), "PPP", { locale: ar })}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          name="المبيعات" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                      <CardTitle>الطلبات</CardTitle>
                      <CardDescription>عدد الطلبات اليومية</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => format(new Date(date), "dd/MM")}
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: "8px", direction: "rtl", textAlign: "right" }}
                            labelFormatter={(label) => format(new Date(label), "PPP", { locale: ar })}
                          />
                          <Legend />
                          <Bar 
                            dataKey="orders_count" 
                            name="الطلبات" 
                            fill="#16a34a" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
            </div>
        </TabsContent>

        <TabsContent value="settings">
            <ShopHoursSettings shop={shop} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
