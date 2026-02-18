import { useEffect, useState } from "react";
import { useAuth } from "@/store";
import { orderService } from "@/services/order.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Loader2, Calendar, PackageCheck, Wallet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { TelegramConnect } from "@/components/notifications/TelegramConnect";

export function CourierAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<{ monthly_earnings: number; monthly_count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [hist, st] = await Promise.all([
          orderService.getDeliveryHistory(user.id),
          orderService.getDeliveryStats(user.id)
        ]);
        setHistory(hist);
        setStats(st);
      } catch (e) {
        console.error("Failed to load account data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">حسابي</h1>
      </div>

      {/* Telegram Settings */}
      <TelegramConnect />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
             <Wallet className="w-6 h-6 text-primary mb-2" />
             <p className="text-xs text-muted-foreground">أرباح الشهر</p>
             <p className="text-xl font-bold text-primary">{formatPrice(stats?.monthly_earnings || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
             <PackageCheck className="w-6 h-6 text-green-600 mb-2" />
             <p className="text-xs text-muted-foreground">طلبات مكتملة</p>
             <p className="text-xl font-bold">{stats?.monthly_count || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            سجل الطلبات
        </h3>
        
        <div className="space-y-3">
            {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    لا يوجد سجل طلبات سابق
                </div>
            ) : (
                history.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                        <div className="flex justify-between items-center p-3 text-sm bg-muted/40">
                             <span className="font-mono font-bold">#{order.order_number}</span>
                             <Badge variant={order.status === 'DELIVERED' ? 'default' : 'destructive'}>
                                {order.status === 'DELIVERED' ? 'تم التسليم' : 'تم الإلغاء'}
                             </Badge>
                        </div>
                        <div className="p-3 text-sm space-y-1">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">التاريخ:</span>
                                <span>{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">ربح التوصيل:</span>
                                <span className="font-medium text-green-600">+{formatPrice(order.total_delivery_fee)}</span>
                             </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
      </div>
    </div>
  );
}
