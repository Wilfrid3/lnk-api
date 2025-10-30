require('dotenv').config();
const nodemailer = require('nodemailer');

async function simpleTest() {
  console.log('Environment variables:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length);
  console.log('SMTP_PASS:', process.env.SMTP_PASS);
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false,
      servername: process.env.SMTP_HOST
    }
  });

  try {
    console.log('Testing connection...');
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          reject(error);
        } else {
          resolve(success);
        }
      });
    });
    console.log('✅ SUCCESS: SMTP connection verified!');
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    console.log('Error code:', error.code);
    console.log('Response:', error.response);
  }
}

simpleTest().catch(console.error);
