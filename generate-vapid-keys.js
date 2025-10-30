const webpush = require('web-push');

console.log('Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=======================================');
console.log('VAPID Keys Generated Successfully!');
console.log('=======================================\n');

console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_EMAIL=your_email@example.com\n');

console.log('Public Key (for frontend):');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key (keep secret):');
console.log(vapidKeys.privateKey);
console.log('\n=======================================');
console.log('IMPORTANT: Keep your private key secure!');
console.log('=======================================');
