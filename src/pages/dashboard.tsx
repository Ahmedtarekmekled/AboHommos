import { Link, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  BarChart3,
  Store,
  Users,
  Folders,
  MapPin,
  DollarSign,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Ban,
  UserCog,
  Search,
  TrendingUp,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { AdminDelivery } from "@/components/delivery/AdminDelivery";
import { DeliveryDashboard } from "@/components/delivery/DeliveryDashboard";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/store";
import { toast } from "sonner";
import { uploadImage } from "@/lib/supabase";
import {
  productsService,
  categoriesService,
  shopsService,
  regionsService,
} from "@/services/catalog.service";
import { orderService } from "@/services/order.service";
import { profileService } from "@/services/auth.service";
import type {
  Product,
  Category,
  Shop,
  Region,
  Profile,
  ShopStatus,
} from "@/types/database";

// Sidebar navigation
const shopOwnerNav = [
  { href: "/dashboard", label: AR.dashboard.overview, icon: LayoutDashboard },
  { href: "/dashboard/products", label: AR.dashboard.products, icon: Package },
  { href: "/dashboard/orders", label: AR.dashboard.orders, icon: ShoppingCart },
  { href: "/dashboard/settings", label: AR.dashboard.settings, icon: Settings },
];

const adminNav = [
  { href: "/dashboard", label: AR.dashboard.overview, icon: LayoutDashboard },
  { href: "/dashboard/shops", label: AR.admin.shops, icon: Store },
  { href: "/dashboard/categories", label: AR.admin.categories, icon: Folders },
  { href: "/dashboard/regions", label: AR.admin.regions, icon: MapPin },
  { href: "/dashboard/regions", label: AR.admin.regions, icon: MapPin },
  { href: "/dashboard/users", label: AR.admin.users, icon: Users },
  { href: "/dashboard/delivery", label: "إدارة التوصيل", icon: Truck },
];

const deliveryNav = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/delivery", label: "طلباتي", icon: Truck },
  { href: "/dashboard/account", label: "حسابي", icon: UserCog }, // Assuming account page exists or reuse settings
];

// Access Denied Component for non-admin users
function AccessDenied() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-destructive">
              غير مصرح بالوصول
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              عذراً، هذه الصفحة متاحة فقط للمسؤولين. إذا كنت تعتقد أن هذا خطأ،
              يرجى التواصل مع الدعم الفني.
            </p>
            <Link to="/dashboard">
              <Button variant="outline">العودة للوحة التحكم</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Guard Component - Wraps admin-only routes
function AdminGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

