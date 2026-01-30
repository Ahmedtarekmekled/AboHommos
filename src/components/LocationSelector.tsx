import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  Home,
  Briefcase,
  Star,
  Plus,
  Check,
  ChevronDown,
  Loader2,
  MapPinOff,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatPrice } from "@/lib/utils";
import { useAuth } from "@/store";
import {
  addressesService,
  regionsService,
  type AddressWithDistrict,
} from "@/services";
import type { Region, District } from "@/types/database";
import {
  MapLocationPicker,
  LocationPreviewMap,
  type GeoCoordinates,
} from "./MapLocationPicker";

// Label icons mapping
const LABEL_ICONS: Record<string, React.ElementType> = {
  المنزل: Home,
  العمل: Briefcase,
  default: Star,
};

const PRESET_LABELS = ["المنزل", "العمل", "آخر"];

// GPS Location types
interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationSelectorProps {
  value?: {
    address: string;
    districtId?: string | null;
    phone?: string;
  };
  onChange: (data: {
    address: string;
    districtId: string | null;
    deliveryFee: number;
    phone?: string;
  }) => void;
  className?: string;
  disabled?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  className,
  disabled,
}: LocationSelectorProps) {
  const { isAuthenticated, user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<AddressWithDistrict[]>(
    []
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [manualAddress, setManualAddress] = useState(value?.address || "");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GeoLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<AddressWithDistrict | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<GeoCoordinates | null>(null);

  // Load initial data
  useEffect(() => {
    loadRegions();
    if (isAuthenticated && user?.id) {
      loadSavedAddresses();
    }
  }, [isAuthenticated, user?.id]);

  // Load districts when region changes
  useEffect(() => {
    if (selectedRegionId) {
      loadDistricts(selectedRegionId);
    } else {
      setDistricts([]);
    }
  }, [selectedRegionId]);

  // Update parent when selection changes
  useEffect(() => {
    const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);
    onChange({
      address: manualAddress,
      districtId: selectedDistrictId || null,
      deliveryFee: selectedDistrict?.delivery_fee || 0,
      phone: value?.phone,
    });
  }, [manualAddress, selectedDistrictId]);

  const loadRegions = async () => {
    try {
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    }
  };

  const loadDistricts = async (regionId: string) => {
    try {
      const data = await regionsService.getDistricts(regionId);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to load districts:", error);
    }
  };

  const loadSavedAddresses = async () => {
    if (!user?.id) return;
    setIsLoadingAddresses(true);
    try {
      const data = await addressesService.getByUser(user.id);
      setSavedAddresses(data);
      // Auto-select default address
      const defaultAddress = data.find((a) => a.is_default);
      if (defaultAddress && !value?.address) {
        selectSavedAddress(defaultAddress);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const selectSavedAddress = (address: AddressWithDistrict) => {
    setSelectedAddressId(address.id);
    setManualAddress(address.address);
    if (address.district?.region_id) {
      setSelectedRegionId(address.district.region_id);
    }
    if (address.district_id) {
      setSelectedDistrictId(address.district_id);
    }
    onChange({
      address: address.address,
      districtId: address.district_id,
      deliveryFee: address.district?.delivery_fee || 0,
      phone: address.phone || value?.phone,
    });
  };

  const requestGPSLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError("متصفحك لا يدعم خدمات تحديد الموقع");
      toast.error("متصفحك لا يدعم خدمات تحديد الموقع");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsLocation({ latitude, longitude, accuracy });
        setGpsLoading(false);

        // Try to reverse geocode (simplified - just show coordinates for now)
        // In production, you'd use a geocoding API like Google Maps or OpenStreetMap
        const locationText = `موقع GPS: ${latitude.toFixed(
          6
        )}, ${longitude.toFixed(6)}`;
        setManualAddress((prev) =>
          prev ? `${prev}\n${locationText}` : locationText
        );
        toast.success("تم تحديد موقعك بنجاح");
      },
      (error) => {
        setGpsLoading(false);
        let errorMessage = "فشل تحديد الموقع";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "تم رفض إذن تحديد الموقع. يرجى السماح بالوصول من إعدادات المتصفح";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "خدمة الموقع غير متاحة حالياً";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهى وقت محاولة تحديد الموقع";
            break;
        }
        setGpsError(errorMessage);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const handleMapLocationSelect = useCallback((coordinates: GeoCoordinates) => {
    setSelectedCoordinates(coordinates);
    const locationText = `موقع GPS: ${coordinates.lat.toFixed(
      6
    )}, ${coordinates.lng.toFixed(6)}`;
    setManualAddress((prev) => {
      // Replace existing GPS coordinates or append new ones
      const gpsRegex = /موقع GPS: [\d.-]+, [\d.-]+/;
      if (gpsRegex.test(prev)) {
        return prev.replace(gpsRegex, locationText);
      }
      return prev ? `${prev}\n${locationText}` : locationText;
    });
    setGpsLocation({
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      accuracy: 0,
    });
    toast.success("تم تحديد الموقع على الخريطة بنجاح");
  }, []);

  const getLabelIcon = (label: string) => {
    const Icon = LABEL_ICONS[label] || LABEL_ICONS.default;
    return Icon;
  };

  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);

  return (
    <div className={cn("space-y-4", className)}>
      {/* GPS Button and Map Button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={requestGPSLocation}
          disabled={disabled || gpsLoading}
          className="flex-1"
        >
          {gpsLoading ? (
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          ) : gpsLocation ? (
            <Check className="w-4 h-4 ml-2 text-success" />
          ) : (
            <Navigation className="w-4 h-4 ml-2" />
          )}
          {gpsLoading ? "جاري التحديد..." : "تحديد موقعي"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMapPicker(true)}
          disabled={disabled}
          className="flex-1"
        >
          <Map className="w-4 h-4 ml-2" />
          الخريطة
        </Button>
      </div>

      {/* Map Preview when coordinates are selected */}
      {selectedCoordinates && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            الموقع المحدد على الخريطة
          </Label>
          <div
            className="cursor-pointer hover:opacity-90 transition-opacity rounded-lg overflow-hidden border"
            onClick={() => setShowMapPicker(true)}
          >
            <LocationPreviewMap position={selectedCoordinates} />
          </div>
          <p className="text-xs text-muted-foreground text-center" dir="ltr">
            {selectedCoordinates.lat.toFixed(6)},{" "}
            {selectedCoordinates.lng.toFixed(6)}
          </p>
        </div>
      )}

      {gpsError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
          <MapPinOff className="w-4 h-4" />
          {gpsError}
        </div>
      )}

      {/* Saved Addresses (for authenticated users) */}
      {isAuthenticated && savedAddresses.length > 0 && (
        <div className="space-y-2">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Label className="text-sm font-medium cursor-pointer">
              العناوين المحفوظة
            </Label>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </div>

          {isExpanded && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {savedAddresses.map((address) => {
                const Icon = getLabelIcon(address.label);
                const isSelected = selectedAddressId === address.id;
                return (
                  <Card
                    key={address.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      isSelected && "border-primary bg-primary/5"
                    )}
                    onClick={() => selectSavedAddress(address)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{address.label}</span>
                            {address.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {address.address}
                          </p>
                          {address.district && (
                            <p className="text-xs text-muted-foreground">
                              {address.district.name} -{" "}
                              {formatPrice(address.district.delivery_fee)} توصيل
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة عنوان جديد
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Region & District Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="region" className="text-sm">
            المنطقة
          </Label>
          <Select
            value={selectedRegionId || "placeholder"}
            onValueChange={(val) => {
              if (val !== "placeholder") {
                setSelectedRegionId(val);
                setSelectedDistrictId("");
                setSelectedAddressId(null);
              }
            }}
            disabled={disabled}
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

        <div className="space-y-2">
          <Label htmlFor="district" className="text-sm">
            الحي
          </Label>
          <Select
            value={selectedDistrictId || "placeholder"}
            onValueChange={(val) => {
              if (val !== "placeholder") {
                setSelectedDistrictId(val);
                setSelectedAddressId(null);
              }
            }}
            disabled={disabled || !selectedRegionId || districts.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !selectedRegionId ? "اختر المنطقة أولاً" : "اختر الحي"
                }
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
      </div>

      {/* Delivery Fee Display */}
      {selectedDistrict && (
        <div className="flex items-center justify-between bg-success/10 text-success-foreground p-3 rounded-lg">
          <span className="text-sm font-medium">رسوم التوصيل للحي المحدد:</span>
          <span className="font-bold">
            {formatPrice(selectedDistrict.delivery_fee)}
          </span>
        </div>
      )}

      {/* Manual Address Input */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm">
          <MapPin className="w-4 h-4 inline ml-1" />
          العنوان التفصيلي
        </Label>
        <Textarea
          id="address"
          placeholder="مثال: شارع النيل، بجوار مسجد السلام، عمارة 5، شقة 12"
          value={manualAddress}
          onChange={(e) => {
            setManualAddress(e.target.value);
            setSelectedAddressId(null);
          }}
          disabled={disabled}
          className="min-h-[80px]"
        />
      </div>

      {/* Add/Edit Address Dialog */}
      <AddressDialog
        open={showAddDialog || !!editingAddress}
        onClose={() => {
          setShowAddDialog(false);
          setEditingAddress(null);
        }}
        address={editingAddress}
        regions={regions}
        userId={user?.id || ""}
        onSave={async () => {
          setShowAddDialog(false);
          setEditingAddress(null);
          await loadSavedAddresses();
        }}
      />
    </div>
  );
}

// Address Dialog Component
interface AddressDialogProps {
  open: boolean;
  onClose: () => void;
  address?: AddressWithDistrict | null;
  regions: Region[];
  userId: string;
  onSave: () => Promise<void>;
}

function AddressDialog({
  open,
  onClose,
  address,
  regions,
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
  const [districts, setDistricts] = useState<District[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
                    {district.name}
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

// Export types for use in other components
export type { GeoLocation, AddressWithDistrict };
