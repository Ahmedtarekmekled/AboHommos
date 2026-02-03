import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  ShoppingBag, 
  Star, 
  TrendingUp, 
  ArrowRight,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShopProductCard } from "@/components/ShopProductCard";
import { shopsService, productsService } from "@/services";
import { useCart } from "@/store/app-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const { cart, addToCart, clearCart } = useCart();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<{ id: string, name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Ranked Shops
  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["ranked-shops"],
    queryFn: () => shopsService.getRankedShops({ limit: 10 }), // Fetch Top 10 for tab bar
  });

  // Set default shop selection
  useEffect(() => {
    if (shops && shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

  const selectedShop = shops?.find(s => s.id === selectedShopId);

  // 2. Fetch Products for Selected Shop (Limit 6 for Quick Picks)
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products", selectedShopId],
    queryFn: () => productsService.getAll({ 
      shopId: selectedShopId!,
      limit: 6 
    }),
    enabled: !!selectedShopId,
  });

  // Handle Add to Cart with Multi-Store Check
  const handleAddToCartRequest = async (product: { id: string, name: string }) => {
    if (!selectedShopId) return;

    // Check conflict
    const cartHasItems = cart && cart.items && cart.items.length > 0;
    const currentCartShopId = cartHasItems ? cart.items[0].product.shop_id : null;

    if (cartHasItems && currentCartShopId && currentCartShopId !== selectedShopId) {
      setPendingProduct(product); // Trigger Alert Dialog
      return;
    }

    // No conflict, add directly
    await performAddToCart(selectedShopId, product.id);
  };

  const performAddToCart = async (shopId: string, productId: string) => {
    setIsProcessing(true);
    try {
      await addToCart(shopId, productId, 1);
      toast.success("تمت الإضافة للسلة");
    } catch (error) {
      toast.error("فشل إضافة المنتج", { description: "يرجى المحاولة مرة أخرى" });
    } finally {
      setIsProcessing(false);
      setPendingProduct(null);
    }
  };

  const handleConfirmAdd = async () => {
    if (!pendingProduct || !selectedShopId) return;
    setIsProcessing(true);
    try {
      // Don't clear cart, just add new item. User accepted the fee warning.
      await addToCart(selectedShopId, pendingProduct.id, 1);
      toast.success("تمت إضافة المنتج للسلة");
    } catch (error) {
       toast.error("حدث خطأ في الإضافة");
    } finally {
      setIsProcessing(false);
      setPendingProduct(null);
    }
  };

  if (shopsLoading) {
    return (
      <div className="container-app py-8 space-y-6">
        <Skeleton className="h-10 w-full md:w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!shops || shops.length === 0) {
    return (
       <div className="container-app py-16 text-center">
         <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
         <h3>لا توجد متاجر متاحة حالياً</h3>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* 1. Sticky Shop Tabs */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="container-app py-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none mask-fade-sides no-scrollbar">
            {shops.map((shop) => {
              const isActive = shop.id === selectedShopId;
              const isPremium = shop.is_premium;
              // Detect "Best Seller" if not premium but high sales? 
              // (Actually getRankedShops returns based on logic, we trust the order)
              
              return (
                <button
                  key={shop.id}
                  onClick={() => setSelectedShopId(shop.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap min-w-fit",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary shadow-md" 
                      : "bg-background hover:bg-muted border-transparent hover:border-border"
                  )}
                >
                  {/* Premium Badge */}
                  {isPremium && (
                    <span className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full text-[10px]",
                      isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                    )}>
                      <Star className="w-3 h-3 fill-current" />
                    </span>
                  )}
                  
                  {/* Shop Name */}
                  <span className="font-medium text-sm">{shop.name}</span>

                  {/* Active Indicator */}
                  {isActive && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container-app py-6 space-y-8">
        {selectedShop && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  أسرع الاختيارات من {selectedShop.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  أكثر المنتجات طلباً، تصلك بأسرع وقت
                </p>
              </div>
              <Link to={`/shops/${selectedShop.slug}`}>
                 <Button variant="outline" size="sm" className="gap-2">
                    تصفح المتجر <ArrowRight className="w-4 h-4" />
                 </Button>
              </Link>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />
                  ))}
               </div>
            ) : products && products.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {products.map(product => (
                   <ShopProductCard 
                     key={product.id} 
                     product={product} 
                     shopId={selectedShop.id} 
                     canOrder={selectedShop.is_open}
                     onAddToCart={() => handleAddToCartRequest({ id: product.id, name: product.name })}
                   />
                 ))}
               </div>
            ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl">
                    <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">لا توجد منتجات معروضة حالياً</p>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Logic Conflict Dialog */}
      <AlertDialog open={!!pendingProduct} onOpenChange={(open) => !open && setPendingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
               <AlertTriangle className="w-5 h-5" />
               تنبيه: رسوم التوصيل
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right pt-2">
              الطلب من أكثر من متجر قد يزيد رسوم التوصيل.
              <br /><br />
              هل تريد الاستمرار وإضافة <strong>{pendingProduct?.name}</strong> إلى السلة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
            <Button 
                onClick={handleConfirmAdd} 
                disabled={isProcessing}
                className="gap-2"
            >
               {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
               متابعة
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
