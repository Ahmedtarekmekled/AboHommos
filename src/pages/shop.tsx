import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Ensure this import exists
import {
  Store,
  Star,
  Clock,
  Phone,
  MapPin,
  ShoppingBag,
  MessageCircle,
  Navigation,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { ShopProductCard } from "@/components/ShopProductCard";
import { Input } from "@/components/ui/input";
import { shopsService, productsService } from "@/services";



import { getShopOpenState } from "@/lib/shop-helpers";

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop", slug],
    queryFn: () => shopsService.getBySlug(slug!),
    enabled: !!slug,
  });

  // Fetch Working Hours
  const { data: workingHours } = useQuery({
    queryKey: ["shop-hours", shop?.id],
    queryFn: () => shop?.id ? shopsService.getHours(shop.id) : Promise.resolve([]),
    enabled: !!shop?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!shop?.id) return;

    const channel = supabase
      .channel(`shop-status-${shop.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT/UPDATE/DELETE)
          schema: 'public',
          table: 'shops',
          filter: `id=eq.${shop.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop", slug] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_working_hours',
          filter: `shop_id=eq.${shop.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-hours", shop.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop?.id, slug, queryClient]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "shop", shop?.id],
    queryFn: () => productsService.getAll({ shopId: shop?.id }),
    enabled: !!shop?.id,
  });

  // --- Handlers ---
  const handleOpenMaps = () => {
    if (shop?.latitude && shop?.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`,
        "_blank"
      );
    } else if (shop?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`,
        "_blank"
      );
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shop?.name,
        text: shop?.description || "",
        url: window.location.href,
      });
    }
  };

  const handleCall = () => {
    if (shop?.phone) {
      window.location.href = `tel:${shop.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (shop?.whatsapp || shop?.phone) {
      const number = shop?.whatsapp || shop?.phone;
      window.open(`https://wa.me/${number.replace(/\D/g, "")}`, "_blank");
    }
  };


  if (shopLoading) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Skeleton className="h-64 w-full" />
        <div className="container-app py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="py-16" dir="rtl">
        <div className="container-app text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">المتجر غير موجود</h2>
          <Link to="/shops">
            <Button variant="outline">عرض المتاجر</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Status
  // If workingHours is undefined, pass empty array to rely on legacy/override
  const shopStatus = getShopOpenState(shop, workingHours || []);
  const isApproved = shop.approval_status === "APPROVED";
  const canOrder = isApproved && shopStatus.isOpen;

  // Format Today's Hours
  const today = new Date().getDay();
  const todayShifts = workingHours?.filter(h => h.day_of_week === today && h.is_enabled)
    .sort((a,b) => (a.period_index || 0) - (b.period_index || 0)) || [];
    
  let todayTimeRange = "مغلق اليوم";
  if (todayShifts.length > 0) {
    todayTimeRange = todayShifts.map(s => 
      `${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}`
    ).join(" / ");
  }

  // --- End Logic ---



  return (
    <div className="min-h-screen" dir="rtl">
      {/* Cover Hero Section */}
      <div className="relative mb-16">
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden rounded-b-3xl">
          {shop.cover_url ? (
            <img
              src={shop.cover_url}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-24 h-24 text-primary/20" />
            </div>
          )}
        </div>
        
        {/* Logo Overlay - Positioned at bottom right with white border (Outside overflow-hidden) */}
        <div className="absolute bottom-0 right-6 translate-y-1/2 z-10">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                <Store className="w-10 h-10 text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shop Info Section */}
      <div className="bg-background">
        <div className="container-app pb-6">
          <div className="flex items-center gap-3 mb-4">
            {/* Category Badge */}
            <div>
              {(shop as any).category && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {(shop as any).category?.icon && <span className="ml-1">{(shop as any).category.icon}</span>}
                  {(shop as any).category?.name}
                </Badge>
              )}
            </div>
            
            {/* Premium Badge - Moved to ensure it stays on the right/start */}
            {shop.is_premium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 border-0">
                <Star className="w-3 h-3 ml-1 fill-current" />
                مميز
              </Badge>
            )}
          </div>

          {/* Shop Name */}
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{shop.name}</h1>

          {/* Description */}
          {shop.description && (
            <p className="text-muted-foreground mb-4 max-w-2xl">
              {shop.description}
            </p>
          )}

          {/* Rating & Stats Row */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Orders Count */}
            <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              {shop.total_orders || 0} طلب
            </span>



            {/* Phone */}
            {shop.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{shop.phone}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {shop.address && (
            <div className="flex items-start gap-2 mb-6 text-muted-foreground">
              <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{shop.address}</span>
            </div>
          )}

          {/* Status & Action Buttons */}


          <div className="flex flex-wrap gap-3">
             {/* Status Badge */}
             <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium ${
                shopStatus.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
             }`}>
                <Clock className="w-4 h-4" />
                <span>
                  {shopStatus.isOpen 
                    ? (shopStatus.reason === 'MANUAL_OPEN' ? "مفتوح (تجاوز يدوي)" : "مفتوح الآن") 
                    : (shopStatus.reason === 'MANUAL_CLOSED' ? "مغلق (تجاوز يدوي)" : "مغلق")}
                </span>
             </div>

             <Button variant="outline" onClick={handleOpenMaps} disabled={!shop.latitude && !shop.address}>
               <MapPin className="w-4 h-4 ml-2" />
               Google Maps
             </Button>

            <Button variant="outline" onClick={handleCall} disabled={!shop.phone}>
              <Phone className="w-4 h-4 ml-2" />
              اتصال
            </Button>
            
            <Button variant="outline" onClick={handleWhatsApp} disabled={!shop.whatsapp && !shop.phone}>
               <MessageCircle className="w-4 h-4 ml-2" />
               واتساب
            </Button>
          </div>


          {/* Warning if not approved */}
          {!isApproved && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                هذا المتجر قيد المراجعة ولا يقبل طلبات حالياً
              </p>
            </div>
          )}

          {/* Warning if closed */}
          {isApproved && !shopStatus.isOpen && (
            <div className="mt-6 p-4 bg-muted border rounded-lg">
              <p className="text-sm text-muted-foreground">
                 {shop.override_mode === 'FORCE_CLOSED' 
                   ? "المتجر مغلق مؤقتاً من قبل المالك. يرجى المحاولة لاحقاً."
                   : "المتجر مغلق حالياً حسب ساعات العمل. يمكنك تصفح المنتجات ولكن لا يمكنك الطلب."
                 }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-muted/30">
        <div className="container-app py-8">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="products" className="text-base">
                المنتجات
              </TabsTrigger>
              <TabsTrigger value="about" className="text-base">
                عن المتجر
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {!canOrder && (
                <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg">
                  لا يمكن الطلب من هذا المتجر حالياً
                </div>
              )}

              {/* Search & Categories */}
              <div className="space-y-4 sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن منتج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {products && products.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-sides">
                    <Badge
                      variant={selectedCategory === null ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedCategory(null)}
                    >
                      الكل
                    </Badge>
                    {/* Extract Unique Categories */}
                    {Array.from(new Set(products.map((p: any) => p.category?.id).filter(Boolean))).map((catId: any) => {
                      const category = products.find((p: any) => p.category?.id === catId)?.category;
                      if (!category) return null;
                      return (
                         <Badge
                          key={catId}
                          variant={selectedCategory === catId ? "default" : "outline"}
                          className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm hover:opacity-80 transition-opacity flex items-center gap-1.5"
                          onClick={() => setSelectedCategory(catId)}
                        >
                          {/* {category.icon && <span>{category.icon}</span>} */}
                          {category.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i} className="overflow-hidden border-none shadow-none bg-muted/10">
                        <Skeleton className="aspect-square rounded-xl" />
                        <div className="pt-3 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(() => {
                      const filteredProducts = products?.filter((p: any) => {
                         const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                         const matchesCategory = selectedCategory ? p.category?.id === selectedCategory : true;
                         return matchesSearch && matchesCategory;
                      });

                      if (!filteredProducts || filteredProducts.length === 0) {
                         return (
                           <div className="col-span-full py-16 text-center">
                             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                               <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                             </div>
                             <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
                             <p className="text-muted-foreground">
                               لم يتم العثور على منتجات تطابق بحثك
                             </p>
                             {searchQuery && (
                               <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                                 مسح البحث
                               </Button>
                             )}
                           </div>
                         );
                      }

                      return filteredProducts.map((product: any) => (
                        <ShopProductCard 
                          key={product.id} 
                          product={product} 
                          shopId={shop!.id}
                          canOrder={canOrder} 
                        />
                      ));
                    })()}
                  </div>
                </>
              )}
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <Card>
                <CardContent className="p-6 space-y-6" dir="rtl">
                  <div className="text-right">
                    <h3 className="font-semibold text-lg mb-4">عن المتجر</h3>
                    {shop.description ? (
                      <p className="text-muted-foreground leading-relaxed">
                        {shop.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        لا توجد معلومات إضافية عن المتجر
                      </p>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4 pt-4 border-t">
                    {shop.address && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-right">
                          <h4 className="font-medium mb-1">العنوان</h4>
                          <p className="text-muted-foreground text-sm">
                            {shop.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {shop.phone && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-right">
                          <h4 className="font-medium mb-1">رقم الهاتف</h4>
                          <p className="text-muted-foreground text-sm">
                            {shop.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-right">
                        <h4 className="font-medium mb-1">حالة المتجر</h4>
                        <div className="flex flex-col gap-1">
                          <p
                            className={`text-sm font-medium ${
                              shopStatus.isOpen ? "text-success" : "text-destructive"
                            }`}
                          >
                            {shopStatus.isOpen ? "مفتوح" : "مغلق"}
                          </p>
                          <p className="text-xs text-muted-foreground" dir="ltr">
                             {todayTimeRange}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