// Admin Overview Dashboard - Platform-wide statistics
function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShops: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingShops: 0,
    activeShops: 0,
    totalProducts: 0,
    totalCategories: 0,
  });
  const [recentShops, setRecentShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load all data in parallel
      const [users, shops, categories, products] = await Promise.all([
        profileService.getAll(),
        shopsService.getAll({}),
        categoriesService.getAll(),
        productsService.getAll({}),
      ]);

      // Calculate stats
      const pendingShops = shops.filter((s) => s.status === "PENDING").length;
      const activeShops = shops.filter(
        (s) => s.status === "APPROVED" && s.is_open
      ).length;

      // Get recent shops (pending first, then by date)
      const sortedShops = [...shops].sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setStats({
        totalUsers: users.length,
        totalShops: shops.length,
        totalOrders: 0, // Would need to fetch all orders
        totalRevenue: 0, // Would need to calculate from all orders
        pendingShops,
        activeShops,
        totalProducts: products.length,
        totalCategories: categories.length,
      });

      setRecentShops(sortedShops.slice(0, 5));
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: "secondary", label: "قيد المراجعة" },
      APPROVED: { variant: "success", label: "مقبول" },
      REJECTED: { variant: "destructive", label: "مرفوض" },
      SUSPENDED: { variant: "destructive", label: "موقوف" },
    };
    return variants[status] || { variant: "secondary", label: status };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">لوحة تحكم المسؤول</h1>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-muted"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsConfig = [
    {
      label: "إجمالي المستخدمين",
      value: stats.totalUsers.toString(),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "إجمالي المتاجر",
      value: stats.totalShops.toString(),
      icon: Store,
      color: "text-green-500",
      bg: "bg-green-500/10",
      subtext: `${stats.activeShops} نشط`,
    },
    {
      label: "متاجر بانتظار المراجعة",
      value: stats.pendingShops.toString(),
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "إجمالي المنتجات",
      value: stats.totalProducts.toString(),
      icon: Package,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة تحكم المسؤول</h1>
        <p className="text-muted-foreground">
          نظرة عامة على المنصة وإحصائيات النظام
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.subtext && (
                  <Badge variant="outline" className="text-xs">
                    {stat.subtext}
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent/Pending Shops */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              المتاجر الأخيرة
            </CardTitle>
            <Link to="/dashboard/shops">
              <Button variant="ghost" size="sm">
                عرض الكل
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentShops.length === 0 ? (
              <div className="text-center py-8">
                <Store className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد متاجر حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentShops.map((shop) => {
                  const statusInfo = getStatusBadge(shop.status as string);
                  return (
                    <div
                      key={shop.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        shop.status === "PENDING"
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{shop.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(shop.created_at).toLocaleDateString(
                              "ar-EG"
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/dashboard/shops" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">مراجعة المتاجر</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingShops} متجر بانتظار المراجعة
                    </p>
                  </div>
                </div>
                <Badge
                  variant={stats.pendingShops > 0 ? "destructive" : "secondary"}
                >
                  {stats.pendingShops}
                </Badge>
              </div>
            </Link>
            <Link to="/dashboard/categories" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Folders className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">إدارة التصنيفات</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalCategories} تصنيف
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/dashboard/regions" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">إدارة المناطق</p>
                    <p className="text-xs text-muted-foreground">
                      مناطق وأحياء التوصيل
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/dashboard/users" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">إدارة المستخدمين</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalUsers} مستخدم مسجل
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Get user's shop
        const userShop = await shopsService.getByOwnerId(user.id);

        if (userShop) {
          // Load shop orders
          const shopOrders = await orderService.getByShop(userShop.id);

          // Calculate stats
          const totalOrders = shopOrders.length;
          const totalRevenue = shopOrders
            .filter((o: any) => o.status !== "CANCELLED")
            .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          const pendingOrders = shopOrders.filter(
            (o: any) => o.status === "PLACED" || o.status === "CONFIRMED"
          ).length;

          // Load products count
          const shopProducts = await productsService.getAll({
            shopId: userShop.id,
          });

          setStats({
            totalOrders,
            totalRevenue,
            totalProducts: shopProducts.length,
            pendingOrders,
          });

          // Get recent orders (latest 5)
          setRecentOrders(shopOrders.slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const statsConfig = [
    {
      label: AR.dashboard.totalOrders,
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
    },
    {
      label: AR.dashboard.totalRevenue,
      value: formatPrice(stats.totalRevenue),
      icon: DollarSign,
    },
    {
      label: AR.dashboard.totalProducts,
      value: stats.totalProducts.toString(),
      icon: Package,
    },
    {
      label: AR.dashboard.pendingOrders,
      value: stats.pendingOrders.toString(),
      icon: Clock,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.overview}</h1>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-muted"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{AR.dashboard.overview}</h1>
        <p className="text-muted-foreground">مرحباً بك في لوحة التحكم</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{AR.dashboard.newOrders}</CardTitle>
          <Link to="/dashboard/orders">
            <Button variant="ghost" size="sm">
              {AR.common.viewAll}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد طلبات حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-mono text-sm">{order.order_number}</p>
                    <p className="text-muted-foreground text-sm">
                      {order.customer_name || order.delivery_phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">
                      {formatPrice(order.total)}
                    </p>
                    <Badge
                      variant={
                        order.status === "DELIVERED"
                          ? "delivered"
                          : order.status === "PREPARING"
                          ? "preparing"
                          : "placed"
                      }
                    >
                      {
                        AR.orderStatus[
                          order.status as keyof typeof AR.orderStatus
                        ]
                      }
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {AR.dashboard.analytics}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">الرسوم البيانية قريباً</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    category_id: "",
    stock_quantity: "10",
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get user's shop
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);

      if (userShop) {
        // Load shop products
        const shopProducts = await productsService.getAll({
          shopId: userShop.id,
        });
        setProducts(shopProducts);
      }

      // Load categories
      const cats = await categoriesService.getAll();
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      compare_at_price: "",
      category_id: "",
      stock_quantity: "10",
      is_featured: false,
    });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      compare_at_price: product.compare_at_price?.toString() || "",
      category_id: product.category_id,
      stock_quantity: product.stock_quantity.toString(),
      is_featured: product.is_featured,
    });
    setImagePreview(product.image_url || null);
    setImageFile(null);
    setShowAddDialog(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!shop) {
      toast.error("يجب إنشاء متجر أولاً");
      return;
    }

    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = editingProduct?.image_url || null;

      // Upload image if a new one is selected
      if (imageFile) {
        setIsUploading(true);
        const fileName = `${shop.id}/${Date.now()}-${imageFile.name}`;
        const { url, error: uploadError } = await uploadImage(
          "products",
          fileName,
          imageFile
        );
        setIsUploading(false);

        if (uploadError) {
          toast.error("فشل رفع الصورة");
          console.error("Upload error:", uploadError);
        } else {
          imageUrl = url;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price
          ? parseFloat(formData.compare_at_price)
          : null,
        category_id: formData.category_id,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_featured: formData.is_featured,
        shop_id: shop.id,
        slug: `product-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        is_active: true,
        image_url: imageUrl,
      };

      if (editingProduct) {
        await productsService.update(editingProduct.id, productData);
        toast.success("تم تحديث المنتج بنجاح");
      } else {
        await productsService.create(productData as any);
        toast.success("تم إضافة المنتج بنجاح");
      }

      setShowAddDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Failed to save product:", error);
      toast.error(error.message || "فشل حفظ المنتج");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      await productsService.delete(productId);
      toast.success("تم حذف المنتج");
      loadData();
    } catch (error) {
      toast.error("فشل حذف المنتج");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{AR.dashboard.products}</h1>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.products}</h1>
          <p className="text-muted-foreground">إدارة منتجات متجرك</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد متجر</h3>
              <p className="text-muted-foreground mb-4">
                يجب إنشاء متجر أولاً لإضافة المنتجات
              </p>
              <Link to="/dashboard/settings">
                <Button>إنشاء متجر</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.products}</h1>
          <p className="text-muted-foreground">
            إدارة منتجات متجرك ({products.length} منتج)
          </p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="w-4 h-4" />
          {AR.dashboard.addProduct}
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة منتجك الأول
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة منتج
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="aspect-square rounded-lg bg-muted mb-3 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold truncate">{product.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-primary font-bold">
                    {formatPrice(product.price)}
                  </span>
                  {product.compare_at_price && (
                    <span className="text-muted-foreground text-sm line-through">
                      {formatPrice(product.compare_at_price)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge
                    variant={
                      product.stock_quantity > 0 ? "default" : "destructive"
                    }
                  >
                    {product.stock_quantity > 0
                      ? `متوفر (${product.stock_quantity})`
                      : "نفذ"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم المنتج *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="مثال: طماطم طازجة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="وصف المنتج..."
                rows={3}
              />
            </div>
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>صورة المنتج</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-6 w-6"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        اضغط لرفع صورة
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG حتى 5 ميجابايت
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">السعر (ج.م) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_price">السعر قبل الخصم</Label>
                <Input
                  id="compare_price"
                  type="number"
                  value={formData.compare_at_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      compare_at_price: e.target.value,
                    })
                  }
                  placeholder="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">التصنيف *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">الكمية المتوفرة</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, stock_quantity: e.target.value })
                }
                placeholder="10"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="flex-1"
              >
                {isUploading
                  ? "جاري رفع الصورة..."
                  : isSaving
                  ? "جاري الحفظ..."
                  : editingProduct
                  ? "تحديث"
                  : "إضافة"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);

      if (userShop) {
        const shopOrders = await orderService.getByShop(userShop.id);
        setOrders(shopOrders);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await orderService.updateStatus(orderId, newStatus as any, user.id);
      toast.success("تم تحديث حالة الطلب");
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error: any) {
      toast.error(error.message || "فشل تحديث حالة الطلب");
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDialog(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PLACED":
        return "placed";
      case "CONFIRMED":
        return "default";
      case "PREPARING":
        return "preparing";
      case "OUT_FOR_DELIVERY":
        return "secondary";
      case "DELIVERED":
        return "delivered";
      case "CANCELLED":
        return "destructive";
      default:
        return "default";
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const transitions: Record<string, string> = {
      PLACED: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "OUT_FOR_DELIVERY",
      OUT_FOR_DELIVERY: "DELIVERED",
    };
    return transitions[currentStatus] || null;
  };

  const getNextStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      CONFIRMED: "تأكيد الطلب",
      PREPARING: "بدء التجهيز",
      OUT_FOR_DELIVERY: "خرج للتوصيل",
      DELIVERED: "تم التسليم",
    };
    return labels[status] || status;
  };

  const filteredOrders =
    statusFilter === "ALL"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{AR.dashboard.orders}</h1>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.orders}</h1>
          <p className="text-muted-foreground">إدارة طلبات العملاء</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد متجر</h3>
              <p className="text-muted-foreground mb-4">
                يجب إنشاء متجر أولاً لاستقبال الطلبات
              </p>
              <Link to="/dashboard/settings">
                <Button>إنشاء متجر</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.orders}</h1>
          <p className="text-muted-foreground">
            إدارة طلبات العملاء ({orders.length} طلب)
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الطلبات</SelectItem>
            <SelectItem value="PLACED">جديدة</SelectItem>
            <SelectItem value="CONFIRMED">مؤكدة</SelectItem>
            <SelectItem value="PREPARING">قيد التجهيز</SelectItem>
            <SelectItem value="OUT_FOR_DELIVERY">في الطريق</SelectItem>
            <SelectItem value="DELIVERED">تم التسليم</SelectItem>
            <SelectItem value="CANCELLED">ملغية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground">
                {statusFilter === "ALL"
                  ? "لم تتلقى أي طلبات حتى الآن"
                  : "لا توجد طلبات بهذه الحالة"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold">
                          {order.order_number}
                        </span>
                        <Badge
                          variant={getStatusBadgeVariant(order.status) as any}
                        >
                          {
                            AR.orderStatus[
                              order.status as keyof typeof AR.orderStatus
                            ]
                          }
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.delivery_phone} • {order.delivery_address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mr-auto md:mr-0">
                    <div className="text-left">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length || 0} منتجات
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {getNextStatus(order.status) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(
                              order.id,
                              getNextStatus(order.status)!
                            )
                          }
                          disabled={isUpdating}
                        >
                          {getNextStatusLabel(getNextStatus(order.status)!)}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOrderDetails(order)}
                      >
                        التفاصيل
                      </Button>
                      {order.status === "PLACED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            handleUpdateStatus(order.id, "CANCELLED")
                          }
                          disabled={isUpdating}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>طلب {selectedOrder?.order_number}</span>
              {selectedOrder && (
                <Badge
                  variant={getStatusBadgeVariant(selectedOrder.status) as any}
                >
                  {
                    AR.orderStatus[
                      selectedOrder.status as keyof typeof AR.orderStatus
                    ]
                  }
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  معلومات التوصيل
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium">{selectedOrder.delivery_phone}</p>
                  <p className="text-sm">{selectedOrder.delivery_address}</p>
                  {selectedOrder.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">ملاحظات:</span>{" "}
                      {selectedOrder.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  المنتجات
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.product_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">{formatPrice(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رسوم التوصيل</span>
                  <span>{formatPrice(selectedOrder.delivery_fee || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  تاريخ الطلب
                </h4>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedOrder.created_at).toLocaleString("ar-EG", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </div>
              </div>

              {/* Actions */}
              {getNextStatus(selectedOrder.status) && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleUpdateStatus(
                        selectedOrder.id,
                        getNextStatus(selectedOrder.status)!
                      );
                    }}
                    disabled={isUpdating}
                  >
                    {getNextStatusLabel(getNextStatus(selectedOrder.status)!)}
                  </Button>
                  {selectedOrder.status === "PLACED" && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, "CANCELLED");
                      }}
                      disabled={isUpdating}
                    >
                      إلغاء الطلب
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardSettings() {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    address: "",
    region_id: "",
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userShop = await shopsService.getByOwnerId(user.id);
      setShop(userShop);
      if (userShop) {
        setFormData({
          name: userShop.name,
          description: userShop.description || "",
          phone: userShop.phone,
          whatsapp: userShop.whatsapp || "",
          address: userShop.address,
          region_id: userShop.region_id,
        });
      }

      const regs = await regionsService.getAll();
      setRegions(regs);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (
      !formData.name ||
      !formData.phone ||
      !formData.address ||
      !formData.region_id
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSaving(true);
    try {
      const shopData = {
        name: formData.name,
        description: formData.description || null,
        phone: formData.phone,
        whatsapp: formData.whatsapp || null,
        address: formData.address,
        region_id: formData.region_id,
        owner_id: user.id,
        slug: `shop-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        status: "APPROVED" as const,
        is_open: true,
      };

      if (shop) {
        await shopsService.update(shop.id, shopData);
        toast.success("تم تحديث بيانات المتجر");
      } else {
        await shopsService.create(shopData as any);
        toast.success("تم إنشاء المتجر بنجاح");
      }
      loadData();
    } catch (error: any) {
      console.error("Failed to save shop:", error);
      toast.error(error.message || "فشل حفظ المتجر");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.dashboard.settings}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {shop ? "إعدادات المتجر" : "إنشاء متجر جديد"}
        </h1>
        <p className="text-muted-foreground">
          {shop ? "قم بتحديث بيانات متجرك" : "أنشئ متجرك للبدء في بيع المنتجات"}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="shopName">اسم المتجر *</Label>
              <Input
                id="shopName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="مثال: سوبر ماركت النور"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopDesc">وصف المتجر</Label>
              <Textarea
                id="shopDesc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="وصف مختصر عن متجرك..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">المنطقة *</Label>
              <Select
                value={formData.region_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, region_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنطقة" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">واتساب</Label>
              <Input
                id="whatsapp"
                type="tel"
                dir="ltr"
                value={formData.whatsapp}
                onChange={(e) =>
                  setFormData({ ...formData, whatsapp: e.target.value })
                }
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">العنوان *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="العنوان التفصيلي للمتجر"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full mt-6"
            >
              {isSaving
                ? "جاري الحفظ..."
                : shop
                ? "حفظ التغييرات"
                : "إنشاء المتجر"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Categories Management
function AdminCategories() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadCategories();
    }
  }, [isAdmin]);

  // Secondary protection - return null if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", icon: "" });
    setEditingCategory(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("يرجى إدخال اسم التصنيف");
      return;
    }

    setIsSaving(true);
    try {
      const categoryData = {
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon || null,
        slug: `category-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        is_active: true,
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, categoryData);
        toast.success("تم تحديث التصنيف بنجاح");
      } else {
        await categoriesService.create(categoryData as any);
        toast.success("تم إضافة التصنيف بنجاح");
      }

      setShowDialog(false);
      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error("Failed to save category:", error);
      toast.error(error.message || "فشل حفظ التصنيف");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;

    try {
      await categoriesService.delete(categoryId);
      toast.success("تم حذف التصنيف");
      loadCategories();
    } catch (error) {
      toast.error("فشل حذف التصنيف - قد يكون مرتبط بمنتجات");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.categories}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.categories}</h1>
          <p className="text-muted-foreground">
            إدارة تصنيفات المنتجات ({categories.length} تصنيف)
          </p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="w-4 h-4" />
          إضافة تصنيف
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Folders className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد تصنيفات</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة تصنيف جديد
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة تصنيف
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    {category.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName">اسم التصنيف *</Label>
              <Input
                id="catName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="مثال: إلكترونيات"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catIcon">أيقونة (إيموجي)</Label>
              <Input
                id="catIcon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="📱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catDesc">الوصف</Label>
              <Textarea
                id="catDesc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="وصف التصنيف..."
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving
                  ? "جاري الحفظ..."
                  : editingCategory
                  ? "تحديث"
                  : "إضافة"}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Admin Regions Management
function AdminRegions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    delivery_fee: "15",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadRegions();
    }
  }, [isAdmin]);

  // Secondary protection - return access denied if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadRegions = async () => {
    setIsLoading(true);
    try {
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", delivery_fee: "15" });
    setEditingRegion(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (region: Region) => {
    setEditingRegion(region);
    setFormData({
      name: region.name,
      delivery_fee: (region as any).delivery_fee?.toString() || "15",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("يرجى إدخال اسم المنطقة");
      return;
    }

    setIsSaving(true);
    try {
      const regionData = {
        name: formData.name,
        // delivery_fee: parseFloat(formData.delivery_fee) || 15, // Not supported in regions table yet
        slug: `region-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        is_active: true,
      };

      if (editingRegion) {
        await regionsService.update(editingRegion.id, regionData);
        toast.success("تم تحديث المنطقة بنجاح");
      } else {
        await regionsService.create(regionData as any);
        toast.success("تم إضافة المنطقة بنجاح");
      }

      setShowDialog(false);
      resetForm();
      loadRegions();
    } catch (error: any) {
      console.error("Failed to save region:", error);
      toast.error(error.message || "فشل حفظ المنطقة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (regionId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المنطقة؟")) return;

    try {
      await regionsService.delete(regionId);
      toast.success("تم حذف المنطقة");
      loadRegions();
    } catch (error) {
      toast.error("فشل حذف المنطقة - قد تكون مرتبطة بمتاجر");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.regions}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.regions}</h1>
          <p className="text-muted-foreground">
            إدارة مناطق التوصيل ({regions.length} منطقة)
          </p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="w-4 h-4" />
          إضافة منطقة
        </Button>
      </div>

      {regions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مناطق</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة منطقة جديدة
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة منطقة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <Card key={region.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{region.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      رسوم التوصيل: {formatPrice((region as any).delivery_fee || 15)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(region)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(region.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? "تعديل المنطقة" : "إضافة منطقة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="regionName">اسم المنطقة *</Label>
              <Input
                id="regionName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="مثال: أبو حمص"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">رسوم التوصيل (ج.م)</Label>
              <Input
                id="deliveryFee"
                type="number"
                value={formData.delivery_fee}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_fee: e.target.value })
                }
                placeholder="15"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "جاري الحفظ..." : editingRegion ? "تحديث" : "إضافة"}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Admin Shops Management
function AdminShops() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAdmin) {
      loadShops();
    }
  }, [isAdmin]);

  // Secondary protection - return access denied if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const data = await shopsService.getAll({});
      setShops(data);
    } catch (error) {
      console.error("Failed to load shops:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShopStatus = async (shop: Shop, newStatus: ShopStatus) => {
    try {
      await shopsService.update(shop.id, { status: newStatus });
      const messages: Record<ShopStatus, string> = {
        APPROVED: "تم قبول المتجر بنجاح",
        REJECTED: "تم رفض المتجر",
        SUSPENDED: "تم إيقاف المتجر",
        PENDING: "تم إعادة المتجر للمراجعة",
      };
      toast.success(messages[newStatus]);
      loadShops();
    } catch (error) {
      toast.error("فشل تحديث حالة المتجر");
    }
  };

  const handleToggleOpen = async (shop: Shop) => {
    try {
      await shopsService.update(shop.id, { is_open: !shop.is_open });
      toast.success(shop.is_open ? "تم إغلاق المتجر" : "تم فتح المتجر");
      loadShops();
    } catch (error) {
      toast.error("فشل تحديث حالة المتجر");
    }
  };

  const getStatusBadge = (status: ShopStatus) => {
    const variants: Record<ShopStatus, { variant: any; label: string }> = {
      PENDING: { variant: "secondary", label: "قيد المراجعة" },
      APPROVED: { variant: "success", label: "مقبول" },
      REJECTED: { variant: "destructive", label: "مرفوض" },
      SUSPENDED: { variant: "destructive", label: "موقوف" },
    };
    return variants[status] || { variant: "secondary", label: status };
  };

  const filteredShops = shops.filter((shop) => {
    const matchesStatus =
      statusFilter === "ALL" || shop.status === statusFilter;
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phone?.includes(searchQuery) ||
      shop.address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = shops.filter((s) => s.status === "PENDING").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.shops}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.shops}</h1>
          <p className="text-muted-foreground">
            إدارة المتاجر المسجلة ({shops.length} متجر)
            {pendingCount > 0 && (
              <span className="text-amber-500 mr-2">
                • {pendingCount} بانتظار المراجعة
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف أو العنوان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع المتاجر</SelectItem>
            <SelectItem value="PENDING">قيد المراجعة</SelectItem>
            <SelectItem value="APPROVED">مقبولة</SelectItem>
            <SelectItem value="REJECTED">مرفوضة</SelectItem>
            <SelectItem value="SUSPENDED">موقوفة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredShops.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد متاجر</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "ALL"
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لم يتم تسجيل أي متاجر بعد"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShops.map((shop) => {
            const statusInfo = getStatusBadge(shop.status as ShopStatus);
            return (
              <Card
                key={shop.id}
                className={
                  shop.status === "PENDING"
                    ? "border-amber-200 bg-amber-50/30"
                    : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
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
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold">{shop.name}</h3>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                        {shop.status === "APPROVED" && (
                          <Badge
                            variant={shop.is_open ? "success" : "secondary"}
                          >
                            {shop.is_open ? "مفتوح" : "مغلق"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shop.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shop.phone}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        تاريخ التسجيل:{" "}
                        {new Date(shop.created_at).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {/* Status Actions */}
                      {shop.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              handleUpdateShopStatus(shop, "APPROVED")
                            }
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleUpdateShopStatus(shop, "REJECTED")
                            }
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </>
                      )}
                      {shop.status === "APPROVED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleOpen(shop)}
                          >
                            {shop.is_open ? "إغلاق" : "فتح"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleUpdateShopStatus(shop, "SUSPENDED")
                            }
                          >
                            <Ban className="w-4 h-4 ml-1" />
                            إيقاف
                          </Button>
                        </>
                      )}
                      {shop.status === "SUSPENDED" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            handleUpdateShopStatus(shop, "APPROVED")
                          }
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          إعادة تفعيل
                        </Button>
                      )}
                      {shop.status === "REJECTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateShopStatus(shop, "PENDING")
                          }
                        >
                          إعادة للمراجعة
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Admin Users Management
function AdminUsers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Secondary protection - return access denied if not admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("فشل تحميل المستخدمين");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRoleDialog = (profile: Profile) => {
    setSelectedUser(profile);
    setNewRole(profile.role);
    setShowRoleDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    setIsUpdating(true);
    try {
      // Use supabase directly for role update
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole as any })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("تم تحديث صلاحية المستخدم بنجاح");
      setShowRoleDialog(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("فشل تحديث صلاحية المستخدم");
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      ADMIN: { variant: "destructive", label: "مسؤول" },
      SHOP_OWNER: { variant: "default", label: "صاحب متجر" },
      CUSTOMER: { variant: "secondary", label: "عميل" },
      DELIVERY: { variant: "outline", label: "مندوب توصيل" },
    };
    return variants[role] || { variant: "secondary", label: role };
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesSearch =
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    shopOwners: users.filter((u) => u.role === "SHOP_OWNER").length,
    customers: users.filter((u) => u.role === "CUSTOMER").length,
    delivery: users.filter((u) => u.role === "DELIVERY").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{AR.admin.users}</h1>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{AR.admin.users}</h1>
        <p className="text-muted-foreground">
          إدارة المستخدمين ({users.length} مستخدم)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">مسؤولين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.shopOwners}</p>
                <p className="text-xs text-muted-foreground">أصحاب متاجر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.customers}</p>
                <p className="text-xs text-muted-foreground">عملاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats as any).delivery}</p>
                <p className="text-xs text-muted-foreground">مناديب</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب الصلاحية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع المستخدمين</SelectItem>
            <SelectItem value="ADMIN">المسؤولين</SelectItem>
            <SelectItem value="SHOP_OWNER">أصحاب المتاجر</SelectItem>
            <SelectItem value="CUSTOMER">العملاء</SelectItem>
            <SelectItem value="DELIVERY">المناديب</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد مستخدمين</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== "ALL"
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لم يسجل أي مستخدم بعد"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((profile) => {
            const roleInfo = getRoleBadge(profile.role);
            return (
              <Card key={profile.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-primary">
                          {profile.full_name?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold">{profile.full_name}</h3>
                        <Badge variant={roleInfo.variant}>
                          {roleInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.email}
                      </p>
                      {profile.phone && (
                        <p className="text-sm text-muted-foreground">
                          {profile.phone}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        انضم في:{" "}
                        {new Date(profile.created_at).toLocaleDateString(
                          "ar-EG"
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRoleDialog(profile)}
                        disabled={profile.id === user?.id}
                      >
                        <UserCog className="w-4 h-4 ml-1" />
                        تغيير الصلاحية
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير صلاحية المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {selectedUser.full_name?.charAt(0) || "U"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>الصلاحية الجديدة</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصلاحية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">عميل</SelectItem>
                    <SelectItem value="SHOP_OWNER">صاحب متجر</SelectItem>
                    <SelectItem value="DELIVERY">مندوب توصيل</SelectItem>
                    <SelectItem value="ADMIN">مسؤول</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newRole === "ADMIN" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  <strong>تحذير:</strong> منح صلاحية المسؤول يعطي هذا المستخدم
                  وصولاً كاملاً لجميع وظائف الإدارة.
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdateRole}
                  disabled={isUpdating || newRole === selectedUser.role}
                  className="flex-1"
                >
                  {isUpdating ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRoleDialog(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DashboardPage() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while auth state is being determined
  if (isLoading) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <LayoutDashboard className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <Link to="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const isDelivery = user?.role === "DELIVERY";
  const navItems = isDelivery ? deliveryNav : isAdmin ? adminNav : shopOwnerNav;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container-app py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        location.pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Routes>
              <Route
                index
                element={
                  isAdmin ? (
                    <AdminOverview />
                  ) : isDelivery ? (
                    <DeliveryDashboard />
                  ) : (
                    <DashboardOverview />
                  )
                }
              />
              <Route path="products" element={<DashboardProducts />} />
              <Route path="orders" element={<DashboardOrders />} />
              <Route path="settings" element={<DashboardSettings />} />
              <Route path="delivery" element={isAdmin ? <AdminDelivery /> : <DeliveryDashboard />} />
              {/* Admin-only routes - Protected by AdminGuard */}
              <Route
                path="shops"
                element={
                  <AdminGuard>
                    <AdminShops />
                  </AdminGuard>
                }
              />
              <Route
                path="categories"
                element={
                  <AdminGuard>
                    <AdminCategories />
                  </AdminGuard>
                }
              />
              <Route
                path="regions"
                element={
                  <AdminGuard>
                    <AdminRegions />
                  </AdminGuard>
                }
              />
              <Route
                path="users"
                element={
                  <AdminGuard>
                    <AdminUsers />
                  </AdminGuard>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
