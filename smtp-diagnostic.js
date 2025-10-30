require('dotenv').config();

console.log('=== SMTP Configuration Diagnostic ===\n');

console.log('Current Configuration:');
console.log(`Host: ${process.env.SMTP_HOST}`);
console.log(`Port: ${process.env.SMTP_PORT}`);
console.log(`User: ${process.env.SMTP_USER}`);
console.log(`Pass: ${process.env.SMTP_PASS ? '[SET]' : '[NOT SET]'}`);
console.log(`From: ${process.env.SMTP_FROM}`);
console.log(`From Name: ${process.env.SMTP_FROM_NAME}`);

console.log('\n=== Troubleshooting Steps ===\n');

console.log('1. VERIFY EMAIL ACCOUNT:');
console.log('   - Log into your mail server admin panel');
console.log('   - Confirm no-reply@yamozone.com exists');
console.log('   - Check if SMTP/authentication is enabled for this account');

console.log('\n2. TEST WITH DIFFERENT ACCOUNT:');
console.log('   - Try with your main admin email account');
console.log('   - Update SMTP_USER and SMTP_PASS temporarily');

console.log('\n3. CHECK SERVER SETTINGS:');
console.log('   - Verify port 587 is open for SMTP');
console.log('   - Check if your server IP is whitelisted');
console.log('   - Look for any authentication restrictions');

console.log('\n4. ALTERNATIVE CONFIGURATION:');
console.log('   If your server supports it, try:');
console.log('   - Port 465 with SSL (set SMTP_PORT=465)');
console.log('   - Port 25 without encryption (set SMTP_PORT=25)');

console.log('\n5. TEMPORARY WORKAROUND:');
console.log('   Consider using a reliable email service:');
console.log('   - Gmail SMTP (smtp.gmail.com:587)');
console.log('   - SendGrid (smtp.sendgrid.net:587)');
console.log('   - Mailgun (smtp.mailgun.org:587)');

console.log('\n=== Next Steps ===');
console.log('1. Check your mail server admin panel for the no-reply account');
console.log('2. Try authentication with your main email account');
console.log('3. Check server logs for more detailed error messages');
console.log('4. If needed, I can help you set up Gmail or SendGrid as backup');
