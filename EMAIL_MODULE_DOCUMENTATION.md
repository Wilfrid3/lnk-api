# Email Module Documentation

This documentation explains how to set up and use the email functionality in the LNK API.

## Overview

The email module provides functionality for:
- Sending email verification codes during user registration
- Verifying email addresses with codes
- Sending custom emails with HTML templates
- Managing email verification states

## Setup

### 1. Environment Variables

Add the following SMTP configuration variables to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=LNK App
```

### 2. SMTP Configuration Examples

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
```

## API Endpoints

### 1. Send Email Verification Code

**Endpoint:** `POST /auth/send-email-verification`

**Description:** Sends a verification code to the specified email address.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Email verification code sent successfully"
}
```

**Example Usage:**
```bash
curl -X POST http://localhost:3000/auth/send-email-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### 2. Verify Email Address

**Endpoint:** `POST /auth/verify-email`

**Description:** Verifies an email address using the provided verification code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Email verified successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "isEmailVerified": true,
    // ... other user fields
  }
}
```

**Example Usage:**
```bash
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'
```

## Integration with Registration

During user registration, if an email is provided, the system will automatically:

1. Send a phone verification code (existing functionality)
2. Send an email verification code (new functionality)

**Registration Request Example:**
```json
{
  "phoneNumber": "+237612345678",
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123"
}
```

**Registration Response:**
```json
{
  "message": "User registered successfully. Phone verification code sent, Email verification code sent.",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "+237612345678",
    "email": "user@example.com",
    "isPhoneVerified": false,
    "isEmailVerified": false,
    // ... other user fields
  }
}
```

## Email Templates

The system includes pre-built HTML email templates:

### 1. Verification Code Template
- Professional design with LNK branding
- Clear verification code display
- Expiration time warning
- Mobile-responsive layout

### 2. Welcome Email Template
- Sent after successful email verification
- Welcome message with app features
- Professional styling

## Email Service Usage

### In Your Services

You can inject and use the email services in your own modules:

```typescript
import { EmailService } from '../email/email.service';
import { EmailVerificationService } from '../email/email-verification.service';

@Injectable()
export class YourService {
  constructor(
    private emailService: EmailService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  async sendCustomEmail() {
    await this.emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Custom Email',
      html: '<h1>Hello World</h1>',
      text: 'Hello World',
    });
  }

  async sendVerificationCode() {
    await this.emailVerificationService.sendVerificationCode(
      'user@example.com',
      'John Doe'
    );
  }
}
```

### Custom Email Templates

You can extend the EmailService to add custom templates:

```typescript
// In your custom service
async sendCustomTemplate(email: string, data: any) {
  const html = this.generateCustomTemplate(data);
  
  return this.emailService.sendEmail({
    to: email,
    subject: 'Custom Subject',
    html,
  });
}

private generateCustomTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Hello ${data.name}</h1>
        <p>${data.message}</p>
      </body>
    </html>
  `;
}
```

## Verification Code Management

### Code Properties
- **Length:** 6 digits
- **Expiration:** 10 minutes
- **Attempts:** Maximum 3 attempts per code
- **Auto-cleanup:** Expired codes are automatically removed

### Security Features
- Codes are automatically deleted after use
- Failed verification attempts are tracked
- Codes expire after 10 minutes
- Email verification is separate from phone verification

## Database Schema

### EmailVerification Collection
```javascript
{
  _id: ObjectId,
  email: String,           // Email address
  code: String,            // 6-digit verification code
  expiresAt: Date,         // Expiration timestamp
  isUsed: Boolean,         // Whether the code has been used
  attempts: Number,        // Number of verification attempts
  maxAttempts: Number,     // Maximum allowed attempts (default: 3)
  createdAt: Date,         // Auto-generated
  updatedAt: Date          // Auto-generated
}
```

### User Schema Updates
The user schema includes email verification status:
```javascript
{
  email: String,           // Email address (unique, sparse)
  isEmailVerified: Boolean, // Email verification status (default: false)
  // ... other fields
}
```

## Error Handling

### Common Error Responses

#### Invalid Email Format
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

#### User Not Found
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

#### Invalid Verification Code
```json
{
  "statusCode": 401,
  "message": "Invalid verification code",
  "error": "Unauthorized"
}
```

#### Expired Verification Code
```json
{
  "statusCode": 401,
  "message": "Verification code has expired",
  "error": "Unauthorized"
}
```

#### SMTP Configuration Error
```json
{
  "statusCode": 400,
  "message": "Failed to send verification email",
  "error": "Bad Request"
}
```

## Testing

### Manual Testing with cURL

1. **Register a user with email:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+237612345678",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

2. **Check your email for verification code**

3. **Verify the email:**
```bash
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Testing Email Service
You can test the email service independently:

```typescript
// In a test file or development endpoint
@Get('test-email')
async testEmail() {
  return this.emailService.sendEmail({
    to: 'test@example.com',
    subject: 'Test Email',
    html: '<h1>Test</h1>',
    text: 'Test',
  });
}
```

## Troubleshooting

### SMTP Connection Issues
1. Check SMTP credentials in `.env` file
2. Verify SMTP server settings
3. Check firewall/network restrictions
4. For Gmail, use App Passwords instead of regular passwords

### Email Not Received
1. Check spam/junk folder
2. Verify email address is correct
3. Check SMTP logs in application console
4. Test with a different email provider

### Verification Code Issues
1. Codes expire after 10 minutes
2. Maximum 3 attempts per code
3. Codes are case-sensitive
4. Each code can only be used once

## Production Considerations

### SMTP Security
- Use environment variables for SMTP credentials
- Use App Passwords for Gmail
- Consider using dedicated email services (SendGrid, AWS SES, etc.)
- Enable TLS/SSL for SMTP connections

### Rate Limiting
Consider implementing rate limiting for:
- Email verification code requests
- Email verification attempts
- Failed verification attempts

### Monitoring
Monitor:
- Email delivery rates
- SMTP connection failures
- Verification code usage patterns
- Failed verification attempts

## Future Enhancements

Potential future improvements:
- Integration with dedicated email services (SendGrid, AWS SES)
- Email template management system
- Advanced email analytics
- Bulk email functionality
- Email subscription management
- Rich text email editor
