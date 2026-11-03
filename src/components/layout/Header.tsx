import { useState, useEffect } from "react";
import {
  Bell,
  Search,
  Menu,
  X,
  Check,
  ExternalLink,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  notification_type?: string | null;
  type?: string | null;
  is_read: boolean;
  link: string | null;
  related_entity_id?: string | null;
  related_entity_type?: string | null;
  created_at: string;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

export function Header({
  title,
  subtitle,
  onMenuClick,
  isMenuOpen,
}: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Subscribe to realtime updates
      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
      setUnreadCount(
        (data || []).filter((n: Notification) => !n.is_read).length,
      );
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from("notifications").delete().eq("id", id);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    const targetUrl = notification.link || 
      (notification.related_entity_type === "borrow_request" ? "/my-requests" : 
      (notification.related_entity_type === "item" && notification.related_entity_id ? `/items/${notification.related_entity_id}` : null));
    
    if (targetUrl) {
      navigate(targetUrl);
      setIsOpen(false);
    }
  };

  const getTypeIcon = (type?: string | null) => {
    const t = (type || "").toLowerCase();
    if (t.includes("success") || t.includes("approved")) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (t.includes("warning") || t.includes("low_stock") || t.includes("overdue")) {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
    if (t.includes("error") || t.includes("rejected") || t.includes("damage")) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <Info className="h-4 w-4 text-info" />;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu Button - Enhanced */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "lg:hidden relative overflow-hidden rounded-xl h-10 w-10",
            "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
            "text-white shadow-lg shadow-blue-500/25",
            "transition-all duration-300",
          )}
          onClick={onMenuClick}
        >
          <div className="relative">
            <Menu
              className={cn(
                "h-5 w-5 transition-all duration-300 absolute",
                isMenuOpen
                  ? "rotate-90 opacity-0 scale-50"
                  : "rotate-0 opacity-100 scale-100",
              )}
            />
            <X
              className={cn(
                "h-5 w-5 transition-all duration-300",
                isMenuOpen
                  ? "rotate-0 opacity-100 scale-100"
                  : "-rotate-90 opacity-0 scale-50",
              )}
            />
          </div>
        </Button>

        {/* Page Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items, users..."
            className="w-48 lg:w-64 pl-10 rounded-xl border-border/50 bg-muted/50 focus:bg-background transition-all"
          />
        </div>

        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-xl hover:bg-muted"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Offline Status Indicator */}
        <OfflineIndicator />

        {/* Kiosk Mode Shortcut */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/kiosk")}
          className="rounded-xl hover:bg-muted group text-muted-foreground hover:text-foreground"
          title="Kiosk Self-Checkout"
        >
          <QrCode className="h-5 w-5 transition-transform group-hover:scale-110 text-primary" />
        </Button>

        {/* Notifications */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-muted group"
            >
              <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center p-0 text-[10px] bg-gradient-to-r from-orange-500 to-orange-600 border-0 text-white shadow-lg shadow-orange-500/25">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                        !notification.is_read && "bg-primary/5",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getTypeIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm truncate",
                                !notification.is_read && "font-medium",
                              )}
                            >
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(notification.created_at),
                                { addSuffix: true },
                              )}
                            </span>
                            {notification.link && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute right-2 top-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
