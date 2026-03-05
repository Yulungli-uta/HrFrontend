import { useState } from "react";
import { Bell, RotateCcw, AlertTriangle, Check } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { formatDateTime } from "@/lib/docflow/formatters";
import type { DocflowNotification } from "@/types/docflow/docflow.types";

function NotificationIcon({ type }: { type: DocflowNotification["type"] }) {
  if (type === "RETURN") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
        <RotateCcw className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-yellow-100 dark:bg-yellow-900/30">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    </div>
  );
}

export function NotificationBell() {
  const service = useDocflowService();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);

  const notifications = service.getNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notification: DocflowNotification) => {
    if (!notification.isRead) {
      service.markNotificationRead(notification.id);
      setTick((t) => t + 1);
    }
    setOpen(false);
    setLocation(`/expedientes/${notification.instanceId}`);
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.isRead) {
        service.markNotificationRead(n.id);
      }
    });
    setTick((t) => t + 1);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-notification-bell"
          title="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        data-testid="popover-notifications"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h4 className="text-sm font-semibold" data-testid="text-notifications-title">
            Notificaciones
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              data-testid="button-mark-all-read"
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center" data-testid="text-no-notifications">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/80 ${
                    !notification.isRead ? "bg-accent/30" : ""
                  }`}
                  data-testid={`button-notification-${notification.id}`}
                >
                  <NotificationIcon type={notification.type} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium leading-tight" data-testid={`text-notification-title-${notification.id}`}>
                      {notification.title}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-notification-message-${notification.id}`}>
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
