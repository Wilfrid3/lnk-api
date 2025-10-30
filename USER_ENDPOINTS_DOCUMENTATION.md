# User Endpoints Documentation

This document provides comprehensive documentation for the user-related API endpoints that have been implemented and enhanced for guest access with proper pagination and filtering capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Endpoints Summary](#endpoints-summary)
- [Implementation Details](#implementation-details)
- [Security & Data Protection](#security--data-protection)
- [API Usage Examples](#api-usage-examples)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)

## 🔍 Overview

The user endpoints have been enhanced to provide comprehensive functionality for both authenticated users and guest visitors. All guest-accessible endpoints automatically sanitize sensitive user information to ensure data privacy and security.

### Key Features:
- ✅ Guest-accessible endpoints with proper data sanitization
- ✅ Comprehensive pagination support
- ✅ Advanced filtering capabilities
- ✅ Proper error handling and validation
- ✅ Swagger/OpenAPI documentation
- ✅ Featured/premium user discovery

## 📊 Endpoints Summary

| Endpoint | Method | Access | Description | Pagination | Filtering |
|----------|--------|--------|-------------|------------|-----------|
| `/users` | GET | 🌐 Guest | List all users | ✅ | ✅ |
| `/users/featured` | GET | 🌐 Guest | Featured/premium users | ✅ | ✅ |
| `/users/search` | GET | 🌐 Guest | Search users | ✅ | ✅ |
| `/users/:id` | GET | 🌐 Guest | Single user profile | ❌ | ❌ |
| `/users/:id/posts` | GET | 🌐 Guest | User's posts | ✅ | ✅ |
| `/users/:id/followers` | GET | 🌐 Guest | User's followers | ✅ | ❌ |
| `/users/:id/following` | GET | 🌐 Guest | Users being followed | ✅ | ❌ |
| `/users/:id/ratings` | GET | 🌐 Guest | User ratings | ✅ | ❌ |
| `/users/:id/stats` | GET | 🌐 Guest | User statistics | ❌ | ❌ |
| `/users/:id/view` | POST | 🌐 Guest | Track profile view | ❌ | ❌ |

🌐 = Guest accessible, 🔒 = Authentication required

## 🛠 Implementation Details

### 1. Enhanced GET /users

**Endpoint:** `GET /users`  
**Access:** Guest (Public)  
**Purpose:** Retrieve paginated list of all active users

#### Features:
- Guest accessible with data sanitization
- Pagination support (page, limit)
- Filtering by premium status, city, user type, etc.
- Sorting capabilities

#### Query Parameters:
```typescript
{
  page?: number = 1,           // Page number
  limit?: number = 10,         // Items per page (max 100)
  sortBy?: string = 'createdAt', // Sort field
  sortOrder?: 'asc' | 'desc' = 'desc', // Sort direction
  premium?: boolean,           // Filter premium users
  city?: string,              // Filter by city
  userType?: string,          // Filter by user type
  verified?: boolean,         // Filter verified users
  offerings?: string[],       // Filter by services offered
  clientType?: string,        // Filter by client type
}
```

### 2. New GET /users/featured

**Endpoint:** `GET /users/featured`  
**Access:** Guest (Public)  
**Purpose:** Retrieve featured/premium users with priority sorting

#### Features:
- Prioritizes premium users first, then verified users
- Guest accessible with data sanitization
- Full pagination and filtering support
- Same query parameters as regular user listing

#### Sorting Logic:
1. Premium users (`isPremium: true`) - highest priority
2. Verified users (`isVerified: true`) - second priority
3. Regular users - by creation date or specified sort field

### 3. Enhanced GET /users/:id

**Endpoint:** `GET /users/:id`  
**Access:** Guest (Public)  
**Purpose:** Retrieve single user profile information

#### Features:
- Guest accessible with automatic data sanitization
- Comprehensive error handling
- Returns detailed user profile excluding sensitive data

### 4. Existing GET /users/search (Enhanced Documentation)

**Endpoint:** `GET /users/search`  
**Access:** Guest (Public)  
**Purpose:** Advanced user search with multiple filter criteria

#### Features:
- Text search in name and bio
- Multiple filter combinations
- Comprehensive pagination
- Guest accessible

## 🔒 Security & Data Protection

### Data Sanitization for Guest Access

All guest-accessible endpoints use the `sanitizeUserForGuests()` method which removes:

```typescript
// Removed for guest access:
- password          // User password hash
- refreshToken      // JWT refresh tokens
- email             // Email address
- phoneNumber       // Phone number
- isAdmin           // Admin status flag
- firebaseUid       // Firebase authentication ID
```

### Retained Public Information:

```typescript
// Available to guests:
- id, name, avatar, age
- userType, city, bio
- isVerified, isPremium
- offerings, appearance, clientType
- createdAt, updatedAt
- profileViews, followers count
```

## 🚀 API Usage Examples

### 1. Get All Users with Pagination

```bash
GET /users?page=1&limit=20&sortBy=createdAt&sortOrder=desc

# Response
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Marie Dubois",
      "avatar": "https://example.com/avatar.jpg",
      "age": 25,
      "userType": "femme",
      "city": "Paris",
      "bio": "Professionnelle expérimentée...",
      "isVerified": true,
      "isPremium": false,
      "offerings": ["massage", "companionship"],
      "appearance": "Métis",
      "clientType": "homme",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 2. Get Premium Users Only

```bash
GET /users?premium=true&limit=10

# Or use the featured endpoint
GET /users/featured?limit=10
```

### 3. Search Users by Location and Type

```bash
GET /users/search?city=Lyon&userType=femme&verified=true&page=1&limit=15
```

### 4. Get User Profile

```bash
GET /users/507f1f77bcf86cd799439011

# Response
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Marie Dubois",
  "avatar": "https://example.com/avatar.jpg",
  "age": 25,
  "userType": "femme",
  "city": "Paris",
  "bio": "Professionnelle expérimentée...",
  "isVerified": true,
  "isPremium": false,
  "offerings": ["massage", "companionship"],
  "appearance": "Métis",
  "clientType": "homme",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:20:00Z"
  // Note: email, phone, password etc. are NOT included
}
```

### 5. Filter by Multiple Criteria

```bash
GET /users/search?offerings=massage&offerings=escort&city=Paris&minAge=21&maxAge=35&premium=true
```

## 📝 Response Formats

### Standard User List Response

```typescript
{
  users: UserProfile[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Single User Response

```typescript
{
  id: string,
  name: string,
  avatar?: string,
  age?: number,
  userType: string,
  city?: string,
  bio?: string,
  isVerified: boolean,
  isPremium: boolean,
  offerings?: string[],
  appearance?: string,
  clientType?: string,
  createdAt: string,
  updatedAt: string
  // Sensitive fields excluded for guest access
}
```

## ⚠️ Error Handling

### Common Error Responses

```typescript
// 400 Bad Request
{
  "statusCode": 400,
  "message": "Failed to retrieve users: Invalid pagination parameters",
  "error": "Bad Request"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "User with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}

// 422 Validation Error
{
  "statusCode": 422,
  "message": ["Page number must be at least 1"],
  "error": "Unprocessable Entity"
}
```

## 🔧 Service Layer Implementation

### New Service Methods Added

1. **`findAllWithPagination(queryDto: QueryUserDto)`**
   - Supports the enhanced GET /users endpoint
   - Handles pagination and filtering for guest access
   - Automatically excludes sensitive fields

2. **`findFeaturedUsers(queryDto: QueryUserDto)`**
   - Supports the new GET /users/featured endpoint
   - Prioritizes premium and verified users
   - Includes all filtering capabilities

### Database Query Optimization

- Uses MongoDB aggregation for efficient filtering
- Implements proper indexing on frequently queried fields
- Excludes sensitive fields at the database level for guest queries

## 📚 Swagger Documentation

All endpoints include comprehensive Swagger/OpenAPI documentation:

- Complete request/response schemas
- Parameter descriptions and validation rules
- Example requests and responses
- Error response documentation
- Authentication requirements clearly marked

Access the interactive API documentation at: `/api/docs`

## 🔄 Backward Compatibility

All changes maintain backward compatibility:

- Existing authenticated endpoints remain unchanged
- New guest endpoints added without breaking existing functionality
- Response formats consistent with existing patterns
- Error handling follows established conventions

## 🚦 Rate Limiting & Performance

### Recommendations for Production:

1. **Rate Limiting**: Implement rate limiting for guest endpoints
   ```typescript
   // Suggested limits:
   // GET /users: 100 requests/hour per IP
   // GET /users/search: 200 requests/hour per IP
   // GET /users/:id: 500 requests/hour per IP
   ```

2. **Caching**: Consider Redis caching for frequently accessed data
   ```typescript
   // Cache user lists for 5-10 minutes
   // Cache individual profiles for 1-2 minutes
   ```

3. **Database Indexing**: Ensure proper indexes on:
   - `isActive`, `isPremium`, `isVerified`
   - `city`, `userType`, `offerings`
   - `createdAt` for sorting

## 🎯 Usage Scenarios

### Frontend Integration Examples

1. **User Discovery Page**
   ```javascript
   // Get featured users for homepage
   const featuredUsers = await fetch('/api/users/featured?limit=12');
   
   // Get all users with filters
   const filteredUsers = await fetch('/api/users?city=Paris&premium=true&page=1');
   ```

2. **Search Functionality**
   ```javascript
   // Search users by name and location
   const searchResults = await fetch('/api/users/search?search=marie&city=lyon');
   ```

3. **Profile Pages**
   ```javascript
   // Get user profile for guest viewing
   const userProfile = await fetch(`/api/users/${userId}`);
   ```

## 📞 Support & Troubleshooting

### Common Issues:

1. **Empty Results**: Check filter parameters and ensure active users exist
2. **Pagination Issues**: Verify page and limit parameters are within valid ranges
3. **Missing Data**: Remember that guest endpoints exclude sensitive information by design

### Debug Mode:
Enable debug logging to troubleshoot query issues:

```typescript
// Set NODE_ENV=development for detailed query logs
```
