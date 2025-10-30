# Adult Services Module

This module provides comprehensive management of adult services and service categories for the LNK API. It includes seeding capabilities, CRUD operations, and validation services.

## Features

- **Service Management**: Create, read, update, and delete adult services
- **Category Management**: Organize services into categories with icons and colors
- **Data Seeding**: Automated seeding of predefined services and categories
- **Validation**: Service ID validation for user packages
- **Admin Operations**: Administrative endpoints for service management

## Module Structure

```
src/modules/adult-services/
├── controllers/
│   ├── adult-services.controller.ts         # Public endpoints
│   └── adult-services-admin.controller.ts   # Admin endpoints
├── schemas/
│   ├── adult-service.schema.ts              # Service data model
│   └── service-category.schema.ts           # Category data model
├── services/
│   └── adult-services.service.ts            # Business logic
├── seeders/
│   └── adult-services.seeder.ts             # Database seeding
└── adult-services.module.ts                 # Module configuration
```

## API Endpoints

### Public Endpoints

#### GET /services
Get all available adult services and categories.

**Response:**
```json
{
  "services": [
    {
      "id": "massage",
      "label": "Massage",
      "category": "base",
      "icon": "🫶",
      "isActive": true,
      "sortOrder": 1
    }
  ],
  "categories": [
    {
      "id": "base",
      "label": "Services de base",
      "icon": "💎",
      "color": "#3B82F6",
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

#### GET /services/categories
Get all service categories.

**Response:**
```json
[
  {
    "id": "base",
    "label": "Services de base",
    "icon": "💎",
    "color": "#3B82F6",
    "isActive": true,
    "sortOrder": 1
  }
]
```

#### GET /services/category/:categoryId
Get services by category ID.

**Parameters:**
- `categoryId` (string): Category identifier (e.g., "base", "oral", "fetish")

**Response:**
```json
{
  "services": [
    {
      "id": "massage",
      "label": "Massage",
      "category": "base",
      "icon": "🫶",
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

### Admin Endpoints

#### GET /admin/services
Get all services (including inactive).

#### POST /admin/services
Create a new service.

#### PUT /admin/services/:serviceId
Update an existing service.

#### PUT /admin/services/:serviceId/toggle
Toggle service active status.

## Data Models

### AdultService Schema

```typescript
{
  id: string;           // Unique identifier (e.g., "massage")
  label: string;        // Display name (e.g., "Massage")
  category: string;     // Category ID reference
  icon?: string;        // Emoji icon
  isActive: boolean;    // Whether service is available
  sortOrder: number;    // Display order
  createdAt: Date;
  updatedAt: Date;
}
```

### ServiceCategory Schema

```typescript
{
  id: string;           // Unique identifier (e.g., "base")
  label: string;        // Display name (e.g., "Services de base")
  icon: string;         // Emoji icon
  color: string;        // Hex color code
  isActive: boolean;    // Whether category is available
  sortOrder: number;    // Display order
  createdAt: Date;
  updatedAt: Date;
}
```

## Database Collections

- **adult_services**: Stores individual services
- **service_categories**: Stores service categories

## Seeding

### Available Categories

1. **Services de base** (`base`)
   - Massage, Escort, Companionship, Dinner dates

2. **Services oraux** (`oral`)
   - Various oral services

3. **Services spécialisés** (`specialized`)
   - BDSM, Role-playing, Tantric massage

4. **Services fétichistes** (`fetish`)
   - Foot worship, Lingerie shows, etc.

5. **Services VIP** (`vip`)
   - Premium exclusive services

6. **Services de groupe** (`group`)
   - Couple services, group activities

### Seeding Command

```bash
npm run seed:adult-services
```

This command will:
- Create the collections if they don't exist
- Seed 6 categories with 36 total services
- Set proper sort orders and relationships

## Service Validation

The module provides validation services used by other modules:

### validateServiceIds(serviceIds: string[]): Promise<boolean>
Validates that all provided service IDs exist and are active.

### getInvalidServiceIds(serviceIds: string[]): Promise<string[]>
Returns array of invalid service IDs from the provided list.

## Integration

### User Service Packages

This module integrates with the Users module to validate service packages:

```typescript
// Example usage in user service packages
const invalidIds = await this.adultServicesService.getInvalidServiceIds(packageServices);
if (invalidIds.length > 0) {
  throw new BadRequestException(`Invalid service IDs: ${invalidIds.join(', ')}`);
}
```

### Module Dependencies

Add to your app module:

```typescript
@Module({
  imports: [
    // ... other imports
    AdultServicesModule,
  ],
})
export class AppModule {}
```

## Error Handling

The module provides proper error handling for:
- Invalid service IDs
- Missing categories
- Database connection issues
- Validation failures

## Security

- Public endpoints are read-only
- Admin endpoints require authentication (when guards are enabled)
- Input validation on all endpoints
- No sensitive data exposure

## Development Notes

- Services are referenced by their `id` field (string), not MongoDB `_id`
- Categories use color codes for UI theming
- Sort orders determine display sequence
- Soft deletion via `isActive` flag
- Automatic timestamps on all records

## CLI Integration

The module integrates with the centralized CLI system in `src/cli/` for seeding operations. The seeding command is available through the NestJS CLI runner system.
