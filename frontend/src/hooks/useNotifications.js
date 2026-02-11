import { useState, useEffect, useCallback } from 'react';
import { 
  isNotificationSupported, 
  requestNotificationPermission, 
  onForegroundMessage,
  getCurrentToken
} from '../lib/firebase';

export function useNotifications() {
  const [permission, setPermission] = useState('default');
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const checkSupport = () => {
      const isSupported = isNotificationSupported();
      setSupported(isSupported);
      
      if (isSupported && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  useEffect(() => {
    // Listen for foreground messages
    if (supported && permission === 'granted') {
      const unsubscribe = onForegroundMessage((payload) => {
        // Show notification for foreground messages
        if (payload.notification) {
          const { title, body } = payload.notification;
          
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification(title || 'LP Finanças', {
              body: body || 'Você tem uma nova notificação',
              icon: '/logo192.png',
              badge: '/logo192.png',
            });
          }
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [supported, permission]);

  const enableNotifications = useCallback(async () => {
    if (!supported) {
      return { success: false, error: 'Notificações não suportadas neste navegador' };
    }

    setLoading(true);
    try {
      const result = await requestNotificationPermission();
      
      if (result.success) {
        setPermission('granted');
        setToken(result.token);
        
        // Save token to backend for sending notifications
        try {
          const backendUrl = process.env.REACT_APP_BACKEND_URL;
          const authToken = localStorage.getItem('token');
          
          if (authToken) {
            await fetch(`${backendUrl}/api/notifications/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ token: result.token })
            });
          }
        } catch (e) {
          console.log('Could not save token to backend:', e);
        }
        
        return { success: true, token: result.token };
      } else {
        setPermission('denied');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const getToken = useCallback(async () => {
    if (!supported || permission !== 'granted') return null;
    
    try {
      const currentToken = await getCurrentToken();
      if (currentToken) {
        setToken(currentToken);
      }
      return currentToken;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }, [supported, permission]);

  return {
    permission,
    token,
    loading,
    supported,
    enableNotifications,
    getToken,
    isEnabled: permission === 'granted',
  };
}

export default useNotifications;
