import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";
import { Eye, EyeOff, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AR } from "@/lib/i18n";
import { useAuth } from "@/store";

const registerSchema = z
  .object({
    fullName: z.string().min(2, AR.validation.minLength.replace("{min}", "2")),
    email: z.string().email(AR.validation.email),
    phone: z.string().optional(),
    password: z.string().min(6, AR.validation.minLength.replace("{min}", "6")),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AR.validation.passwordMatch,
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<"customer" | "shop_owner">(
    searchParams.get("role") === "shop_owner" ? "shop_owner" : "customer"
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { error } = await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        role: accountType === "shop_owner" ? "SHOP_OWNER" : "CUSTOMER",
      });
      if (error) {
        // Map Supabase error messages to Arabic
        const errorMap: Record<string, string> = {
          "User already registered": "البريد الإلكتروني مسجل بالفعل",
          "Invalid email": "البريد الإلكتروني غير صالح",
          "Password should be at least 6 characters":
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        };
        const message =
          errorMap[error.message] || error.message || "فشل إنشاء الحساب";
        notify.error(message);
        return;
      }
      notify.success(AR.auth.registerSuccess);
      navigate(accountType === "shop_owner" ? "/dashboard" : "/");
    } catch {
      notify.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Store className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl">{AR.app.name}</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{AR.auth.register}</CardTitle>
            <CardDescription>أنشئ حسابك الجديد للبدء</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={accountType}
              onValueChange={(v) =>
                setAccountType(v as "customer" | "shop_owner")
              }
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer">عميل</TabsTrigger>
                <TabsTrigger value="shop_owner">صاحب متجر</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" required>
                  {AR.auth.fullName}
                </Label>
                <Input
                  id="fullName"
                  placeholder="أدخل اسمك الكامل"
                  error={!!errors.fullName}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" required>
                  {AR.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  error={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{AR.auth.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" required>
                  {AR.auth.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    error={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" required>
                  {AR.auth.confirmPassword}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isLoading}
              >
                {AR.auth.register}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {AR.auth.hasAccount}{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  {AR.auth.loginNow}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
