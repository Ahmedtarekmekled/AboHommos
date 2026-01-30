import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, Star, Clock, Phone, MapPin, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { shopsService, productsService } from "@/services";
import { StarRating } from "@/components/ProductReviews";

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop", slug],
    queryFn: () => shopsService.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "shop", shop?.id],
    queryFn: () => productsService.getAll({ shopId: shop?.id }),
    enabled: !!shop?.id,
  });

  if (shopLoading) {
    return (
      <div className="py-8">
        <div className="container-app">
          <div className="flex items-start gap-6 mb-8">
            <Skeleton className="w-24 h-24 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Store className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">المتجر غير موجود</h2>
            <Link to="/shops">
              <Badge variant="outline">{AR.shops.all}</Badge>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Shop Header */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 py-8">
        <div className="container-app">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-card shadow-card flex-shrink-0">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <Store className="w-12 h-12 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {shop.name}
                  </h1>
                  {shop.description && (
                    <p className="text-muted-foreground mt-1">
                      {shop.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={shop.is_open ? "success" : "secondary"}
                  className="text-sm px-3 py-1"
                >
                  {shop.is_open ? AR.shops.open : AR.shops.closed}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <StarRating rating={shop.rating || 0} size="sm" showValue />
                  <span className="text-sm text-muted-foreground">
                    ({shop.total_ratings || 0} تقييم)
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {shop.total_orders} {AR.shops.orders}
                </span>
                {shop.phone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{shop.phone}</span>
                  </div>
                )}
                {shop.address && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{shop.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Content */}
      <div className="container-app py-8">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products">المنتجات</TabsTrigger>
            <TabsTrigger value="info">معلومات المتجر</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="aspect-square" />
                      <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
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
                              خصم
                            </Badge>
                          )}
                      </div>
                      <CardContent className="p-4">
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
            ) : (
              <div className="empty-state py-16">
                <div className="empty-state-icon">
                  <ShoppingBag className="w-full h-full" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  {AR.products.noResults}
                </h2>
                <p className="text-muted-foreground">
                  لا توجد منتجات في هذا المتجر حالياً
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="info">
            <Card className="p-6">
              <div className="space-y-4">
                {shop.description && (
                  <div>
                    <h3 className="font-semibold mb-2">عن المتجر</h3>
                    <p className="text-muted-foreground">{shop.description}</p>
                  </div>
                )}
                {shop.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">العنوان</h4>
                      <p className="text-muted-foreground">{shop.address}</p>
                    </div>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">رقم الهاتف</h4>
                      <p className="text-muted-foreground">{shop.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">حالة المتجر</h4>
                    <p className="text-muted-foreground">
                      {shop.is_open ? "مفتوح الآن" : "مغلق حالياً"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
