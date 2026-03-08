import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Store,
  Truck,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/app-context";
import { Category } from "@/types/database";
import { categoriesService, productsService, shopsService } from "@/services";
import { ShopCard } from "@/components/ShopCard";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('home-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shops"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Fetch all categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getAll(),
  });

  // Filter shop categories for the shop categories bar
  const shopCategories = categories?.filter(c => c.type === 'SHOP') || [];
  
  // Product categories for the existing categories section
  const productCategories = categories?.filter(c => c.type === 'PRODUCT') || [];

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productsService.getAll({ featured: true, limit: 8 }),
  });

  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["shops", "featured"],
    queryFn: () => shopsService.getRankedShops({ limit: 6 }),
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 md:py-32 overflow-hidden">
        {/* Dynamic Background Blobs */}
        <div className="absolute top-0 -left-1/4 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 blur-3xl rounded-full opacity-60 animate-pulse mix-blend-multiply pointer-events-none" />
        
        <div className="container-app relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm rounded-full bg-background/80 backdrop-blur-md border border-primary/20 shadow-sm text-foreground">
              <TrendingUp className="w-4 h-4 ml-2 text-primary" />
              منصة التسوق المحلية الأولى
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-balance leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-primary/70">تسوق</span> من متاجرك المحلية{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-secondary/70">بسهولة</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed opacity-90">
              اكتشف أفضل المنتجات من المتاجر المحلية في منطقتك واحصل عليها بأسرع
              وقت
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link to="/products">
                <Button size="xl" className="w-full sm:w-auto gap-3 text-lg h-14 px-8 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1">
                  <ShoppingBag className="w-5 h-5" />
                  تصفح المنتجات
                </Button>
              </Link>
              <Link to="/shops">
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full sm:w-auto gap-3 text-lg h-14 px-8 rounded-full bg-background/50 backdrop-blur-sm border-2 hover:bg-background transition-all hover:-translate-y-1"
                >
                  <Store className="w-5 h-5" />
                  استكشف المتاجر
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="container-app mt-20 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Store,
                title: "متاجر موثوقة",
                desc: "متاجر محلية معتمدة وموثوقة",
              },
              {
                icon: Truck,
                title: "توصيل سريع",
                desc: "احصل على طلبك في أسرع وقت",
              },
              {
                icon: Star,
                title: "جودة مضمونة",
                desc: "منتجات طازجة وعالية الجودة",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="text-center p-8 bg-background/70 backdrop-blur-xl border-primary/5 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 rounded-3xl"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-inner shadow-white/20">
                  <feature.icon className="w-8 h-8 text-primary-foreground drop-shadow-sm" />
                </div>
                <h2 className="font-bold text-xl mb-3 text-foreground">{feature.title}</h2>
                <p className="text-muted-foreground text-base leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Shop Categories Horizontal Bar - NEW */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative">
        <div className="absolute inset-0 bg-grid-primary/[0.02] bg-[size:32px_32px]" />
        <div className="container-app relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">تصفح المتاجر حسب النوع</h2>
              <p className="text-muted-foreground mt-2 text-lg">اختر نوع المتجر المناسب لك</p>
            </div>
          </div>
          
          {/* Horizontal Scrollable Categories */}
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 pb-6 pt-2" dir="rtl">
              {categoriesLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-44 rounded-3xl flex-shrink-0" />
                ))
              ) : (
                shopCategories.map((category, i) => (
                  <Link
                    key={category.id}
                    to={`/shops?category=${category.slug}`}
                    className="group flex-shrink-0 animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Card 
                      interactive 
                      className="h-36 w-44 rounded-3xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 border-primary/10"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 group-hover:from-primary/15 group-hover:to-secondary/15 transition-all duration-500" />
                      <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-16 h-16 mb-3 rounded-full bg-white/50 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                          {category.image_url ? (
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-3xl">{category.icon || "🏪"}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-foreground/90 leading-tight line-clamp-2">{category.name}</h3>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-24 bg-background relative border-t border-primary/5">
        <div className="container-app relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {AR.products.featured}
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">منتجات مختارة بعناية من أفضل المتاجر</p>
            </div>
            <Link to="/products">
              <Button variant="ghost" className="gap-2 rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {productsLoading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden rounded-3xl border-primary/10">
                      <Skeleton className="aspect-[4/5]" />
                      <CardContent className="p-6 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-6 w-1/3 mt-2" />
                      </CardContent>
                    </Card>
                  ))
              : featuredProducts && featuredProducts.length > 0 ? (
                  featuredProducts.map((product: any) => (
                  <Link key={product.id} to={`/products/${product.id}`} className="group">
                    <Card interactive className="overflow-hidden h-full rounded-3xl border-primary/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 bg-background/50 backdrop-blur-sm">
                      <div className="aspect-[4/5] relative overflow-hidden bg-muted/30">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground/50 transition-transform duration-700 group-hover:scale-110" />
                          </div>
                        )}
                        {product.compare_at_price &&
                          product.compare_at_price > product.price && (
                            <Badge
                              className="absolute top-4 right-4 z-20 px-3 py-1 shadow-lg backdrop-blur-md bg-destructive/90 text-white font-bold border-none"
                              variant="destructive"
                            >
                              خصم{" "}
                              {Math.round(
                                (1 - product.price / product.compare_at_price) *
                                  100
                              )}
                              %
                            </Badge>
                          )}
                      </div>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-primary mb-2 line-clamp-1">
                          {product.shop?.name}
                        </p>
                        <h3 className="font-bold text-lg line-clamp-2 mb-4 text-foreground/90 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-auto">
                          <span className="font-black text-primary text-xl tracking-tight">
                            {formatPrice(product.price)}
                          </span>
                          {product.compare_at_price &&
                            product.compare_at_price > product.price && (
                              <span className="text-muted-foreground line-through text-sm font-medium opacity-60">
                                {formatPrice(product.compare_at_price)}
                              </span>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-primary/20">
                  <ShoppingBag className="w-20 h-20 mx-auto text-primary/40 mb-6" />
                  <p className="text-xl font-medium text-muted-foreground">لا توجد منتجات متاحة حالياً</p>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Shops Section */}
      <section className="py-24 bg-gradient-to-br from-primary/5 via-primary/5 to-secondary/5 relative">
        <div className="absolute inset-0 bg-white/40" />
        <div className="container-app relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {AR.shops.featured}
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                أفضل المتاجر المحلية وتقييماتها
              </p>
            </div>
            <Link to="/shops">
              <Button variant="ghost" className="gap-2 rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {shopsLoading
              ? Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="p-8 rounded-3xl border-primary/10">
                      <div className="flex items-center gap-6">
                        <Skeleton className="w-20 h-20 rounded-2xl" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </Card>
                  ))
              : shops && shops.length > 0 ? (
                  shops.map((shop: any, i: number) => (
                  <ShopCard key={shop.id} shop={shop} index={i} />
                ))
              ) : (
                <div className="col-span-full text-center py-20 bg-background/50 backdrop-blur-sm rounded-3xl border border-dashed border-primary/20">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-10 h-10 text-primary/60" />
                  </div>
                  <p className="text-xl font-medium text-foreground mb-6">لاتوجد متاجر متاحة حالياً</p>
                  <Link to="/register?role=shop_owner">
                    <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">سجل متجرك الآن</Button>
                  </Link>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* CTA Section - Only visible to unauthenticated users */}
      {!user && (
        <section className="py-24 relative overflow-hidden">
          {/* Dynamic Abstract Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 blur-[100px] rounded-full mix-blend-overlay" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/20 blur-[100px] rounded-full mix-blend-overlay" />
          
          <div className="container-app text-center relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md mb-8 ring-1 ring-white/20 shadow-2xl">
              <Store className="w-10 h-10 text-white drop-shadow-md" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white tracking-tight text-balance">
              هل أنت صاحب متجر؟
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              انضم إلى منصتنا وابدأ في بيع منتجاتك لآلاف العملاء في منطقتك. ضاعف مبيعاتك اليوم!
            </p>
            <Link to="/register?role=shop_owner">
              <Button size="xl" variant="secondary" className="gap-3 text-lg h-16 px-10 rounded-full bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-2xl shadow-black/20 font-bold">
                <Store className="w-6 h-6" />
                سجل متجرك مجاناً
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
