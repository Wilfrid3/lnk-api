require('dotenv').config();

console.log('Environment variable debug:');
console.log('SMTP_PASS raw:', JSON.stringify(process.env.SMTP_PASS));
console.log('SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'undefined');

// Test base64 encoding
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log('\nCredentials being used:');
console.log('User:', user);
console.log('Pass:', pass);

// Manual base64 encoding to see what should be sent
const expectedAuth = Buffer.from(`\0${user}\0${pass}`).toString('base64');
console.log('\nExpected AUTH PLAIN:', expectedAuth);

// Test with nodemailer
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: user,
    pass: pass
  },
  debug: true,
  logger: true
});

console.log('\nTesting with fresh transporter...');
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Success!');
  }
});
