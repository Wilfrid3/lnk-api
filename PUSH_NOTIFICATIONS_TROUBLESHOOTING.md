# Push Notifications Troubleshooting Guide

## 🚨 "Received unexpected response code" Error

This error typically occurs due to one of several common issues. Let's debug step by step.

## 🔍 Step 1: Run Diagnostics

First, let's check your setup:

```bash
# Check your VAPID configuration
npm run notifications:debug

# Check your database subscriptions
npm run notifications:check-subs
```

## 🔧 Step 2: Common Causes & Solutions

### 1. **Invalid VAPID Keys**
**Symptom:** "Received unexpected response code" with status 400
**Solution:**
```bash
# Generate new VAPID keys
npm run notifications:generate-vapid
```
Make sure to update your `.env` file with the new keys and restart your server.

### 2. **Malformed Subscription Data**
**Symptom:** Error when sending to specific subscriptions
**Check:** Run `npm run notifications:check-subs` to verify subscription format

**Expected format:**
```javascript
{
  endpoint: "https://fcm.googleapis.com/fcm/send/...",
  p256dh: "BKxX...",  // Should start with 'B' and be ~87 chars
  auth: "abc123..."   // Should be ~22 chars
}
```

### 3. **Browser-Specific Issues**
**Chrome/Edge:** Usually works well with FCM endpoints
**Firefox:** Uses Mozilla's push service
**Safari:** Requires additional setup on macOS/iOS

### 4. **Network/Firewall Issues**
- Corporate firewalls may block push service URLs
- VPN connections can interfere
- Check if requests to `fcm.googleapis.com` or `mozilla.com` are blocked

## 🧪 Step 3: Manual Testing

### Test with a specific subscription:

1. **Get your subscription data:**
```bash
npm run notifications:check-subs
```

2. **Copy the subscription details and test manually:**
```javascript
// Edit debug-push-notifications.js and replace testSubscription with your real data
const testSubscription = {
  endpoint: 'your_real_endpoint_here',
  keys: {
    p256dh: 'your_real_p256dh_here',
    auth: 'your_real_auth_here'
  }
};
```

3. **Run the debug script:**
```bash
npm run notifications:debug
```

## 🔄 Step 4: Browser Console Debugging

Open your browser's developer tools and check:

### Service Worker Console:
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(console.log);

// Check current subscription
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription().then(console.log)
);
```

### Test Browser Notification:
```javascript
// Test basic browser notification
new Notification('Test', { body: 'Browser notification test' });
```

## 🛠️ Step 5: Enhanced Logging

I've updated the NotificationsService to provide more detailed error information. After restarting your server, you should see more detailed error messages including:

- HTTP status codes
- Response headers
- Error bodies from push services
- Subscription endpoint details

## 📝 Step 6: Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check VAPID keys and subscription format |
| 401 | Unauthorized | Verify VAPID email and keys |
| 410 | Gone | Subscription expired, need to resubscribe |
| 413 | Payload Too Large | Reduce notification content size |
| 429 | Too Many Requests | Rate limited, wait and retry |

## 🔍 Step 7: Specific Chrome/FCM Debugging

For Chrome subscriptions (FCM endpoints), check:

1. **FCM Project Setup:**
   - You don't need a Firebase project for basic web push
   - VAPID keys should work with any FCM endpoint

2. **Subscription Validity:**
   - Chrome subscriptions can expire
   - Check if `getSubscription()` returns the same endpoint

3. **Content Encoding:**
   - Modern browsers expect 'aes128gcm' encoding
   - web-push library handles this automatically

## 🚀 Step 8: Quick Fix Checklist

- [ ] VAPID keys are properly set in `.env`
- [ ] Server restarted after setting VAPID keys
- [ ] Subscription exists in database and is active
- [ ] Browser notifications permission is granted
- [ ] Service worker is registered and active
- [ ] No firewall blocking push service URLs
- [ ] Trying on HTTPS (or localhost for testing)

## 🆘 Emergency Workaround

If push notifications still don't work, you can temporarily use browser notifications:

```javascript
// In your frontend, as a fallback
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification(title, {
    body: body,
    icon: icon
  });
}
```

## 📞 Getting More Help

If the issue persists, please provide:

1. Output from `npm run notifications:debug`
2. Output from `npm run notifications:check-subs`  
3. Browser console errors
4. Server logs with enhanced error messages
5. Your browser type and version

## 🎯 Next Steps

Once you identify the specific error:

1. **If it's VAPID keys:** Regenerate and update
2. **If it's subscription format:** Check database data
3. **If it's network:** Test from different network/browser
4. **If it's browser-specific:** Test across different browsers

The enhanced logging should now give you much more specific information about what's failing!
