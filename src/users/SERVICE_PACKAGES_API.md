# User Service Packages API

This module provides CRUD operations for user service packages that reference the adult services seeded in the database.

## Endpoints

### GET /users/profile/packages
Get all service packages for the authenticated user.

**Response:**
```json
{
  "packages": [
    {
      "_id": "package_id",
      "title": "Package Premium",
      "services": ["massage", "escort"],
      "price": 150,
      "currency": "FCFA",
      "duration": "2 hours",
      "description": "Complete premium service package",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /users/profile/packages
Create a new service package.

**Request Body:**
```json
{
  "title": "Package Premium",
  "services": ["massage", "escort"],
  "price": 150,
  "currency": "FCFA",
  "duration": "2 hours",
  "description": "Complete premium service package",
  "isActive": true
}
```

**Response:**
```json
{
  "package": {
    "_id": "generated_id",
    "title": "Package Premium",
    "services": ["massage", "escort"],
    "price": 150,
    "currency": "FCFA",
    "duration": "2 hours",
    "description": "Complete premium service package",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /users/profile/packages/:packageId
Update an existing service package.

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Package",
  "services": ["massage", "escort", "companionship"],
  "price": 200
}
```

### DELETE /users/profile/packages/:packageId
Delete a service package.

**Response:**
```json
{
  "message": "Package deleted successfully"
}
```

### PATCH /users/profile/preferences-rates
Update user preferences and rates, including service packages.

**Request Body:** (All fields optional)
```json
{
  "clientType": "couples",
  "appearance": "Grande, brune, yeux verts",
  "offerings": ["massage", "escort"],
  "hourlyRate": 15000,
  "servicePackages": [
    {
      "title": "Package Premium",
      "services": ["massage", "escort"],
      "price": 150,
      "currency": "FCFA",
      "duration": "2 hours",
      "description": "Complete premium service package",
      "isActive": true
    }
  ]
}
```

## Validation Rules

### Service Packages:
- **title**: Required string
- **services**: Required array of service IDs (max 6, no duplicates)
- **price**: Required positive number
- **currency**: Optional enum ['FCFA', 'EUR', 'USD'] (default: 'FCFA')
- **duration**: Optional string
- **description**: Optional string
- **isActive**: Optional boolean (default: true)

### Service ID Validation:
- All service IDs must exist in the `adult_services` collection
- All services must be active (`isActive: true`)
- No duplicate service IDs within a package
- Maximum 6 services per package

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid service IDs: invalid_service_id. Please check that these services exist and are active."
}
```

```json
{
  "statusCode": 400,
  "message": "Duplicate services found: massage. Each service can only be included once per package."
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Package not found"
}
```

## Authentication
All endpoints require JWT authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Implementation Details

### Database Storage
- Service packages are stored as embedded documents in the User collection
- Each package has a unique ObjectId as `_id`
- Automatic timestamps for `createdAt` and `updatedAt`

### Service Integration
- Uses `AdultServicesService` to validate service IDs
- Ensures atomic operations for user updates
- Maintains data consistency with service availability

### Security
- JWT-based authentication required for all operations
- User ownership validation (users can only manage their own packages)
- Input validation and sanitization
- Proper error handling and logging
