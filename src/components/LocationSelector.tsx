import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/notify";
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
    lat?: number;
    lng?: number;
  };
  onChange: (data: {
    address: string;
    districtId: string | null;
    deliveryFee: number;
    phone?: string;
    lat?: number;
    lng?: number;
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
    useState<GeoCoordinates | null>(
      value?.lat && value?.lng
        ? { lat: value.lat, lng: value.lng }
        : null
    );

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
      lat: selectedCoordinates?.lat,
      lng: selectedCoordinates?.lng,
    });
  }, [manualAddress, selectedDistrictId, selectedCoordinates]);

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
    
    // Set coordinates if available in saved address
    if (address.latitude && address.longitude) {
      setSelectedCoordinates({
        lat: address.latitude,
        lng: address.longitude
      });
    }

    onChange({
      address: address.address,
      districtId: address.district_id,
      deliveryFee: address.district?.delivery_fee || 0,
      phone: address.phone || value?.phone,
      lat: address.latitude || undefined,
      lng: address.longitude || undefined,
    });
  };

  const handleMapLocationSelect = useCallback((coordinates: GeoCoordinates) => {
    // When returning from map, we want to open the dialog again with these coords
    // We assume we were adding/editing an address.
    // Since we closed the dialog to show the map, we need to restore the state.
    // For simplicity, we just set the editing address with new coordinates and re-open.
    
    // Construct a temporary address object with the new coordinates
    const newAddressPart = {
      // address: `موقع GPS: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, // Removed auto-fill
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      label: editingAddress?.label || "المنزل",
      is_default: editingAddress?.is_default || false,
      // Preserve other fields if possible, but map pick usually implies new location
    } as AddressWithDistrict;

    setEditingAddress((prev) => ({
       ...prev, 
       ...newAddressPart,
       // Merge existing text if it wasn't just GPS
       address: prev?.address ? prev.address : newAddressPart.address 
    } as AddressWithDistrict));
    
    // Re-open dialog
    setShowMapPicker(false);
    setShowAddDialog(true);
    notify.success("تم تحديد الموقع بنجاح");
  }, [editingAddress]);

  const getLabelIcon = (label: string) => {
    const Icon = LABEL_ICONS[label] || LABEL_ICONS.default;
    return Icon;
  };

  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);

  return (
    <div className={cn("space-y-4", className)}>
      
      {/* Map Picker Modal - Controlled by parent */}
      <MapLocationPicker
        open={showMapPicker}
        onClose={() => {
            setShowMapPicker(false);
            setShowAddDialog(true); // Re-open dialog on cancel
        }}
        onLocationSelect={handleMapLocationSelect}
        initialPosition={selectedCoordinates || undefined}
      />

      {/* Saved Addresses (Expanded by default or if available) */}
      {isAuthenticated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">العناوين المحفوظة</Label>
          </div>

          <div className="grid gap-2">
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
              onClick={() => {
                  setEditingAddress(null);
                  setShowAddDialog(true);
              }}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة عنوان جديد
            </Button>
          </div>
        </div>
      )}

      {/* Manual Entry Fields (Region, District, Address) - Only show if NO saved address is selected */ }
      {!selectedAddressId && (
        <>
           {/* Region */}
          <div className="space-y-2 pt-2 border-t">
            <Label>المنطقة</Label>
            <Select
              value={selectedRegionId || "placeholder"}
              onValueChange={(val) => {
                if (val !== "placeholder") {
                  setSelectedRegionId(val);
                  setSelectedDistrictId("");
                  setSelectedAddressId(null);
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
        
            {/* Address */}
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
        </>
      )}

      {/* Add/Edit Address Dialog */}
      <AddressDialog
        open={showAddDialog}
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
        onShowMap={() => {
            setShowAddDialog(false); // Close dialog to show map
            setShowMapPicker(true);
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
  onShowMap: () => void;
}

function AddressDialog({
  open,
  onClose,
  address,
  regions,
  userId,
  onSave,
  onShowMap,
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [addressError, setAddressError] = useState(false);

  useEffect(() => {
    if (regionId) {
      loadDistricts(regionId);
    }
  }, [regionId]);

  useEffect(() => {
    // When address prop changes (e.g. returning from map), update fields
    if (address) {
      setLabel(address.label);
      setAddressText(address.address);
      setPhone(address.phone || "");
      // Only overwrite region/district if they are present in the 'address' object
      // (Map return might not have district, preserve previous selection if possible?)
      // Actually map return only gives lat/lng and formatted text. 
      if (address.district?.region_id) setRegionId(address.district.region_id);
      if (address.district_id) setDistrictId(address.district_id);
      
      setIsDefault(address.is_default);
    } 
    // If opening fresh (no address), reset is handled by parent passing null or key?
    // Parent passes `editingAddress`. If null, we should reset.
    else if (open) { 
       // Only reset if opening fresh. 
       // Note: This effect runs on every 'address' change.
       setLabel("المنزل");
       setAddressText("");
       setPhone("");
       setRegionId("");
       setDistrictId("");
       setIsDefault(false);
    }
  }, [address, open]);

  // Reset error when dialog opens or address changes
  useEffect(() => {
    setAddressError(false);
  }, [address, open]);

  const loadDistricts = async (rid: string) => {
    try {
      const data = await regionsService.getDistricts(rid);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to load districts:", error);
    }
  };
  
  const requestGPSLocation = async () => {
    if (!navigator.geolocation) {
      notify.error("متصفحك لا يدعم خدمات تحديد الموقع");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGpsLoading(false);
        const locationText = `موقع GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setAddressText((prev) => prev ? `${prev} (${locationText})` : locationText);
        setAddressError(false);
        notify.success("تم تحديد موقعك بنجاح");
      },
      (error) => {
        setGpsLoading(false);
        notify.error("فشل تحديد الموقع: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!addressText.trim()) {
      notify.error("يرجى إدخال العنوان");
      setAddressError(true);
      return;
    }

    const finalLabel = label === "آخر" && customLabel ? customLabel : label;

    setIsSaving(true);
    try {
      // Prepare payload
      const payload: any = {
          label: finalLabel,
          address: addressText,
          district_id: districtId || null,
          phone: phone || null,
          is_default: isDefault,
      };
      
      // If the address object has lat/lng (from Map pick), include them
      if (address?.latitude && address?.longitude) {
         payload.latitude = address.latitude;
         payload.longitude = address.longitude;
      }
      
      // If we are editing an existing real DB address (it has an ID)
      if (address?.id) {
        await addressesService.update(address.id, userId, payload);
        notify.success("تم تحديث العنوان بنجاح");
      } else {
        await addressesService.create({
          user_id: userId,
          ...payload
        });
        notify.success("تم إضافة العنوان بنجاح");
      }
      await onSave();
    } catch (error) {
      console.error("Failed to save address:", error);
      notify.error("حدث خطأ أثناء حفظ العنوان");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {address?.id ? "تعديل العنوان" : "إضافة عنوان جديد"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
            
          {/* Location Tools */}
          <div className="flex gap-2 mb-2">

              <Button type="button" variant="outline" size="sm" className="w-full" onClick={onShowMap}>
                <Map className="w-4 h-4 ml-2" />
                {address?.latitude ? "تغيير الموقع على الخريطة" : "تحديد الموقع على الخريطة"}
              </Button>
          </div>
          {address?.latitude && address?.longitude && (
             <div className="text-xs text-muted-foreground text-center bg-muted p-2 rounded" dir="ltr">
                Selected: ({address.latitude.toFixed(6)}, {address.longitude.toFixed(6)})
             </div>
          )}
            
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


          {/* Address */}
          <div className="space-y-2">
            <Label className={cn(addressError && "text-destructive")}>
              العنوان التفصيلي
            </Label>
            <div className="relative">
                <Textarea
                  placeholder="مثال: شارع النيل، بجوار مسجد السلام، عمارة 5"
                  value={addressText}
                  onChange={(e) => {
                     setAddressText(e.target.value);
                     if (e.target.value.trim()) setAddressError(false);
                  }}
                  className={cn("min-h-[80px]", addressError && "border-destructive focus-visible:ring-destructive")}
                />
            </div>
            {addressError && (
               <p className="text-xs text-destructive">هذا الحقل مطلوب</p>
            )}
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
            {address?.id ? "حفظ التغييرات" : "إضافة العنوان"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export types for use in other components
export type { GeoLocation, AddressWithDistrict };
