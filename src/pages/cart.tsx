import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Store } from "lucide-react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { useCart, useAuth } from "@/store";
import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const { cart, cartTotal, updateCartItem, removeFromCart } = useCart();

  // Group items by shop
  const itemsByShop = useMemo(() => {
    if (!cart?.items) return {};
    
    return cart.items.reduce((acc, item) => {
      const shopId = item.product?.shop_id || 'unknown';
      if (!acc[shopId]) {
        acc[shopId] = {
          shop: item.product?.shop || null,
          items: [],
          subtotal: 0,
        };
      }
      acc[shopId].items.push(item);
      acc[shopId].subtotal += (item.product?.price || 0) * item.quantity;
      return acc;
    }, {} as Record<string, any>);
  }, [cart?.items]);

  const shopsCount = Object.keys(itemsByShop).length;

  const inactiveShops = useMemo(() => {
    return Object.values(itemsByShop).filter(
      (data: any) => data.shop?.is_active === false || (data.shop?.status && data.shop?.status !== 'APPROVED')
    );
  }, [itemsByShop]);
  const hasInactiveShops = inactiveShops.length > 0;

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      await updateCartItem(itemId, newQuantity);
    } catch {
      notify.error("حدث خطأ");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      notify.success(AR.cart.itemRemoved);
    } catch {
      notify.error("حدث خطأ");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-6">
              قم بتسجيل الدخول لعرض سلة التسوق الخاصة بك
            </p>
            <Link to="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{AR.cart.empty}</h2>
            <p className="text-muted-foreground mb-6">
              {AR.cart.emptyDescription}
            </p>
            <Link to="/products">
              <Button>{AR.cart.startShopping}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // deliveryFee removed


  return (
    <div className="py-8">
      <div className="container-app">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{AR.cart.title}</h1>
          
          {/* Multi-shop indicator */}
          {shopsCount > 1 && (
            <Badge variant="secondary" className="gap-2">
              <Store className="w-4 h-4" />
              طلب من {shopsCount} متاجر
            </Badge>
          )}
        </div>

        {hasInactiveShops && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">تنبيه المتاجر المتوقفة</p>
              <p className="mt-1 opacity-90">بعض المنتجات في سلتك تنتمي لمتاجر מתوقفة حالياً. يرجى إزالتها لتتمكن من إتمام الطلب.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items - Grouped by Shop */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(itemsByShop).map(([shopId, shopData]: [string, any]) => (
              <div key={shopId} className="space-y-4">
                {/* Shop Header */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                          {shopData.shop?.logo_url ? (
                            <img
                              src={shopData.shop.logo_url}
                              alt={shopData.shop.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                              <Store className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {shopData.shop?.name || 'متجر'}
                            {(shopData.shop?.is_active === false || (shopData.shop?.status && shopData.shop?.status !== 'APPROVED')) && (
                              <Badge variant="destructive" className="text-[10px] pr-1 py-0 h-5">متوقف</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {shopData.items.length} منتج • {formatPrice(shopData.subtotal)}
                          </p>
                        </div>
                      </div>
                      {shopsCount > 1 && (
                        <Badge variant="outline" className="text-xs">
                          متجر {Object.keys(itemsByShop).indexOf(shopId) + 1}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Shop Items */}
                {shopData.items.map((item: any) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{item.product?.name}</h3>
                          <p className="text-primary font-bold mt-1">
                            {formatPrice(item.product?.price || 0)}
                          </p>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity - 1)
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity + 1)
                                }
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}

            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              {AR.cart.continueShopping}
            </Link>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{AR.checkout.orderSummary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {AR.cart.subtotal}
                  </span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {AR.cart.deliveryFee}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    يُحسب عند الدفع
                  </span>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg text-sm flex items-start gap-2">
                  <span className="text-muted-foreground text-xs">
                    💡 رسوم التوصيل تُحسب في الخطوة التالية بعد تحديد العنوان
                  </span>
                </div>
                
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>{AR.cart.total}</span>
                  <span className="text-primary">
                    {formatPrice(cartTotal)}
                    <span className="text-xs font-normal text-muted-foreground mr-1">+ التوصيل</span>
                  </span>
                </div>

                <Link to={hasInactiveShops ? "#" : "/checkout"} className="block" onClick={(e) => hasInactiveShops && e.preventDefault()}>
                  <Button className="w-full" size="lg" disabled={hasInactiveShops}>
                    {hasInactiveShops ? "يرجى إزالة منتجات المتاجر المتوقفة" : AR.cart.checkout}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
