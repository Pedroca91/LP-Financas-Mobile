// Firebase configuration for LP Finanças
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAii1PnWxaN5byf1D2nkKwjjtaCmiV1oks",
  authDomain: "lp-financas.firebaseapp.com",
  projectId: "lp-financas",
  storageBucket: "lp-financas.firebasestorage.app",
  messagingSenderId: "338326292722",
  appId: "1:338326292722:web:97058dd5beab1ca98aa86b"
};

const VAPID_KEY = "BEvlCsGguy6JPQRv3buI8e6lRPqSmwIDMprz8yqgVaIqVUIiHdZNAHwqZYrejkPy__wfJulzyIFUMGXocqM9w3I";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging = null;

// Check if browser supports notifications
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Initialize messaging only if supported
export const initializeMessaging = async () => {
  if (!isNotificationSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Error initializing messaging:', error);
    return null;
  }
};

// Request notification permission and get token
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Notifications not supported' };
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      if (!messaging) {
        messaging = getMessaging(app);
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token:', token);
        return { success: true, token };
      } else {
        return { success: false, error: 'No token received' };
      }
    } else {
      return { success: false, error: 'Permission denied' };
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return { success: false, error: error.message };
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
};

// Get current FCM token
export const getCurrentToken = async () => {
  if (!isNotificationSupported() || !messaging) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    return token;
  } catch (error) {
    console.error('Error getting current token:', error);
    return null;
  }
};

export { app, messaging };
