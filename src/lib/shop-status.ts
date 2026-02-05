import { Shop, WorkingHours } from "@/types/database";

export interface ShopStatus {
  isOpen: boolean;
  statusText: string;
  nextChange?: Date;
  isOverride: boolean;
}

const DAYS_MAP = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/**
 * Calculates the current open/closed status of a shop based on override mode and schedule.
 * @param shop The shop object (containing override_mode)
 * @param hours Array of working hours for the week
 * @returns ShopStatus object
 */
export function getShopStatus(shop: Shop, hours?: WorkingHours[]): ShopStatus {
  // 1. Manual Override
  if (shop.override_mode === 'FORCE_OPEN') {
    return { isOpen: true, statusText: "مفتوح الآن", isOverride: true };
  }
  if (shop.override_mode === 'FORCE_CLOSED') {
    return { isOpen: false, statusText: "مغلق مؤقتاً", isOverride: true };
  }

  // 2. Schedule Logic (AUTO)
  if (!hours || hours.length === 0) {
    // Fallback if no hours defined -> Assume Closed or Open? Safe is Closed.
    // Or legacy is_open flag? Let's use legacy flag as fallback
    return { 
      isOpen: shop.is_open, 
      statusText: shop.is_open ? "مفتوح" : "مغلق",
      isOverride: false 
    };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

  const todaySchedule = hours.find(h => h.day_of_week === currentDay);

  if (!todaySchedule || todaySchedule.is_day_off) {
    // Closed Today
    return { isOpen: false, statusText: "مغلق اليوم", isOverride: false };
  }

  if (!todaySchedule.open_time || !todaySchedule.close_time) {
     return { isOpen: false, statusText: "مغلق", isOverride: false };
  }

  // Parse Times (HH:mm:ss)
  const [openH, openM] = todaySchedule.open_time.split(':').map(Number);
  const [closeH, closeM] = todaySchedule.close_time.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentTime >= openMinutes && currentTime < closeMinutes) {
    return { isOpen: true, statusText: `يغلق في ${formatTime(todaySchedule.close_time)}`, isOverride: false };
  } else {
    return { isOpen: false, statusText: "مغلق الآن", isOverride: false };
  }
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h);
  const ampm = hour >= 12 ? 'م' : 'ص';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${m} ${ampm}`;
}
