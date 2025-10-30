require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('Testing SMTP configuration:');
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`User: ${user}`);
  console.log(`Pass: ${pass ? '***hidden***' : 'NOT SET'}`);
  console.log('');

  // Test different configurations specifically for STARTTLS
  const configs = [
    {
      name: 'STARTTLS with requireTLS',
      config: {
        host,
        port: parseInt(port),
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
          servername: host
        },
        debug: true,
        logger: true
      }
    },
    {
      name: 'STARTTLS with explicit TLS options',
      config: {
        host,
        port: parseInt(port),
        secure: false,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
          servername: host,
          ciphers: 'SSLv3'
        },
        debug: true,
        logger: true
      }
    },
    {
      name: 'STARTTLS with LOGIN auth',
      config: {
        host,
        port: parseInt(port),
        secure: false,
        requireTLS: true,
        auth: {
          type: 'login',
          user,
          pass
        },
        tls: {
          rejectUnauthorized: false,
          servername: host
        },
        debug: true,
        logger: true
      }
    },
    {
      name: 'STARTTLS with PLAIN auth explicit',
      config: {
        host,
        port: parseInt(port),
        secure: false,
        requireTLS: true,
        auth: {
          type: 'plain',
          user,
          pass
        },
        tls: {
          rejectUnauthorized: false,
          servername: host
        },
        debug: true,
        logger: true
      }
    },
    {
      name: 'STARTTLS with modern TLS',
      config: {
        host,
        port: parseInt(port),
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
          servername: host,
          secureProtocol: 'TLSv1_2_method'
        },
        debug: true,
        logger: true
      }
    },
    {
      name: 'Basic STARTTLS (original)',
      config: {
        host,
        port: parseInt(port),
        secure: false,
        auth: { user, pass },
        debug: true,
        logger: true
      }
    }
  ];

  for (const testConfig of configs) {
    console.log(`\n=== Testing: ${testConfig.name} ===`);
    try {
      const transporter = nodemailer.createTransport(testConfig.config);
      
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
      
      // Try sending a test email
      console.log('Attempting to send test email...');
      const result = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
        to: 'test@example.com', // This will likely fail but we'll see the server response
        subject: 'Test Email',
        text: 'This is a test email'
      });
      
      console.log('✅ Email sending successful!', result.messageId);
      break; // Success, no need to test other configs
      
    } catch (error) {
      console.log('❌ FAILED:', error.message);
      if (error.code) {
        console.log('   Error code:', error.code);
      }
      if (error.response) {
        console.log('   Server response:', error.response);
      }
    }
  }
}

testSMTP().catch(console.error);
