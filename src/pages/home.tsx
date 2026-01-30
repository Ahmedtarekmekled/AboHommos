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
import { useQuery } from "@tanstack/react-query";
import { categoriesService, productsService, shopsService } from "@/services";

// Demo data for initial display
const demoCategories = [
  {
    id: "1",
    name: "إلكترونيات",
    slug: "electronics",
    icon: "📱",
    image_url: "/images/electronics.jpg",
  },
  {
    id: "2",
    name: "ألبان ومنتجات ألبان",
    slug: "dairy",
    icon: "🥛",
    image_url: "/images/dairy.jpg",
  },
  {
    id: "3",
    name: "خضروات وفواكه",
    slug: "vegetables",
    icon: "🥬",
    image_url: "/images/vegetables.jpg",
  },
  {
    id: "4",
    name: "لحوم ودواجن",
    slug: "meat",
    icon: "🍖",
    image_url: "/images/meat.jpg",
  },
  {
    id: "5",
    name: "مشروبات",
    slug: "beverages",
    icon: "🥤",
    image_url: "/images/beverages.jpg",
  },
  {
    id: "6",
    name: "منظفات",
    slug: "cleaning",
    icon: "🧹",
    image_url: "/images/cleaning.jpg",
  },
  {
    id: "7",
    name: "مستلزمات منزلية",
    slug: "household",
    icon: "🏠",
    image_url: "/images/household.jpg",
  },
  {
    id: "8",
    name: "مخبوزات",
    slug: "bakery",
    icon: "🥖",
    image_url: "/images/bakery.jpg",
  },
];

const demoProducts = [
  {
    id: "1",
    name: "حليب طازج كامل الدسم",
    price: 25,
    original_price: 30,
    image_url: "/images/milk.jpg",
    shop: { name: "سوبر ماركت النور" },
  },
  {
    id: "2",
    name: "خبز بلدي طازج",
    price: 5,
    image_url: "/images/bread.jpg",
    shop: { name: "مخبز الفرن الذهبي" },
  },
  {
    id: "3",
    name: "طماطم طازجة",
    price: 15,
    image_url: "/images/tomatoes.jpg",
    shop: { name: "خضروات الحاج محمود" },
  },
  {
    id: "4",
    name: "دجاج مجمد",
    price: 85,
    original_price: 95,
    image_url: "/images/chicken.jpg",
    shop: { name: "لحوم الأمانة" },
  },
];

const demoShops = [
  {
    id: "1",
    name: "سوبر ماركت النور",
    slug: "alnoor-supermarket",
    logo_url: "/images/shop1.jpg",
    rating: 4.8,
    is_open: true,
  },
  {
    id: "2",
    name: "مخبز الفرن الذهبي",
    slug: "golden-bakery",
    logo_url: "/images/shop2.jpg",
    rating: 4.9,
    is_open: true,
  },
  {
    id: "3",
    name: "خضروات الحاج محمود",
    slug: "mahmoud-vegetables",
    logo_url: "/images/shop3.jpg",
    rating: 4.7,
    is_open: false,
  },
];

export default function HomePage() {
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  });

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productsService.getAll({ featured: true, limit: 8 }),
  });

  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["shops", "featured"],
    queryFn: () => shopsService.getAll({ limit: 6 }),
  });

  // Use demo data if real data not available
  const displayCategories = categories?.length ? categories : demoCategories;
  const displayProducts = featuredProducts?.length
    ? featuredProducts
    : demoProducts;
  const displayShops = shops?.length ? shops : demoShops;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-5" />
        <div className="container-app relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <TrendingUp className="w-3 h-3 ml-1" />
              منصة التسوق المحلية الأولى
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance">
              <span className="text-primary">تسوق</span> من متاجرك المحلية{" "}
              <span className="text-secondary">بسهولة</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              اكتشف أفضل المنتجات من المتاجر المحلية في منطقتك واحصل عليها بأسرع
              وقت
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/products">
                <Button size="xl" className="w-full sm:w-auto gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  تصفح المنتجات
                </Button>
              </Link>
              <Link to="/shops">
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                >
                  <Store className="w-5 h-5" />
                  استكشف المتاجر
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="container-app mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                className="text-center p-6 bg-background/80 backdrop-blur-sm border-primary/10"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-background">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {AR.categories.title}
              </h2>
              <p className="text-muted-foreground mt-1">تصفح حسب التصنيف</p>
            </div>
            <Link to="/categories">
              <Button variant="ghost" className="gap-2">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categoriesLoading
              ? Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))
              : displayCategories.slice(0, 8).map((category) => (
                  <Link
                    key={category.id}
                    to={`/categories/${category.slug}`}
                    className="group"
                  >
                    <Card
                      interactive
                      className="aspect-square relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <span className="text-6xl">
                            {category.icon || "📦"}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                        <h3 className="font-semibold text-lg text-white">
                          {category.name}
                        </h3>
                      </div>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-muted/30">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {AR.products.featured}
              </h2>
              <p className="text-muted-foreground mt-1">منتجات مختارة بعناية</p>
            </div>
            <Link to="/products">
              <Button variant="ghost" className="gap-2">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {productsLoading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="aspect-square" />
                      <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-6 w-1/3" />
                      </CardContent>
                    </Card>
                  ))
              : displayProducts.map((product) => (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <Card interactive className="overflow-hidden h-full">
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {product.original_price &&
                          product.original_price > product.price && (
                            <Badge
                              className="absolute top-2 right-2"
                              variant="destructive"
                            >
                              خصم{" "}
                              {Math.round(
                                (1 - product.price / product.original_price) *
                                  100
                              )}
                              %
                            </Badge>
                          )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          {product.shop?.name}
                        </p>
                        <h3 className="font-medium line-clamp-2 mb-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-lg">
                            {formatPrice(product.price)}
                          </span>
                          {product.original_price &&
                            product.original_price > product.price && (
                              <span className="text-muted-foreground line-through text-sm">
                                {formatPrice(product.original_price)}
                              </span>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Shops Section */}
      <section className="py-16 bg-background">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {AR.shops.featured}
              </h2>
              <p className="text-muted-foreground mt-1">
                أفضل المتاجر في منطقتك
              </p>
            </div>
            <Link to="/shops">
              <Button variant="ghost" className="gap-2">
                {AR.common.viewAll}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shopsLoading
              ? Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    </Card>
                  ))
              : displayShops.map((shop) => (
                  <Link key={shop.id} to={`/shops/${shop.slug}`}>
                    <Card interactive className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {shop.logo_url ? (
                            <img
                              src={shop.logo_url}
                              alt={shop.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                              <Store className="w-8 h-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {shop.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-warning">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-sm font-medium">
                                {shop.rating}
                              </span>
                            </div>
                            <Badge
                              variant={shop.is_open ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {shop.is_open ? AR.shops.open : AR.shops.closed}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container-app text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            هل أنت صاحب متجر؟
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            انضم إلى منصتنا وابدأ في بيع منتجاتك لآلاف العملاء في منطقتك
          </p>
          <Link to="/register?role=shop_owner">
            <Button size="xl" variant="secondary" className="gap-2">
              <Store className="w-5 h-5" />
              سجل متجرك الآن
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
