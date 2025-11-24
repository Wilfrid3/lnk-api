# Forgot Password System Documentation

## Overview

The forgot password system allows users to reset their password by receiving a secure reset link via email. The system is implemented with security best practices and includes professional French email templates.

## Architecture

The forgot password system consists of:

1. **Forgot Password Endpoint** (`POST /auth/forgot-password`)
2. **Reset Password Endpoint** (`POST /auth/reset-password`)
3. **Email Service** (SMTP configuration)
4. **Email Templates** (French language, professional styling)
5. **JWT Token Security** (30-minute expiration)

## API Endpoints

### 1. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Sends a password reset email to the user if the email exists in the system.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

**Security Features:**
- Always returns the same message regardless of whether email exists (prevents email enumeration)
- Generates secure JWT token with 30-minute expiration
- Token includes user ID, email, and reset type for validation

### 2. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Resets the user's password using a valid reset token.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully"
}
```

**Security Validations:**
- Token must be valid and not expired
- Token type must be 'password_reset'
- User must exist in database
- Email in token must match user's email
- Password is hashed before storage

## Email Templates

The system includes professionally designed French email templates:

### HTML Template (`password-reset.hbs`)
- Responsive design
- YamoHub branding
- Clear call-to-action button
- Security warnings
- Fallback text link

### Text Template (`password-reset-text.hbs`)
- Plain text version for email clients that don't support HTML
- Contains all essential information
- Professional formatting

### Template Variables
- `{{greeting}}` - Personalized greeting with user's name
- `{{resetLink}}` - The complete reset link with token
- `{{expiresInMinutes}}` - Token expiration time (30 minutes)

## Frontend Integration

### Reset Link Format
```
http://localhost:3000/reset-password?token=<JWT_TOKEN>
```

### Frontend Flow
1. User receives email with reset link
2. User clicks link and is redirected to frontend reset password page
3. Frontend extracts token from URL query parameter
4. User enters new password in form
5. Frontend sends POST request to `/api/auth/reset-password` with token and new password

### Frontend Implementation Example
```javascript
// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

// Submit reset password form
const resetPassword = async (newPassword) => {
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: resetToken,
        newPassword: newPassword,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      // Password reset successful
      console.log('Password reset successful:', result.message);
      // Redirect to login page
      window.location.href = '/login';
    } else {
      // Handle error
      console.error('Password reset failed:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Email Configuration (already configured)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=
```

## Security Features

1. **Token Expiration:** Reset tokens expire in 30 minutes
2. **Token Validation:** Multiple layers of token validation
3. **Email Privacy:** No email enumeration (same response for existing/non-existing emails)
4. **Password Hashing:** New passwords are properly hashed before storage
5. **Type Checking:** Tokens must be of type 'password_reset'
6. **User Verification:** Email in token must match user's actual email

## Error Handling

### Common Error Responses

**Invalid or Expired Token:**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired reset token"
}
```

**User Not Found:**
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

**Invalid Token Type:**
```json
{
  "statusCode": 400,
  "message": "Invalid reset token"
}
```

## Testing

### Manual Testing

1. **Test with PowerShell:**
   ```powershell
   .\test_forgot_password.ps1
   ```

2. **Test with curl:**
   ```bash
   # Forgot password
   curl -X POST http://localhost:3001/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'

   # Reset password (with valid token)
   curl -X POST http://localhost:3001/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"VALID_TOKEN_HERE","newPassword":"newPassword123"}'
   ```

### End-to-End Testing Flow

1. Register a user or ensure you have a user with an email in the system
2. Call forgot password endpoint with that email
3. Check email inbox for reset link
4. Extract token from the email link
5. Use the token to reset the password
6. Verify you can login with the new password

## Production Considerations

1. **Rate Limiting:** Consider adding rate limiting to prevent abuse
2. **Email Deliverability:** Ensure SMTP configuration is properly set up for production
3. **Frontend URL:** Update `FRONTEND_URL` environment variable for production domain
4. **Token Security:** JWT secret should be strong and unique in production
5. **Email Templates:** Templates are already production-ready with professional styling

## Related Endpoints

- `POST /auth/change-password` - Change password for authenticated users
- `POST /auth/send-email-verification` - Send email verification code
- `POST /auth/verify-email` - Verify email with code

## Dependencies

- `@nestjs/jwt` - JWT token handling
- `nodemailer` - Email sending
- `handlebars` - Email template rendering
- `bcrypt` - Password hashing (via auth service)
