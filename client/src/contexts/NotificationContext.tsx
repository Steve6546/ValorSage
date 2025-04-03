import React, { createContext, useContext, useReducer, ReactNode } from "react";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

type NotificationAction =
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "REMOVE_NOTIFICATION"; payload: string };

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationReducer = (
  state: Notification[],
  action: NotificationAction
): Notification[] => {
  switch (action.type) {
    case "ADD_NOTIFICATION":
      return [...state, action.payload];
    case "REMOVE_NOTIFICATION":
      return state.filter((notification) => notification.id !== action.payload);
    default:
      return state;
  }
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, dispatch] = useReducer(notificationReducer, []);

  const showNotification = (notification: Notification) => {
    dispatch({ type: "ADD_NOTIFICATION", payload: notification });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: "REMOVE_NOTIFICATION", payload: id });
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, showNotification, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};
