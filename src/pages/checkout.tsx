import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CreditCard,
  Truck,
  ShoppingBag,
  CheckCircle,
  Phone,
  FileText,
  ArrowRight,
  Wallet,
  Banknote,
  Package,
  Clock,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LocationSelector } from "@/components/LocationSelector";
import { AR } from "@/lib/i18n";
import { formatPrice, cn } from "@/lib/utils";
import { useCart, useAuth } from "@/store";
import { orderService } from "@/services";
import { getCurrentUser } from "@/lib/supabase";

const checkoutSchema = z.object({
  address: z.string().min(10, "العنوان يجب أن يكون 10 حروف على الأقل"),
  phone: z.string().min(10, "رقم الهاتف غير صالح"),
  district_id: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["cash", "wallet"]),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

type CheckoutStep = "delivery" | "payment" | "review";

// Location data from LocationSelector
interface LocationData {
  address: string;
  districtId: string | null;
  deliveryFee: number;
  phone?: string;
}

const STEPS: { id: CheckoutStep; label: string; icon: React.ElementType }[] = [
  { id: "delivery", label: "معلومات التوصيل", icon: Truck },
  { id: "payment", label: "طريقة الدفع", icon: CreditCard },
  { id: "review", label: "مراجعة الطلب", icon: FileText },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { cart, cartTotal } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("delivery");
  const [locationData, setLocationData] = useState<LocationData>({
    address: "",
    districtId: null,
    deliveryFee: 15, // Default delivery fee
  });
  const [orderComplete, setOrderComplete] = useState<{
    orderNumber: string;
    orderId: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: user?.phone || "",
      address: "",
      paymentMethod: "cash",
    },
  });

  const watchedValues = watch();
  const deliveryFee = locationData.deliveryFee || 15;

  // Handle location change from LocationSelector
  const handleLocationChange = (data: LocationData) => {
    setLocationData(data);
    setValue("address", data.address);
    if (data.districtId) {
      setValue("district_id", data.districtId);
    }
    if (data.phone) {
      setValue("phone", data.phone);
    }
  };

  const goToStep = async (step: CheckoutStep) => {
    if (step === "payment") {
      const isValid = await trigger(["address", "phone"]);
      if (!isValid) return;
      if (!locationData.address || locationData.address.length < 10) {
        toast.error("يرجى إدخال عنوان صالح (10 حروف على الأقل)");
        return;
      }
    }
    if (step === "review") {
      const isValid = await trigger();
      if (!isValid) return;
    }
    setCurrentStep(step);
  };

  const onSubmit = async (data: CheckoutForm) => {
    if (!cart || !cart.items || cart.items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    setIsLoading(true);
    try {
      const { user: authUser } = await getCurrentUser();
      if (!authUser) {
        toast.error("يجب تسجيل الدخول");
        return;
      }

      const order = await orderService.create({
        userId: authUser.id,
        shopId: cart.shop_id!,
        customerName: user?.full_name || authUser.email || "عميل",
        items: cart.items.map((item) => ({
          productId: item.product_id,
          productName: item.product?.name || "",
          productPrice: item.product?.price || 0,
          quantity: item.quantity,
        })),
        deliveryAddress: locationData.address || data.address,
        deliveryPhone: data.phone,
        notes: data.notes,
        deliveryFee,
      });

      setOrderComplete({ orderNumber: order.order_number, orderId: order.id });
      toast.success(AR.checkout.success);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setIsLoading(false);
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
            <p className="text-muted-foreground mb-4">
              قم بتسجيل الدخول لإتمام عملية الشراء
            </p>
            <Link to="/login?redirect=/checkout">
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
            <p className="text-muted-foreground mb-4">
              أضف منتجات إلى سلة التسوق أولاً
            </p>
            <Link to="/products">
              <Button>{AR.cart.startShopping}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Order Complete Success Screen
  if (orderComplete) {
    return (
      <div className="py-16">
        <div className="container-app max-w-lg mx-auto text-center">
          <div className="relative">
            {/* Success Animation */}
            <div className="w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-3 text-foreground">
              {AR.checkout.success}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              شكراً لك! تم استلام طلبك بنجاح
            </p>

            {/* Order Info Card */}
            <Card className="mb-8 text-right">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="placed" className="text-sm">
                    قيد المراجعة
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    رقم الطلب
                  </span>
                </div>
                <p className="font-mono text-2xl font-bold text-primary">
                  {orderComplete.orderNumber}
                </p>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <span>{cart.shop?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span>{cart.items.length} منتجات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span>{formatPrice(cartTotal + deliveryFee)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>30-45 دقيقة</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-muted-foreground mb-8">
              سيتم التواصل معك قريباً لتأكيد الطلب وموعد التسليم
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={`/orders/${orderComplete.orderId}`}>
                <Button size="lg" className="w-full sm:w-auto">
                  <Package className="w-4 h-4 ml-2" />
                  تتبع الطلب
                </Button>
              </Link>
              <Link to="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {AR.nav.home}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{AR.checkout.title}</h1>
          <p className="text-muted-foreground mt-1">أكمل طلبك في خطوات بسيطة</p>
        </div>

        {/* Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < stepIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => isCompleted && goToStep(step.id)}
                    disabled={!isCompleted}
                    className={cn(
                      "flex flex-col items-center gap-2 transition-colors",
                      isCompleted && "cursor-pointer"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        isActive &&
                          "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                        isCompleted && "bg-success text-success-foreground",
                        !isActive &&
                          !isCompleted &&
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium hidden sm:block",
                        isActive && "text-primary",
                        isCompleted && "text-success",
                        !isActive && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </button>

                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-16 sm:w-24 h-1 mx-2 rounded-full transition-colors",
                        index < stepIndex ? "bg-success" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Delivery Info */}
              {currentStep === "delivery" && (
                <Card className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      {AR.checkout.deliveryInfo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Location Selector */}
                    <LocationSelector
                      value={{
                        address: watchedValues.address,
                        districtId: watchedValues.district_id,
                        phone: watchedValues.phone,
                      }}
                      onChange={handleLocationChange}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">
                        {errors.address.message}
                      </p>
                    )}

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" required>
                        <Phone className="w-4 h-4 inline ml-1" />
                        {AR.checkout.phone}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        className={cn(errors.phone && "border-destructive")}
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">
                        <FileText className="w-4 h-4 inline ml-1" />
                        {AR.checkout.notes}
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder={AR.checkout.notesPlaceholder}
                        {...register("notes")}
                      />
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={() => goToStep("payment")}
                    >
                      متابعة للدفع
                      <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Payment Method */}
              {currentStep === "payment" && (
                <Card className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      {AR.checkout.paymentMethod}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cash on Delivery */}
                    <label
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        watchedValues.paymentMethod === "cash"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <input
                        type="radio"
                        value="cash"
                        {...register("paymentMethod")}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          watchedValues.paymentMethod === "cash"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {AR.checkout.cashOnDelivery}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ادفع نقداً عند استلام طلبك
                        </p>
                      </div>
                      {watchedValues.paymentMethod === "cash" && (
                        <CheckCircle className="w-6 h-6 text-primary" />
                      )}
                    </label>

                    {/* Wallet - Coming Soon */}
                    <label
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-not-allowed opacity-60 transition-all",
                        "border-border bg-muted/30"
                      )}
                    >
                      <input
                        type="radio"
                        value="wallet"
                        disabled
                        className="sr-only"
                      />
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">المحفظة الإلكترونية</p>
                          <Badge variant="secondary">قريباً</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          فودافون كاش، اتصالات كاش، أورانج كاش
                        </p>
                      </div>
                    </label>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("delivery")}
                      >
                        رجوع
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        size="lg"
                        onClick={() => goToStep("review")}
                      >
                        مراجعة الطلب
                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Review Order */}
              {currentStep === "review" && (
                <Card className="animate-in fade-in slide-in-from-left-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      مراجعة الطلب
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Delivery Summary */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          معلومات التوصيل
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentStep("delivery")}
                        >
                          تعديل
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">
                            العنوان:
                          </span>{" "}
                          {locationData.address || watchedValues.address}
                        </p>
                        <p dir="ltr" className="text-left">
                          <span className="text-muted-foreground float-right mr-1">
                            الهاتف:
                          </span>{" "}
                          {watchedValues.phone}
                        </p>
                        {watchedValues.notes && (
                          <p>
                            <span className="text-muted-foreground">
                              ملاحظات:
                            </span>{" "}
                            {watchedValues.notes}
                          </p>
                        )}
                        <p>
                          <span className="text-muted-foreground">
                            رسوم التوصيل:
                          </span>{" "}
                          <span className="font-medium text-primary">
                            {formatPrice(deliveryFee)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          طريقة الدفع
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentStep("payment")}
                        >
                          تعديل
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {AR.checkout.cashOnDelivery}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            الدفع عند الاستلام
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">
                        المنتجات ({cart.items.length})
                      </h4>
                      <div className="space-y-3">
                        {cart.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {item.product?.image_url ? (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {item.product?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} ×{" "}
                                {formatPrice(item.product?.price || 0)}
                              </p>
                            </div>
                            <span className="font-bold text-primary">
                              {formatPrice(
                                (item.product?.price || 0) * item.quantity
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep("payment")}
                      >
                        رجوع
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        size="lg"
                        loading={isLoading}
                      >
                        <CheckCircle className="w-5 h-5 ml-2" />
                        تأكيد الطلب
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-24">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted">
                      {cart.shop?.logo_url ? (
                        <img
                          src={cart.shop.logo_url}
                          alt={cart.shop.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {cart.shop?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {cart.items.length} منتجات
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mini Cart Items */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate flex-1 ml-2">
                          {item.quantity}× {item.product?.name}
                        </span>
                        <span className="font-medium">
                          {formatPrice(
                            (item.product?.price || 0) * item.quantity
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {AR.cart.subtotal}
                      </span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {AR.cart.deliveryFee}
                      </span>
                      <span>{formatPrice(deliveryFee)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>{AR.cart.total}</span>
                    <span className="text-primary">
                      {formatPrice(cartTotal + deliveryFee)}
                    </span>
                  </div>

                  {/* Estimated Delivery */}
                  <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      وقت التوصيل المتوقع:
                    </span>
                    <span className="font-medium">30-45 دقيقة</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
