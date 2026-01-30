import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { useCart, useAuth } from "@/store";

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const { cart, cartTotal, updateCartItem, removeFromCart } = useCart();

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      await updateCartItem(itemId, newQuantity);
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      toast.success(AR.cart.itemRemoved);
    } catch {
      toast.error("حدث خطأ");
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

  const deliveryFee = 15;

  return (
    <div className="py-8">
      <div className="container-app">
        <h1 className="text-3xl font-bold mb-8">{AR.cart.title}</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Shop Info */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    {cart.shop?.logo_url ? (
                      <img
                        src={cart.shop.logo_url}
                        alt={cart.shop.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{cart.shop?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {cart.items.length} منتج
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Items */}
            {cart.items.map((item) => (
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
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>{AR.cart.total}</span>
                  <span className="text-primary">
                    {formatPrice(cartTotal + deliveryFee)}
                  </span>
                </div>

                <Link to="/checkout" className="block">
                  <Button className="w-full" size="lg">
                    {AR.cart.checkout}
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
