import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shopsService } from "@/services/catalog.service";
import { WorkingHours, Shop } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { Loader2, Save, Clock, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ShopHoursSettingsProps {
  shop: Shop;
}

const DAYS = [
  { id: 0, label: "الأحد" },
  { id: 1, label: "الاثنين" },
  { id: 2, label: "الثلاثاء" },
  { id: 3, label: "الأربعاء" },
  { id: 4, label: "الخميس" },
  { id: 5, label: "الجمعة" },
  { id: 6, label: "السبت" },
];

export function ShopHoursSettings({ shop }: ShopHoursSettingsProps) {
  const queryClient = useQueryClient();
  const [statusOverride, setStatusOverride] = useState(shop.override_mode);
  const [hoursState, setHoursState] = useState<Partial<WorkingHours>[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setStatusOverride(shop.override_mode);
  }, [shop.override_mode]);

  const { data: hours, isLoading } = useQuery({
    queryKey: ["shop-hours", shop.id],
    queryFn: () => shopsService.getHours(shop.id),
  });

  useEffect(() => {
    if (hours) {
        // Map database hours to state, ensuring all days exist
        const initialExcisting = hours || [];
        const initializedState = DAYS.map(day => {
            const existing = initialExcisting.find(h => h.day_of_week === day.id);
            return existing || { 
                day_of_week: day.id, 
                shop_id: shop.id, 
                is_day_off: false, 
                open_time: "09:00", 
                close_time: "22:00" 
            };
        });
        setHoursState(initializedState);
    }
  }, [hours, shop.id]);

  const updateOverrideMutation = useMutation({
    mutationFn: async (mode: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED') => {
      // Optimistic Update
      setStatusOverride(mode);
      await shopsService.updateOverride(shop.id, mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop", shop.slug] });
      queryClient.invalidateQueries({ queryKey: ["shop", "owner", shop.owner_id] });
      queryClient.invalidateQueries({ queryKey: ["shops"] }); 
      notify.success("تم تحديث حالة المتجر");
    },
    onError: () => {
      notify.error("حدث خطأ أثناء التحديث");
      // Revert logic could go here if needed
      setStatusOverride(shop.override_mode);
    },
  });

  const saveHoursMutation = useMutation({
    mutationFn: async (hoursToSave: Partial<WorkingHours>[]) => {
      await shopsService.updateHours(shop.id, hoursToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-hours", shop.id] });
      setHasChanges(false);
      notify.success("تم حفظ ساعات العمل");
    },
    onError: () => notify.error("حدث خطأ أثناء الحفظ"),
  });

  const handleHourChange = (dayId: number, field: keyof WorkingHours, value: any) => {
    setHoursState(prev => prev.map(h => 
        h.day_of_week === dayId ? { ...h, [field]: value } : h
    ));
    setHasChanges(true);
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>;

  return (
    <div className="space-y-8">
      {/* 1. Status Override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            التحكم السريع بالحالة
          </CardTitle>
          <CardDescription>
            يمكنك إجبار المتجر على الفتح أو الإغلاق بغض النظر عن الجدول الزمني.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-4">
                <Button 
                    variant={statusOverride === 'AUTO' ? "default" : "outline"}
                    onClick={() => updateOverrideMutation.mutate('AUTO')}
                    disabled={updateOverrideMutation.isPending && statusOverride !== 'AUTO'}
                >
                    تلقائي (حسب الجدول)
                </Button>
                <Button 
                    variant={statusOverride === 'FORCE_OPEN' ? "default" : "outline"}
                    className={statusOverride === 'FORCE_OPEN' ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => updateOverrideMutation.mutate('FORCE_OPEN')}
                    disabled={updateOverrideMutation.isPending && statusOverride !== 'FORCE_OPEN'}
                >
                    مفتوح دائماً (مجبر)
                </Button>
                <Button 
                    variant={statusOverride === 'FORCE_CLOSED' ? "destructive" : "outline"}
                    onClick={() => updateOverrideMutation.mutate('FORCE_CLOSED')}
                    disabled={updateOverrideMutation.isPending && statusOverride !== 'FORCE_CLOSED'}
                >
                    مغلق مؤقتاً (مجبر)
                </Button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
                الحالة الحالية: <span className="font-bold text-foreground">
                    {statusOverride === 'AUTO' ? "تلقائي" : 
                     statusOverride === 'FORCE_OPEN' ? "مفتوح يدوياً" : "مغلق يدوياً"}
                </span>
            </div>
        </CardContent>
      </Card>

      {/* 2. Schedule Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            جدول العمل الأسبوعي
          </CardTitle>
          <CardDescription>
            حدد ساعات العمل لكل يوم. سيتم اعتبار المتجر مغلقاً خارج هذه الأوقات في الوضع التلقائي.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <div className="space-y-4">
                {DAYS.map(day => {
                    const dayState = hoursState.find(h => h.day_of_week === day.id);
                    if (!dayState) return null;

                    return (
                        <div key={day.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border rounded-lg bg-card/50">
                            <div className="w-24 font-medium flex items-center justify-between">
                                {day.label}
                                <Switch 
                                    checked={!dayState.is_day_off}
                                    onCheckedChange={(checked) => handleHourChange(day.id, 'is_day_off', !checked)}
                                />
                            </div>
                            
                            {!dayState.is_day_off ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">فتح</Label>
                                            <Input 
                                                type="time" 
                                                value={dayState.open_time || "09:00"} 
                                                onChange={(e) => handleHourChange(day.id, 'open_time', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">إغلاق</Label>
                                            <Input 
                                                type="time" 
                                                value={dayState.close_time || "22:00"} 
                                                onChange={(e) => handleHourChange(day.id, 'close_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 text-muted-foreground text-sm flex items-center justify-center bg-muted/20 rounded h-16">
                                    مغلق طوال اليوم
                                </div>
                            )}
                        </div>
                    );
                })}
             </div>

             <div className="mt-6 flex justify-end">
                <Button 
                    onClick={() => saveHoursMutation.mutate(hoursState)} 
                    disabled={!hasChanges || saveHoursMutation.isPending}
                    className="gap-2"
                >
                    {saveHoursMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                    حفظ التغييرات
                </Button>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
