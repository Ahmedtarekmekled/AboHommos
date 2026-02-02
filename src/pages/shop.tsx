import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Store,
  Star,
  Clock,
  Phone,
  MapPin,
  ShoppingBag,
  MessageCircle,
  Navigation,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { shopsService, productsService } from "@/services";

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

  // Check if shop is approved
  const isApproved = shop.approval_status === "APPROVED";
  const canOrder = isApproved && shop.is_open;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Cover Hero Section */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
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
        
        {/* Logo Overlay - Positioned at bottom right with white border */}
        <div className="absolute bottom-0 right-0 transform translate-y-1/2 mr-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white p-3 shadow-lg">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="w-full h-full object-contain"
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
        <div className="container-app pt-16 pb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* Category Badge */}
            <div>
              {(shop as any).category && (
                <Badge variant="outline" className="mb-2">
                  {(shop as any).category?.icon && <span className="ml-1">{(shop as any).category.icon}</span>}
                  {(shop as any).category?.name}
                </Badge>
              )}
            </div>
            
            {/* Premium Badge */}
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
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {shop.rating && shop.rating > 0 ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(shop.rating || 0)
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="text-sm font-medium mr-1">
                      ({shop.rating.toFixed(1)})
                    </span>
                  </>
                ) : (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-muted-foreground/30" />
                    ))}
                    <span className="text-sm text-muted-foreground mr-1">
                      (لا توجد تقييمات)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Orders Count */}
            <span className="text-sm text-muted-foreground">
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
          <div className="flex flex-wrap items-center gap-3">
            {/* Open/Closed Status */}
            <Badge
              variant={shop.is_open ? "default" : "secondary"}
              className={`text-sm px-3 py-1 ${
                shop.is_open
                  ? "bg-success text-success-foreground"
                  : ""
              }`}
            >
              {shop.is_open ? "مفتوح" : "مغلق"}
            </Badge>

            {/* Action Buttons Row */}
            <div className="flex gap-2">
              {/* Maps Button */}
              {(shop.latitude || shop.address) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenMaps}
                  className="gap-1"
                >
                  <Navigation className="w-4 h-4" />
                  الموقع
                </Button>
              )}

              {/* Call Button */}
              {shop.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCall}
                  className="gap-1"
                >
                  <Phone className="w-4 h-4" />
                  اتصال
                </Button>
              )}

              {/* WhatsApp Button */}
              {(shop.whatsapp || shop.phone) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsApp}
                  className="gap-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب
                </Button>
              )}
            </div>
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
          {isApproved && !shop.is_open && (
            <div className="mt-6 p-4 bg-muted border rounded-lg">
              <p className="text-sm text-muted-foreground">
                المتجر مغلق حالياً. يرجى المحاولة لاحقاً
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
                <div className="text-center py-4 text-muted-foreground">
                  لا يمكن الطلب من هذا المتجر حالياً
                </div>
              )}

              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array(8)
                    .fill(0)
                    .map((_,i) => (
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product: any) => (
                    <Link
                      key={product.id}
                      to={canOrder ? `/products/${product.id}` : "#"}
                      className={!canOrder ? "pointer-events-none opacity-60" : ""}
                    >
                      <Card interactive={canOrder} className="overflow-hidden h-full">
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
                          {product.compare_at_price &&
                            product.compare_at_price > product.price && (
                              <Badge className="absolute top-2 left-2 bg-destructive">
                                خصم{" "}
                                {Math.round(
                                  ((product.compare_at_price - product.price) /
                                    product.compare_at_price) *
                                    100
                                )}
                                %
                              </Badge>
                            )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium line-clamp-2 mb-2 text-sm">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">
                              {formatPrice(product.price)}
                            </span>
                            {product.compare_at_price &&
                              product.compare_at_price > product.price && (
                                <span className="text-muted-foreground line-through text-xs">
                                  {formatPrice(product.compare_at_price)}
                                </span>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    لا توجد منتجات
                  </h3>
                  <p className="text-muted-foreground">
                    لا توجد منتجات في هذا المتجر حالياً
                  </p>
                </div>
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
                        <p
                          className={`text-sm font-medium ${
                            shop.is_open ? "text-success" : "text-muted-foreground"
                          }`}
                        >
                          {shop.is_open ? "مفتوح الآن" : "مغلق حالياً"}
                        </p>
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
