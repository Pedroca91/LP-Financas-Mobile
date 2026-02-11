import { useState, useEffect, useCallback } from 'react';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      setIsInstalled(e.matches);
    };
    
    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // Online/Offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return { success: false, error: 'Instalação não disponível' };
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setIsInstallable(false);

      if (outcome === 'accepted') {
        return { success: true };
      } else {
        return { success: false, error: 'Instalação cancelada' };
      }
    } catch (error) {
      console.error('Error installing app:', error);
      return { success: false, error: error.message };
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
  }, []);

  const clearCache = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type: 'CLEAR_CACHE' });
      }
    }
    
    // Also clear caches directly
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    updateAvailable,
    installApp,
    updateApp,
    clearCache,
  };
}

export default usePWA;
