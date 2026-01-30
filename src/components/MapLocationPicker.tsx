import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import {
  Navigation,
  Loader2,
  MapPinOff,
  Check,
  Crosshair,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Fix for default marker icon in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom red marker icon for better visibility
const customMarkerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

interface MapLocationPickerProps {
  initialPosition?: GeoCoordinates;
  onLocationSelect: (coordinates: GeoCoordinates) => void;
  open: boolean;
  onClose: () => void;
}

// Component to handle map events and marker dragging
function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: GeoCoordinates;
  onPositionChange: (pos: GeoCoordinates) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onPositionChange({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={customMarkerIcon}
    />
  );
}

// Component to handle map click events
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (pos: GeoCoordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Component to center map on position
function CenterMapOnPosition({ position }: { position: GeoCoordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom());
  }, [position, map]);
  return null;
}

// Zoom controls component
function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-24 left-3 z-[1000] flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-9 w-9 shadow-lg"
        onClick={() => map.zoomIn()}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-9 w-9 shadow-lg"
        onClick={() => map.zoomOut()}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function MapLocationPicker({
  initialPosition,
  onLocationSelect,
  open,
  onClose,
}: MapLocationPickerProps) {
  // Default to Abo Hommos, Egypt area if no initial position
  const defaultPosition: GeoCoordinates = {
    lat: 31.0603,
    lng: 30.3254,
  };

  const [position, setPosition] = useState<GeoCoordinates>(
    initialPosition || defaultPosition
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get user's location on mount if no initial position
  useEffect(() => {
    if (open && !hasInitialized && !initialPosition) {
      getCurrentLocation();
      setHasInitialized(true);
    }
  }, [open, hasInitialized, initialPosition]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("متصفحك لا يدعم خدمات تحديد الموقع");
      toast.error("متصفحك لا يدعم خدمات تحديد الموقع");
      return;
    }

    setIsGettingLocation(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(newPosition);
        setIsGettingLocation(false);
        toast.success("تم تحديد موقعك بنجاح");
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "فشل تحديد الموقع";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض إذن تحديد الموقع";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "خدمة الموقع غير متاحة";
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
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, []);

  const handlePositionChange = useCallback((newPos: GeoCoordinates) => {
    setPosition(newPos);
  }, []);

  const handleConfirm = () => {
    onLocationSelect(position);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            تحديد الموقع على الخريطة
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* GPS Error Message */}
          {gpsError && (
            <div className="absolute top-2 left-2 right-2 z-[1000] bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <MapPinOff className="w-4 h-4" />
              {gpsError}
            </div>
          )}

          {/* Map Container */}
          <div className="h-[400px] w-full relative">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={16}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DraggableMarker
                position={position}
                onPositionChange={handlePositionChange}
              />
              <MapClickHandler onMapClick={handlePositionChange} />
              <CenterMapOnPosition position={position} />
              <ZoomControls />
            </MapContainer>

            {/* Crosshair overlay for center indicator */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[500]">
              <div className="w-6 h-6 border-2 border-primary/30 rounded-full" />
            </div>
          </div>

          {/* Controls overlay */}
          <div className="absolute bottom-4 right-3 z-[1000]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="shadow-lg"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4 ml-2" />
              )}
              {isGettingLocation ? "جاري التحديد..." : "موقعي الحالي"}
            </Button>
          </div>
        </div>

        {/* Coordinates Display */}
        <div
          className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground text-center"
          dir="ltr"
        >
          {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </div>

        {/* Instructions */}
        <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t">
          اسحب العلامة الحمراء أو انقر على الخريطة لتحديد موقعك بدقة
        </div>

        <DialogFooter className="p-4 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" onClick={handleConfirm}>
            <Check className="w-4 h-4 ml-2" />
            تأكيد الموقع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simplified inline map component for displaying selected location
export function LocationPreviewMap({
  position,
  className,
}: {
  position: GeoCoordinates;
  className?: string;
}) {
  return (
    <div className={cn("h-32 w-full rounded-lg overflow-hidden", className)}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[position.lat, position.lng]}
          icon={customMarkerIcon}
        />
      </MapContainer>
    </div>
  );
}
