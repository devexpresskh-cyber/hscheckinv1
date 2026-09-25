import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification } from '../types/index.ts';
import { StorageService } from '../services/storageService.ts';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(StorageService.getNotifications());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setNotifications(StorageService.getNotifications());
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: Toast = { id, type, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = (id: string) => {
    StorageService.markNotificationRead(id);
  };

  const markAllAsRead = () => {
    StorageService.markAllNotificationsRead();
    showToast('All notifications marked as read', 'info');
  };

  const clearAll = () => {
    StorageService.clearNotifications();
    showToast('Notification center cleared', 'info');
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        showToast,
        toasts,
        removeToast
      }}
    >
      {children}
      {/* Toast Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map(toast => {
          const bgColors = {
            success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20',
            error: 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20',
            warning: 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20',
            info: 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30'
          }[toast.type];

          const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠️',
            info: 'ℹ️'
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-xl text-sm font-medium transition-all transform duration-200 animate-in slide-in-from-bottom-3 ${bgColors}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-base">{icons}</span>
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-xs opacity-75 hover:opacity-100 transition-opacity p-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
