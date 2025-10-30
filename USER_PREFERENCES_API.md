# User Preferences and Rates API Documentation

## New User Schema Fields

The User model now includes the following additional fields for preferences and rates:

- `clientType`: String (optional) - Who they accept as clients
- `appearance`: String (optional) - Physical appearance description  
- `offerings`: Array of Strings (optional) - Services offered
- `hourlyRate`: Number (optional) - Price per hour in FCFA (minimum: 0)
- `halfDayRate`: Number (optional) - Half day rate in FCFA (minimum: 0)
- `fullDayRate`: Number (optional) - Full day rate in FCFA (minimum: 0)
- `weekendRate`: Number (optional) - Weekend rate in FCFA (minimum: 0)
- `availabilityHours`: String (optional) - Schedule information
- `specialServices`: String (optional) - Custom services description
- `paymentMethods`: Array of Strings (optional) - Accepted payment methods
- `additionalNotes`: String (optional) - Extra conditions/information

## New API Endpoints

### Update Preferences and Rates
```
PATCH /users/profile/preferences-rates
```

**Headers:**
- `Authorization`: Bearer [JWT token]
- `Content-Type`: application/json

**Request Body Example:**
```json
{
  "clientType": "couples",
  "appearance": "Grande, brune, yeux verts",
  "offerings": ["massage", "accompagnement", "diner"],
  "hourlyRate": 15000,
  "halfDayRate": 50000,
  "fullDayRate": 100000,
  "weekendRate": 120000,
  "availabilityHours": "Lundi-Vendredi 9h-17h, Weekend sur demande",
  "specialServices": "Services personnalisés selon demande",
  "paymentMethods": ["cash", "mobile_money", "bank_transfer"],
  "additionalNotes": "Discrétion assurée, déplacements possibles"
}
```

**Response:**
Returns the updated user object with all fields including the new preferences and rates.

### Avatar Upload
```
PATCH /users/profile/avatar
```

**Headers:**
- `Authorization`: Bearer [JWT token]
- `Content-Type`: multipart/form-data

**Body:**
- `avatar`: Image file (JPG, PNG, WEBP, max 5MB)

### Cover Image Upload
```
PATCH /users/profile/cover
```

**Headers:**
- `Authorization`: Bearer [JWT token]
- `Content-Type`: multipart/form-data

**Body:**
- `cover`: Image file (JPG, PNG, WEBP, max 5MB)

## Updated Endpoints

### Get Current User Information
```
GET /auth/me
```

**Headers:**
- `Authorization`: Bearer [JWT token]

**Response:**
Returns the complete user object including all new preferences and rates fields.

### Update User Profile
```
PATCH /users/profile
```

This endpoint continues to work as before for updating basic profile information (name, email, bio, etc.).

## File Storage

- Avatar images are stored in: `/upload/avatars/`
- Cover images are stored in: `/upload/covers/`
- File naming convention: `[type]-[userId]-[uuid][extension]`

## Validation Rules

- All rate fields (hourlyRate, halfDayRate, fullDayRate, weekendRate) must be positive numbers
- Array fields (offerings, paymentMethods) must contain only strings
- Image files must be JPG, PNG, or WEBP format with maximum size of 5MB
- When updating preferences/rates, only provided fields are updated (partial updates supported)
