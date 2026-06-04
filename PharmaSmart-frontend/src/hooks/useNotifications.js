import { useState, useEffect, useCallback, useRef } from 'react';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
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
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connecté');
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
          
          // Jouer un son ou afficher une alerte
          if (Notification.permission === 'granted') {
            new Notification(data.notification.titre, {
              body: data.notification.message,
              icon: '/images/logo-pharmasmart-navbar.png'
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
      console.log('WebSocket déconnecté');
      setConnected(false);
      
      // Reconnexion automatique après 5 secondes
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };

    wsRef.current = ws;
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

  return {
    notifications,
    unreadCount,
    connected,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead
  };
};

export default useNotifications;