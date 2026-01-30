import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Star,
  MoreVertical,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AR } from "@/lib/i18n";
import { getInitials, formatPrice, cn } from "@/lib/utils";
import { useAuth } from "@/store";
import {
  addressesService,
  regionsService,
  type AddressWithDistrict,
} from "@/services";
import type { Region, District } from "@/types/database";

// Label icons mapping
const LABEL_ICONS: Record<string, React.ElementType> = {
  المنزل: Home,
  العمل: Briefcase,
  default: Star,
};

const PRESET_LABELS = ["المنزل", "العمل", "آخر"];

export default function AccountPage() {
  const { user, isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<AddressWithDistrict[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<AddressWithDistrict | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAddresses();
    }
  }, [isAuthenticated, user?.id]);

  const loadAddresses = async () => {
    if (!user?.id) return;
    setIsLoadingAddresses(true);
    try {
      const data = await addressesService.getByUser(user.id);
      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user?.id) return;
    setDeletingId(id);
    try {
      await addressesService.delete(id, user.id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("تم حذف العنوان بنجاح");
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("حدث خطأ أثناء حذف العنوان");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user?.id) return;
    try {
      await addressesService.setDefault(id, user.id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
      toast.success("تم تعيين العنوان كافتراضي");
    } catch (error) {
      console.error("Failed to set default:", error);
      toast.error("حدث خطأ");
    }
  };

  const getLabelIcon = (label: string) => {
    return LABEL_ICONS[label] || LABEL_ICONS.default;
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <User className="w-full h-full" />
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

  return (
    <div className="py-8">
      <div className="container-app max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">{AR.nav.account}</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>الملف الشخصي</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowEditProfileDialog(true)}
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.full_name}</h2>
                <p className="text-muted-foreground">
                  {user.role === "SHOP_OWNER"
                    ? "صاحب متجر"
                    : user.role === "ADMIN"
                    ? "مدير"
                    : "عميل"}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {AR.auth.email}
                  </p>
                  <p className="font-medium" dir="ltr">
                    {user.email}
                  </p>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {AR.auth.phone}
                    </p>
                    <p className="font-medium" dir="ltr">
                      {user.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Saved Addresses Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                العناوين المحفوظة
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-4 h-4" />
                إضافة عنوان
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAddresses ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  لم تقم بإضافة أي عناوين بعد
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة عنوان جديد
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => {
                  const Icon = getLabelIcon(address.label);
                  return (
                    <div
                      key={address.id}
                      className={cn(
                        "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                        address.is_default && "border-primary bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          address.is_default
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              افتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {address.address}
                        </p>
                        {address.district && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {address.district.name} -{" "}
                            {formatPrice(address.district.delivery_fee)} توصيل
                          </p>
                        )}
                        {address.phone && (
                          <p
                            className="text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {address.phone}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingAddress(address)}
                          >
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          {!address.is_default && (
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(address.id)}
                            >
                              <Check className="w-4 h-4 ml-2" />
                              تعيين كافتراضي
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-destructive focus:text-destructive"
                            disabled={deletingId === address.id}
                          >
                            {deletingId === address.id ? (
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 ml-2" />
                            )}
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/orders">
            <Card interactive className="p-6 h-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{AR.nav.orders}</h3>
                  <p className="text-sm text-muted-foreground">
                    عرض جميع طلباتك
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          {(user.role === "SHOP_OWNER" || user.role === "ADMIN") && (
            <Link to="/dashboard">
              <Card interactive className="p-6 h-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{AR.dashboard.title}</h3>
                    <p className="text-sm text-muted-foreground">إدارة متجرك</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>

        {/* Add/Edit Address Dialog */}
        <AddressDialog
          open={showAddDialog || !!editingAddress}
          onClose={() => {
            setShowAddDialog(false);
            setEditingAddress(null);
          }}
          address={editingAddress}
          userId={user.id}
          onSave={async () => {
            setShowAddDialog(false);
            setEditingAddress(null);
            await loadAddresses();
          }}
        />

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          open={showEditProfileDialog}
          onClose={() => setShowEditProfileDialog(false)}
          user={user}
        />
      </div>
    </div>
  );
}

import { authService } from "@/services/auth.service";
import type { Profile } from "@/types/database";

function EditProfileDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: Profile;
}) {
  const { refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || "");
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when user prop changes
  useEffect(() => {
    setFullName(user.full_name);
    setPhone(user.phone || "");
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("يرجى إدخال الاسم");
      return;
    }

    setIsLoading(true);
    try {
      await authService.updateProfile(user.id, {
        full_name: fullName,
        phone: phone || null,
      });
      await refreshUser();
      toast.success("تم تحديث الملف الشخصي");
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("حدث خطأ أثناء التحديث");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الملف الشخصي</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم الكامل"
            />
          </div>
          <div className="space-y-2">
            <Label>رقم الهاتف</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Address Dialog Component
interface AddressDialogProps {
  open: boolean;
  onClose: () => void;
  address?: AddressWithDistrict | null;
  userId: string;
  onSave: () => Promise<void>;
}

function AddressDialog({
  open,
  onClose,
  address,
  userId,
  onSave,
}: AddressDialogProps) {
  const [label, setLabel] = useState(address?.label || "المنزل");
  const [customLabel, setCustomLabel] = useState("");
  const [addressText, setAddressText] = useState(address?.address || "");
  const [phone, setPhone] = useState(address?.phone || "");
  const [regionId, setRegionId] = useState(address?.district?.region_id || "");
  const [districtId, setDistrictId] = useState(address?.district_id || "");
  const [isDefault, setIsDefault] = useState(address?.is_default || false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    if (regionId) {
      loadDistricts(regionId);
    }
  }, [regionId]);

  useEffect(() => {
    if (address) {
      setLabel(address.label);
      setAddressText(address.address);
      setPhone(address.phone || "");
      setRegionId(address.district?.region_id || "");
      setDistrictId(address.district_id || "");
      setIsDefault(address.is_default);
    } else {
      setLabel("المنزل");
      setAddressText("");
      setPhone("");
      setRegionId("");
      setDistrictId("");
      setIsDefault(false);
    }
  }, [address]);

  const loadRegions = async () => {
    try {
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    }
  };

  const loadDistricts = async (rid: string) => {
    try {
      const data = await regionsService.getDistricts(rid);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to load districts:", error);
    }
  };

  const handleSave = async () => {
    if (!addressText.trim()) {
      toast.error("يرجى إدخال العنوان");
      return;
    }

    const finalLabel = label === "آخر" && customLabel ? customLabel : label;

    setIsSaving(true);
    try {
      if (address) {
        await addressesService.update(address.id, userId, {
          label: finalLabel,
          address: addressText,
          district_id: districtId || null,
          phone: phone || null,
          is_default: isDefault,
        });
        toast.success("تم تحديث العنوان بنجاح");
      } else {
        await addressesService.create({
          user_id: userId,
          label: finalLabel,
          address: addressText,
          district_id: districtId || null,
          phone: phone || null,
          is_default: isDefault,
        });
        toast.success("تم إضافة العنوان بنجاح");
      }
      await onSave();
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error("حدث خطأ أثناء حفظ العنوان");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {address ? "تعديل العنوان" : "إضافة عنوان جديد"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label Selection */}
          <div className="space-y-2">
            <Label>تصنيف العنوان</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_LABELS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={label === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLabel(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            {label === "آخر" && (
              <Input
                placeholder="أدخل اسم للعنوان"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            )}
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label>المنطقة</Label>
            <Select
              value={regionId || "placeholder"}
              onValueChange={(val) => {
                if (val !== "placeholder") {
                  setRegionId(val);
                  setDistrictId("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  اختر المنطقة
                </SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div className="space-y-2">
            <Label>الحي</Label>
            <Select
              value={districtId || "placeholder"}
              onValueChange={(val) =>
                val !== "placeholder" && setDistrictId(val)
              }
              disabled={!regionId || districts.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={!regionId ? "اختر المنطقة أولاً" : "اختر الحي"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  اختر الحي
                </SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name} - {formatPrice(district.delivery_fee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>العنوان التفصيلي</Label>
            <Textarea
              placeholder="مثال: شارع النيل، بجوار مسجد السلام، عمارة 5"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>رقم الهاتف (اختياري)</Label>
            <Input
              type="tel"
              dir="ltr"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">تعيين كعنوان افتراضي</span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            {address ? "حفظ التغييرات" : "إضافة العنوان"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
