import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [newNotification, setNewNotification] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Fermer la connexion existante
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Créer une nouvelle connexion WebSocket
    const wsUrl = `ws://127.0.0.1:8000/ws/notifications/?token=${token}`;
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔔 WebSocket notifications connecté');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'initial':
            setNotifications(data.notifications);
            setUnreadCount(data.count);
            break;
            
          case 'new_notification':
            setNotifications(prev => [data.notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            setNewNotification(data.notification);
            
            // Réinitialiser après 5 secondes
            setTimeout(() => setNewNotification(null), 5000);
            
            // Notification du navigateur
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(data.notification.titre, {
                body: data.notification.message,
                icon: '/favicon.ico'
              });
            }
            break;
            
          case 'marked_read':
            setNotifications(prev =>
              prev.map(n =>
                n.id === data.notification_id ? { ...n, is_read: true } : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            break;
            
          case 'all_marked_read':
            setNotifications(prev =>
              prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
            break;
            
          case 'count':
            setUnreadCount(data.count);
            break;
            
          default:
            break;
        }
      };

      ws.onclose = () => {
        console.log('🔔 WebSocket notifications déconnecté');
        setConnected(false);
        
        // Reconnexion automatique après 5 secondes
        reconnectTimeoutRef.current = setTimeout(() => {
          const token = localStorage.getItem('access_token');
          if (token) {
            connect();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Erreur connexion WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback((notificationId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'mark_read',
        notification_id: notificationId
      }));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'mark_all_read'
      }));
    }
  }, []);

  const clearNewNotification = useCallback(() => {
    setNewNotification(null);
  }, []);

  // Demander la permission pour les notifications du navigateur
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Se connecter automatiquement si authentifié
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value = {
    notifications,
    unreadCount,
    connected,
    newNotification,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearNewNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;