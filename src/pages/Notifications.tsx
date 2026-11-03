import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  notification_type?: string | null;
  type?: string | null;
  is_read: boolean;
  link?: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
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

  const handleClick = (notification: Notification) => {
    markAsRead(notification.id);
    const targetUrl = notification.link || 
      (notification.related_entity_type === 'borrow_request' ? '/my-requests' : 
      (notification.related_entity_type === 'item' && notification.related_entity_id ? `/items/${notification.related_entity_id}` : null));
    
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const getTypeIcon = (type?: string | null) => {
    const t = (type || "").toLowerCase();
    if (t.includes("success") || t.includes("approved")) {
      return <CheckCircle className="h-5 w-5 text-success" />;
    }
    if (t.includes("warning") || t.includes("low_stock") || t.includes("overdue")) {
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    }
    if (t.includes("error") || t.includes("rejected") || t.includes("damage")) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    return <Info className="h-5 w-5 text-info" />;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout title="Notifications" subtitle="View all your notifications">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{notifications.length} total</Badge>
            {unreadCount > 0 && (
              <Badge className="bg-primary">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="w-full sm:w-auto">
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              All Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll see alerts about your requests and inventory here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        !notification.is_read ? "bg-primary/5 border-primary/20" : "bg-background"
                      }`}
                      onClick={() => handleClick(notification)}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getTypeIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`font-medium ${!notification.is_read ? "text-primary" : ""}`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.related_entity_id && (
                              <span className="text-xs text-primary flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View details
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
