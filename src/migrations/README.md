# Invite Code Migration Scripts

This directory contains migration scripts to add invite code functionality to existing users in the database.

## Available Migration Scripts

### 1. NestJS CLI Command (Recommended)
Uses the existing NestJS CLI infrastructure with proper dependency injection.

**Usage:**
```bash
npm run migration:add-invite-codes
```

**Features:**
- Uses NestJS dependency injection
- Proper error handling
- Progress tracking
- Verification after migration
- Integrates with existing app configuration

### 2. Standalone JavaScript Script
Direct MongoDB connection without NestJS overhead.

**Usage:**
```bash
# Configure environment variables first
export MONGO_URI="mongodb://localhost:27017/lnk-database"
export DATABASE_NAME="lnk-database"

# Run the migration
npm run migration:add-invite-codes-js
```

**Features:**
- Faster execution (no NestJS bootstrap)
- Direct MongoDB operations
- Can run independently of NestJS app
- Useful for production environments

### 3. TypeScript Standalone Script
Uses NestJS but runs as standalone application.

**Usage:**
```bash
# Build first
npm run build

# Run the migration
node dist/migrations/add-invite-codes-nestjs.js
```

## What the Migration Does

1. **Finds users without invite codes**: Searches for users where `inviteCode` is missing, null, or empty
2. **Generates unique invite codes**: Creates 8-character alphanumeric codes (e.g., "ABC123XY")
3. **Adds invite rewards structure**: Initializes `inviteRewards` object with default values:
   ```json
   {
     "totalInvitedUsers": 0,
     "totalRewards": 0,
     "currency": "FCFA"
   }
   ```
4. **Verifies migration**: Counts remaining users without invite codes
5. **Reports progress**: Shows detailed progress and summary

## Sample Output

```
🚀 Starting invite codes migration...
📝 Found 150 users without invite codes
✅ Updated user 507f1f77bcf86cd799439011 with invite code: ABC123XY
✅ Updated user 507f1f77bcf86cd799439012 with invite code: DEF456ZW
...

📊 Migration Summary:
   Users processed: 150
   Errors: 0
   Total users found: 150

🔍 Verifying migration...
✅ Migration completed successfully! All users now have invite codes.
```

## Before Running Migration

1. **Backup your database** - Always backup before running migrations
2. **Test in development** - Run on a copy of production data first
3. **Check environment** - Ensure correct database connection
4. **Verify user count** - Note how many users exist before migration

## Environment Variables

For standalone scripts, you may need to configure:

```bash
# MongoDB connection
MONGO_URI="mongodb://localhost:27017/lnk-database"
DATABASE_NAME="lnk-database"

# Optional: Authentication (if required)
MONGODB_AUTH_SOURCE="admin"
```

## Error Handling

All scripts include:
- Individual user error handling (continues if one user fails)
- Transaction safety (each user update is atomic)
- Detailed error reporting
- Verification step to ensure completion

## Rollback

If you need to remove invite codes (not recommended after users start using them):

```javascript
// MongoDB shell command
db.users.updateMany(
  {},
  { 
    $unset: { 
      inviteCode: "", 
      inviteRewards: "" 
    } 
  }
)
```

## Production Recommendations

1. **Use the NestJS CLI command** for consistency with your app
2. **Run during low-traffic periods** to minimize impact
3. **Monitor the process** - scripts provide real-time progress
4. **Verify results** - all scripts include verification steps
5. **Keep logs** - save output for troubleshooting

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check MongoDB URI and credentials
   - Ensure database is accessible
   - Verify network connectivity

2. **Duplicate invite code errors**
   - Script automatically retries with new codes
   - Very unlikely with 8-character alphanumeric codes

3. **Permission errors**
   - Ensure database user has write permissions
   - Check MongoDB authentication settings

4. **Memory issues with large datasets**
   - Script processes users one by one to avoid memory issues
   - For very large datasets (>100k users), consider batching

### Getting Help

If you encounter issues:
1. Check the error messages in the console output
2. Verify database connectivity and permissions
3. Test with a small subset of users first
4. Check MongoDB logs for additional details
