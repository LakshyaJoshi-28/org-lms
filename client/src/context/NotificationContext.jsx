import React, { createContext, useContext, useState, useEffect } from 'react';
import { getNotifications as fetchNotificationsApi, markNotificationRead, markAllNotificationsRead } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const loadNotifications = async () => {
    if (!user || user.role === 'SuperAdmin') {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetchNotificationsApi();
      if (res.data && res.data.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'SuperAdmin') {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id, user?.role]);

  // Real-time listener for Socket.IO notifications
  useEffect(() => {
    if (!socket || !user || user.role === 'SuperAdmin') return;

    const handleNewNotification = (newNotif) => {
      if (!newNotif) return;
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      if (newNotif.title && newNotif.message) {
        addToast('info', newNotif.message, newNotif.title);
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, user]);

  const addToast = (type, message, title = '') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        removeToast,
        markAsRead,
        markAllRead,
        refreshNotifications: loadNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
