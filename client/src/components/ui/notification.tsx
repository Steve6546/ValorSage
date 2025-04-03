import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNotification } from "@/contexts/NotificationContext";

interface NotificationProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icon = {
    success: "ri-check-line",
    error: "ri-error-warning-line",
    warning: "ri-alert-line",
    info: "ri-information-line",
  };
  
  const bgColor = {
    success: "bg-green-100 border-green-500 text-green-900",
    error: "bg-red-100 border-red-500 text-red-900",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-900",
    info: "bg-blue-100 border-blue-500 text-blue-900",
  };
  
  const iconColor = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  return (
    <div
      className={cn(
        "notification-animate bg-white border-r-4 p-3 rounded shadow-lg flex items-center space-x-3 rtl:space-x-reverse w-72",
        bgColor[type]
      )}
    >
      <i className={cn("text-xl", icon[type], iconColor[type])}></i>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 left-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

export default Notification;
