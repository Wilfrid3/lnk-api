// Service Worker for Push Notifications
// Place this file in your frontend public folder as sw.js

const CACHE_NAME = 'lnk-app-v1';

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Failed to parse push data:', e);
    return;
  }

  const title = data.title || 'LNK Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    image: data.image,
    tag: data.tag || 'default',
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
    data: {
      url: data.url,
      originalData: data,
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/open-icon.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icons/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listen for notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Handle notification click
  const url = event.notification.data?.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (url && client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no existing window/tab, open a new one
        if (clients.openWindow) {
          const targetUrl = url || '/';
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Listen for notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
  
  // Optional: Track notification close events
  // You could send analytics data here
});

// Service Worker installation
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache opened');
        // Cache important assets
        return cache.addAll([
          '/',
          '/icons/icon-192x192.png',
          '/icons/badge-72x72.png',
        ]);
      })
  );
});

// Service Worker activation
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Optional: Background sync for offline functionality
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle background sync
  }
});

// Optional: Handle push subscription changes
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // Replace with your actual public key
    }).then(function(newSubscription) {
      // Send new subscription to your server
      return fetch('/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getStoredAuthToken() // Implement this function
        },
        body: JSON.stringify({
          endpoint: newSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(newSubscription.getKey('p256dh')),
            auth: arrayBufferToBase64(newSubscription.getKey('auth'))
          }
        })
      });
    })
  );
});

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to get stored auth token
function getStoredAuthToken() {
  // Implement this based on your auth system
  // This could read from IndexedDB, localStorage, etc.
  return null;
}
