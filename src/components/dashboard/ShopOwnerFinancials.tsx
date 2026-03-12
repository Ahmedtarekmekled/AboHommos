import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle, CheckCircle, Clock, Receipt, CreditCard, Star } from "lucide-react";
import { analyticsService, DetailedFinancialReport } from "@/services/analytics.service";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/store";
import { shopsService } from "@/services/catalog.service";

export function ShopOwnerFinancials() {
  const { user } = useAuth();
  const [report, setReport] = useState<DetailedFinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFinancials = async () => {
      if (!user) return;
      try {
        const shop = await shopsService.getByOwnerId(user.id);
        if (shop && shop.approval_status === "APPROVED") {
          const data = await analyticsService.getShopDetailedFinancialReport(shop.id);
          setReport(data);
        }
      } catch (error) {
        console.error("Failed to load financials:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFinancials();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">الماليات والمستحقات</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  const { summary, orders, payments, subscriptions } = report || {
    summary: { net_debt: 0, total_revenue: 0, total_paid: 0, total_commission_owed: 0, total_subscription_owed: 0 },
    orders: [],
    payments: [],
    subscriptions: [],
  };

  const hasDebt = summary.net_debt > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الماليات والمستحقات</h1>
        <p className="text-muted-foreground mt-1">عرض جميع تفاصيل المدفوعات والعمولات المستحقة والمسددة.</p>
      </div>

      {hasDebt && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <DollarSign className="w-32 h-32 text-red-600" />
          </div>
          <div className="bg-red-100 rounded-full p-3 shrink-0 relative z-10">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-red-800 text-xl">إجمالي الدين المستحق للمنصة</h3>
            <p className="text-red-700 mt-2 text-base font-medium leading-relaxed max-w-2xl">
              يوجد مبلغ مستحق قدره <span className="font-bold text-red-900 text-lg mx-1">{formatPrice(summary.net_debt)}</span> يمثل إجمالي عمولات واشتراكات متأخرة الدفع.
            </p>
            <p className="text-sm text-red-600/90 mt-1">يرجى تسوية المديونية في أقرب وقت لتجنب إيقاف خدمات المتجر.</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات (المنفذة)</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(summary.total_revenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">إجمالي المسحوبات / المديونية</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatPrice(summary.net_debt)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600">إجمالي المسدد</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(summary.total_paid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charges Breakdown — NEW */}
      {(summary.total_commission_owed > 0 || summary.total_subscription_owed > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تفاصيل المستحقات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.total_commission_owed > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">عمولة الطلبات</p>
                    <p className="font-bold text-sm">{formatPrice(summary.total_commission_owed)}</p>
                  </div>
                </div>
              )}

              {summary.total_subscription_owed > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">رسوم الاشتراك</p>
                    <p className="font-bold text-sm">{formatPrice(summary.total_subscription_owed)}</p>
                  </div>
                </div>
              )}

              {summary.total_paid > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المبالغ المسددة</p>
                    <p className="font-bold text-sm text-green-600">{formatPrice(summary.total_paid)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>أحدث الطلبات (العمولات المستحقة)</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات منفذة حالياً</p>
            ) : (
              <div className="space-y-4">
                {orders.slice(-5).reverse().map((o: any, i: number) => (
                  <div key={i} className="flex justify-between items-center pb-2 border-b last:border-0 border-border/50">
                    <div>
                      <p className="font-semibold text-sm">طلب #{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-destructive">عمولة: {formatPrice(o.commission_fee)}</p>
                      <p className="text-xs text-muted-foreground">من أصل {formatPrice(o.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل الدفعات المسددة للمنصة</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لم يتم تسجيل أي دفعات سابقة</p>
            ) : (
              <div className="space-y-4">
                {payments.slice(-5).reverse().map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center pb-2 border-b last:border-0 border-border/50">
                    <div className="flex items-center gap-2">
                       <CheckCircle className="w-4 h-4 text-green-600" />
                       <div>
                         <p className="font-semibold text-sm">سداد نقدي</p>
                         <p className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleDateString('ar-SA')}</p>
                       </div>
                    </div>
                    <div>
                      <span className="font-bold text-green-600">{formatPrice(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Charges — NEW */}
      {subscriptions && subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>رسوم الاشتراكات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions.map((sub: any, i: number) => (
                <div key={i} className="flex justify-between items-center pb-2 border-b last:border-0 border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        اشتراك شهر {sub.billing_month ? new Date(sub.billing_month).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.paid_at ? new Date(sub.paid_at).toLocaleDateString('ar-SA') : 'لم يُسدد بعد'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{formatPrice(sub.amount)}</span>
                    <Badge
                      variant={sub.status === 'PAID' ? 'default' : 'secondary'}
                      className={sub.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}
                    >
                      {sub.status === 'PAID' ? 'مسدد' : 'معلق'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
