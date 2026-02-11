import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Register Service Worker for PWA
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Register main PWA service worker
      const swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('PWA Service Worker registered:', swRegistration.scope);

      // Check for updates
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              console.log('New content available, please refresh.');
              // Show update notification if needed
              if (window.confirm('Nova versão disponível! Deseja atualizar?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Initialize app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// Register service worker after app loads
if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
  registerServiceWorker();
} else {
  // Also register in development for testing
  registerServiceWorker();
}
