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
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";

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
      toast.error("فشل تحميل البيانات");
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
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {shop.name}
              {!shop.is_active && (
                <Badge variant="destructive" className="text-sm">
                  <AlertOctagon className="w-4 h-4 mr-1" />
                  معطل
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <Store className="w-4 h-4" />
              تحليلات المتجر في آخر {period} يوم
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant={period === 7 ? "default" : "outline"} onClick={() => setPeriod(7)}>7 أيام</Button>
           <Button variant={period === 30 ? "default" : "outline"} onClick={() => setPeriod(30)}>30 يوم</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي المبيعات (المحققة)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              طلبات تم توصيلها بنجاح
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              عدد الطلبات
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              في الفترة المحددة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              متوسط قيمة الطلب
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(avgOrderValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>المبيعات اليومية</CardTitle>
          <CardDescription>عرض المبيعات اليومية للمتجر</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => format(new Date(val), "d MMM", { locale: ar })} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                labelFormatter={(val) => format(new Date(val), "d MMMM yyyy", { locale: ar })}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="المبيعات" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

     {/* Orders Chart */}
      <Card>
        <CardHeader>
          <CardTitle>حركة الطلبات</CardTitle>
          <CardDescription>عدد الطلبات اليومية للمتجر</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
               <XAxis 
                dataKey="date" 
                tickFormatter={(val) => format(new Date(val), "d MMM", { locale: ar })} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                 cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                 labelFormatter={(val) => format(new Date(val), "d MMMM yyyy", { locale: ar })}
              />
              <Bar 
                dataKey="orders_count" 
                name="عدد الطلبات" 
                fill="hsl(var(--secondary))" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
