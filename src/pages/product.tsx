import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Store,
  Minus,
  Plus,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { notify } from "@/lib/notify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { productsService } from "@/services";
import { useCart, useAuth } from "@/store";
import { SimilarProducts } from "@/components/SimilarProducts";

// ... types and imports
import { getShopOpenState } from "@/lib/shop-helpers";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsService.getById(id!),
    enabled: !!id,
  });

  // Fetch Shop Open State if product exists
  const { data: shopStatus, isLoading: isShopLoading } = useQuery({
    queryKey: ["shop-status", product?.shop_id],
    queryFn: async () => {
      if (!product?.shop_id) return null;
      // We need working hours.
      const { data, error } = await supabase
        .from("shop_working_hours")
        .select("*")
        .eq("shop_id", product.shop_id);
      
      if (error) throw error;
      
      return getShopOpenState(
        product.shop as any, 
        data || []
      );
    },
    enabled: !!product?.shop_id,
  });

  const isLoading = isProductLoading || isShopLoading;
  const isShopOpen = shopStatus?.isOpen ?? true;
  
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      notify.error("يجب تسجيل الدخول أولاً");
      return;
    }
    
    if (!isShopOpen) {
       notify.error("المتجر مغلق حالياً");
       return;
    }

    if (!product) return;
// ... existing logic

    try {
      const promise = addToCart(product.shop_id, product.id, quantity, product);
      notify.success(AR.cart.itemAdded);
      
      promise.catch(() => {
        // Rollback handled internally by context dispatch
      });
    } catch (error: any) {
      notify.error(error.message || "حدث خطأ أثناء الإضافة");
    }
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container-app">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">المنتج غير موجود</h2>
            <Link to="/products">
              <Button>{AR.products.all}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const discount = product.compare_at_price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">
            {AR.nav.home}
          </Link>
          <ArrowRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-foreground">
            {AR.products.title}
          </Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  <ShoppingBag className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
              {discount > 0 && (
                <Badge
                  className="absolute top-4 right-4 text-lg px-4 py-2"
                  variant="destructive"
                >
                  خصم {discount}%
                </Badge>
              )}
            </div>

            {/* Additional images */}
            {product.images && product.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-6 pt-4 md:pt-0">
            {/* Top Row: Shop Link */}
            <Link
              to={`/shops/${product.shop?.slug}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 w-fit"
            >
              <Store className="w-4 h-4" />
              {product.shop?.name}
              <span className={`w-1.5 h-1.5 rounded-full ${isShopOpen ? 'bg-green-500' : 'bg-red-500'}`} />
            </Link>

            {/* Title & Category */}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{product.name}</h1>
              {product.category && (
                <Link to={`/categories/${product.category.slug}`} className="text-sm text-primary hover:underline w-fit">
                  {product.category.name}
                </Link>
              )}
            </div>

            {/* Price Row */}
            <div className="flex items-end justify-between border-y border-border/60 py-5">
              <div className="flex items-baseline gap-3">
                 <span className="text-3xl font-bold text-foreground tracking-tight">
                   {formatPrice(product.price)}
                 </span>
                 {product.compare_at_price &&
                   product.compare_at_price > product.price && (
                     <span className="text-lg text-muted-foreground line-through">
                       {formatPrice(product.compare_at_price)}
                     </span>
                   )}
              </div>

              <div className="pb-1">
                {product.stock_quantity > 0 ? (
                  <span className="text-sm text-muted-foreground font-medium">
                    {product.stock_quantity} متوفر
                  </span>
                ) : (
                  <span className="text-sm font-bold text-destructive">{AR.products.outOfStock}</span>
                )}
              </div>
            </div>

            {/* Description & Unit */}
            <div className="flex flex-col gap-4 py-2">
               {product.description && (
                 <div className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                   {product.description}
                 </div>
               )}

               {product.unit && (
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <span className="font-semibold text-foreground">{AR.products.unit}:</span>
                   <span>{product.unit}</span>
                 </div>
               )}
            </div>

            {/* Add to Cart Footer */}
            {product.stock_quantity > 0 ? (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/60 mt-2">
                {/* Quantity Control */}
                <div className="flex items-center justify-between w-full sm:w-32 border rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 hover:bg-muted"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-10 text-center font-bold text-base">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 hover:bg-muted"
                    onClick={() =>
                      setQuantity(
                        Math.min(product.stock_quantity, quantity + 1)
                      )
                    }
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Add Button */}
                <Button
                  className="flex-1 h-12 text-base font-bold shadow-sm"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  إضافة • {formatPrice(product.price * quantity)}
                </Button>
              </div>
            ) : (
                <div className="pt-6 border-t border-border/60 mt-2 text-center text-muted-foreground">
                  <p className="font-semibold text-destructive mb-1 text-lg">هذا المنتج غير متوفر حالياً</p>
                  <p className="text-sm">نعتذر، يتم إعادة تعبئة المخزون قريباً.</p>
                </div>
            )}
          </div>
        </div>

        {/* Similar Products Section */}
        <div className="mt-12">
          <SimilarProducts 
            shopId={product.shop_id} 
            currentProductId={product.id}
            categoryId={product.category_id}
          />
        </div>
      </div>
    </div>
  );
}
