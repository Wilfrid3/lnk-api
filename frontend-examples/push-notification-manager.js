// Frontend JavaScript for Push Notifications Integration
// Include this in your main application JavaScript

class PushNotificationManager {
  constructor(vapidPublicKey, apiBaseUrl = '') {
    this.vapidPublicKey = vapidPublicKey;
    this.apiBaseUrl = apiBaseUrl;
    this.swRegistration = null;
    this.isSubscribed = false;
  }

  // Initialize the push notification system
  async init() {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers are not supported');
        return false;
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return false;
      }

      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.swRegistration);

      // Check current subscription status
      await this.updateSubscriptionStatus();

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Check if user is currently subscribed
  async updateSubscriptionStatus() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = !(subscription === null);
      
      if (this.isSubscribed) {
        console.log('User is subscribed to push notifications');
      } else {
        console.log('User is not subscribed to push notifications');
      }

      return this.isSubscribed;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Subscribe user to push notifications
  async subscribe() {
    try {
      // Check notification permission
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Create push subscription
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('Push subscription created:', subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      this.isSubscribed = true;
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push service
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await this.removeSubscriptionFromServer(subscription);
        
        console.log('Successfully unsubscribed from push notifications');
      }

      this.isSubscribed = false;
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    const authToken = this.getAuthToken(); // Implement based on your auth system
    
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth'))
      },
      userAgent: navigator.userAgent
    };

    const response = await fetch(`${this.apiBaseUrl}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save subscription');
    }

    const result = await response.json();
    console.log('Subscription saved to server:', result);
    return result;
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(subscription) {
    const authToken = this.getAuthToken();
    
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${this.apiBaseUrl}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove subscription');
    }

    const result = await response.json();
    console.log('Subscription removed from server:', result);
    return result;
  }

  // Get user's subscription count
  async getSubscriptionCount() {
    const authToken = this.getAuthToken();
    
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${this.apiBaseUrl}/notifications/subscriptions/count`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get subscription count');
    }

    const result = await response.json();
    return result.data.count;
  }

  // Test welcome notification
  async sendTestWelcomeNotification() {
    const authToken = this.getAuthToken();
    
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${this.apiBaseUrl}/notifications/test/welcome`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send test notification');
    }

    const result = await response.json();
    console.log('Test notification sent:', result);
    return result;
  }

  // Utility methods
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Implement this method based on your authentication system
  getAuthToken() {
    // Example implementations:
    // return localStorage.getItem('authToken');
    // return document.cookie.match(/authToken=([^;]+)/)?.[1];
    // return this.authService.getToken();
    
    console.warn('getAuthToken() method needs to be implemented');
    return null;
  }
}

// Usage example:
/*
// Initialize the push notification manager
const pushManager = new PushNotificationManager(
  'YOUR_VAPID_PUBLIC_KEY_HERE', // Replace with your actual VAPID public key
  'http://localhost:3000' // Your API base URL
);

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const initialized = await pushManager.init();
  
  if (initialized) {
    console.log('Push notifications initialized successfully');
    
    // Example: Subscribe to notifications on button click
    document.getElementById('subscribe-btn').addEventListener('click', async () => {
      try {
        await pushManager.subscribe();
        alert('Subscribed to notifications!');
      } catch (error) {
        alert('Failed to subscribe: ' + error.message);
      }
    });

    // Example: Unsubscribe on button click
    document.getElementById('unsubscribe-btn').addEventListener('click', async () => {
      try {
        await pushManager.unsubscribe();
        alert('Unsubscribed from notifications!');
      } catch (error) {
        alert('Failed to unsubscribe: ' + error.message);
      }
    });

    // Example: Send test notification
    document.getElementById('test-btn').addEventListener('click', async () => {
      try {
        await pushManager.sendTestWelcomeNotification();
        alert('Test notification sent!');
      } catch (error) {
        alert('Failed to send test notification: ' + error.message);
      }
    });
  }
});
*/

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotificationManager;
}
