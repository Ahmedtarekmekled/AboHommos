import { useState, useEffect } from "react";
import { Bell, Check, ShoppingBag } from "lucide-react";
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
import { useAuth } from "@/store"; // Assuming auth store exists
import { notificationService, Notification } from "@/services/notification.service";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Load initial data
  useEffect(() => {
    if (!user) return;

    // 1. Fetch initial
    const loadQuery = async () => {
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    };
    loadQuery();

    // 2. Subscribe Realtime
    const unsubscribe = notificationService.subscribeNotifications(
      user.id,
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Optional: Play sound or show toast here if needed
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await notificationService.markAsRead(id);
  };

  const handleMarkAllRead = async () => {
     if (!user) return;
     // Optimistic
     setNotifications((prev) => prev.map(n => ({...n, is_read: true})));
     setUnreadCount(0);
     await notificationService.markAllAsRead(user.id);
  };

  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false);
    if (!notification.is_read) {
        handleMarkAsRead(notification.id, { stopPropagation: () => {} } as any);
    }
    
    // Navigate based on type
    if (notification.order_id) {
       // Check role to decide path? standard /orders usually works or /dashboard/orders
       // If shop owner -> /dashboard/orders
       // If driver -> /delivery/dashboard (or similar)
       // Let's assume generic order view or let the user navigate
       if (user?.role === 'SHOP_OWNER' || user?.role === 'DELIVERY') {
           navigate('/dashboard');
       } else {
           navigate(`/orders/${notification.order_id}`);
       }
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
            <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-6">
                    تحديد الكل كمقروء
                </Button>
            )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              لا توجد إشعارات جديدة
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {notifications.map((notification) => (
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
