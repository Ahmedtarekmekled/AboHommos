import { useState, useEffect } from "react";
import { Bell, Check, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/store";
import { notificationService, Notification } from "@/services/notification.service";
import { useLiveQueue } from "@/hooks/useLiveQueue";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Order } from "@/types/database";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // ------------------------------------------------------
  // ROLE: DELIVERY (LIVE QUEUE)
  // ------------------------------------------------------
  const { orders: liveQueue } = useLiveQueue();
  
  // ------------------------------------------------------
  // ROLE: SHOP OWNER (STORED NOTIFICATIONS)
  // ------------------------------------------------------
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'DELIVERY') return; // Delivery uses liveQueue

    // 1. Fetch
    const loadQuery = async () => {
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    };
    loadQuery();

    // 2. Subscribe
    const unsubscribe = notificationService.subscribeNotifications(
      user.id,
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Handlers for Shop Owner
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await notificationService.markAsRead(id);
  };

  const handleMarkAllRead = async () => {
     if (!user) return;
     setNotifications((prev) => prev.map(n => ({...n, is_read: true})));
     setUnreadCount(0);
     await notificationService.markAllAsRead(user.id);
  };

  // Click Handler
  const handleNotificationClick = (item: Notification | Order) => {
    setIsOpen(false);
    
    if (user?.role === 'DELIVERY') {
        const order = item as Order;
        navigate('/dashboard'); // Delivery goes to main dashboard
    } else {
        const notif = item as Notification;
        if (!notif.is_read) {
            handleMarkAsRead(notif.id, { stopPropagation: () => {} } as any);
        }
        if (notif.order_id) {
            // Shop Owner -> Dashboard Orders
            if (user?.role === 'SHOP_OWNER') {
                 navigate('/dashboard/orders');
            } else {
                 navigate(`/orders/${notif.order_id}`);
            }
        }
    }
  };


  if (!user) return null;
  const isDelivery = user.role === 'DELIVERY';

  // Metrics
  const count = isDelivery ? liveQueue.length : unreadCount;
  const hasItems = isDelivery ? liveQueue.length > 0 : notifications.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isDelivery ? <Truck className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-in zoom-in">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
            <DropdownMenuLabel>
                {isDelivery ? "طلبات متاحة (مباشر)" : "الإشعارات"}
            </DropdownMenuLabel>
            {!isDelivery && unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-6">
                    تحديد الكل كمقروء
                </Button>
            )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {!hasItems ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isDelivery ? "لا توجد طلبات متاحة حالياً" : "لا توجد إشعارات جديدة"}
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {/* DELIVERY VIEW */}
              {isDelivery && liveQueue.map((order) => (
                 <DropdownMenuItem
                  key={order.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer bg-accent/20 border-b last:border-0"
                  onClick={() => handleNotificationClick(order)}
                >
                  <div className="flex w-full justify-between items-start gap-2">
                    <span className="text-sm font-semibold">
                        طلب جديد #{order.order_number || order.id.slice(0,6)}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                        متاح للاستلام
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                     منذ {format(new Date(order.created_at), "mm", { locale: ar })} دقيقة
                  </span>
                </DropdownMenuItem>
              ))}

              {/* SHOP/USER VIEW */}
              {!isDelivery && notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                    !notification.is_read ? "bg-accent/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full justify-between items-start gap-2">
                    <span className={`text-sm ${!notification.is_read ? "font-semibold" : "font-medium"}`}>
                        {notification.message}
                    </span>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), "p", { locale: ar })}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
