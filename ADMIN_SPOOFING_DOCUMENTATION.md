# User Spoofing (Impersonation) System

This documentation describes the user spoofing functionality that allows administrators to impersonate other users for testing and support purposes.

## Overview

The spoofing system enables administrators to:
- Impersonate any non-admin user account
- Perform actions as the spoofed user
- Return to their admin account at any time
- Track spoofing sessions for security and auditing

## Security Features

- Only users with `isAdmin: true` can initiate spoofing
- Admins cannot spoof other admin accounts
- Original admin identity is preserved in JWT tokens
- Spoofing sessions are trackable and auditable

## Database Schema Changes

### User Schema
Added the following field to the User schema:
```typescript
@Prop({ default: false })
isAdmin: boolean;
```

## API Endpoints

### 1. Start Spoofing
**POST** `/auth/admin/start-spoofing`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Body:**
```json
{
  "targetUserId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "accessToken": "new_spoof_token",
  "refreshToken": "new_refresh_token",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Target User",
    "email": "target@example.com",
    "isSpoofing": true,
    "originalAdminId": "admin_user_id",
    // ... other user fields
  }
}
```

### 2. Stop Spoofing
**POST** `/auth/admin/stop-spoofing`

**Headers:**
- `Authorization: Bearer <spoof_token>`

**Response:**
```json
{
  "accessToken": "admin_token",
  "refreshToken": "admin_refresh_token",
  "user": {
    "_id": "admin_user_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "isAdmin": true,
    "isSpoofing": false,
    // ... other admin fields
  }
}
```

### 3. Get Spoofing Status
**GET** `/auth/admin/spoofing-status`

**Headers:**
- `Authorization: Bearer <current_token>`

**Response:**
```json
{
  "isSpoofing": true,
  "originalAdminId": "admin_user_id",
  "targetUserId": "507f1f77bcf86cd799439011"
}
```

## JWT Token Structure

### Normal User Token
```json
{
  "sub": "user_id",
  "userType": "user",
  "iat": 1625097600,
  "exp": 1625184000
}
```

### Spoofing Token
```json
{
  "sub": "target_user_id",
  "userType": "user",
  "originalUserId": "admin_user_id",
  "isSpoofing": true,
  "iat": 1625097600,
  "exp": 1625184000
}
```

## Guards and Middleware

### AdminGuard
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```
- Verifies the user has admin privileges
- Works with both normal admin tokens and spoofed admin tokens
- Checks the `originalUserId` when spoofing is active

### JwtAuthGuard (Enhanced)
- Validates spoofing tokens
- Ensures both target user and original admin are valid
- Prevents spoofing of admin accounts

## Setup Instructions

### 1. Make a User Admin
Use the CLI command to promote a user to admin:

```bash
npm run cli:make-admin <email_or_phone>
```

Example:
```bash
npm run cli:make-admin admin@example.com
npm run cli:make-admin +237123456789
```

### 2. Authentication Flow

#### For Admin Login:
1. Admin logs in normally
2. Receives standard JWT token
3. Can access admin endpoints

#### For Starting Spoofing:
1. Admin calls `/auth/admin/start-spoofing` with target user ID
2. System validates admin privileges
3. Returns new token with spoofing context
4. Admin now operates as the target user

#### For Stopping Spoofing:
1. Admin calls `/auth/admin/stop-spoofing`
2. System validates spoofing context
3. Returns admin token
4. Admin is back to normal admin session

## Usage Examples

### Frontend Implementation

```javascript
class AdminSpoofingService {
  constructor(apiClient) {
    this.api = apiClient;
    this.originalToken = null;
    this.spoofingToken = null;
  }

  async startSpoofing(targetUserId) {
    const response = await this.api.post('/auth/admin/start-spoofing', {
      targetUserId
    });
    
    this.originalToken = this.api.getAuthToken();
    this.spoofingToken = response.data.accessToken;
    this.api.setAuthToken(this.spoofingToken);
    
    return response.data;
  }

  async stopSpoofing() {
    const response = await this.api.post('/auth/admin/stop-spoofing');
    
    this.api.setAuthToken(response.data.accessToken);
    this.spoofingToken = null;
    
    return response.data;
  }

  isSpoofing() {
    return !!this.spoofingToken;
  }
}
```

### Backend Usage

```typescript
// In any protected endpoint
@Get('protected-action')
@UseGuards(JwtAuthGuard)
async protectedAction(@Request() req) {
  const user = req.user;
  
  if (user.isSpoofing) {
    console.log(\`Admin \${user.originalUserId} is spoofing user \${user.sub}\`);
  }
  
  // The action will be performed as the current user (spoofed or real)
  return await this.someService.performAction(user.sub);
}
```

## Testing

### Manual Testing Script
Use the provided test script:

```bash
node test_spoofing_functionality.js
```

### Test Scenarios

1. **Successful Spoofing Flow**
   - Admin logs in → Start spoofing → Perform actions → Stop spoofing

2. **Security Validations**
   - Non-admin tries to spoof (should fail)
   - Admin tries to spoof another admin (should fail)
   - Invalid target user ID (should fail)

3. **Token Validation**
   - Spoofing token works for user actions
   - Original admin token becomes invalid after spoofing starts
   - Admin token works after spoofing stops

## Security Considerations

1. **Audit Logging**: Consider logging all spoofing activities
2. **Time Limits**: Consider adding expiration times for spoofing sessions
3. **Permissions**: Limit which admins can spoof which users
4. **Notifications**: Consider notifying users when they are being spoofed
5. **Session Management**: Invalidate user sessions when spoofing starts

## Error Handling

### Common Error Responses

```json
// Admin access required
{
  "statusCode": 403,
  "message": "Admin access required"
}

// Target user not found
{
  "statusCode": 404,
  "message": "Target user not found"
}

// Cannot spoof admin
{
  "statusCode": 403,
  "message": "Cannot spoof other admin users"
}

// Not currently spoofing
{
  "statusCode": 400,
  "message": "User is not currently spoofing"
}
```

## Implementation Files

- **Auth Service**: `src/auth/auth.service.ts` - Core spoofing logic
- **Auth Controller**: `src/auth/auth.controller.ts` - API endpoints
- **JWT Strategy**: `src/auth/strategies/jwt.strategy.ts` - Token validation
- **Admin Guard**: `src/auth/guards/admin.guard.ts` - Admin permission check
- **User Schema**: `src/users/schemas/user.schema.ts` - isAdmin field
- **CLI Tool**: `src/cli/make-admin.ts` - Make users admin
- **Test Script**: `test_spoofing_functionality.js` - Testing functionality

This spoofing system provides a secure and auditable way for administrators to impersonate users while maintaining the integrity of the authentication system.
