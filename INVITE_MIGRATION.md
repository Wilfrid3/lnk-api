# Invite Code Migration Guide

## Overview
This migration script adds invite code functionality to existing users who don't have the required fields. It will:

1. **Add `inviteCode`** - Generate unique 8-character alphanumeric codes for users missing them
2. **Add `inviteRewards`** - Initialize the rewards tracking structure for users missing it

## What gets updated

### For users missing `inviteCode`:
```javascript
{
  inviteCode: "ABC123XY" // Unique 8-character code
}
```

### For users missing `inviteRewards`:
```javascript
{
  inviteRewards: {
    totalInvitedUsers: 0,
    totalRewards: 0,
    currency: "FCFA"
  }
}
```

## How to run the migration

### Method 1: Using npm script (Recommended)
```bash
npm run migration:invite-codes
```

### Method 2: Using direct command
```bash
npm run cli add-invite-codes
```

### Method 3: Manual nest commander
```bash
npx nest-commander add-invite-codes
```

## What the script does

1. **Scans database** for users missing invite codes or invite rewards
2. **Generates unique codes** for each user (ensures no duplicates)
3. **Updates users** with missing fields only
4. **Provides detailed logs** of the process
5. **Verifies completion** after migration

## Sample Output

```
🚀 Starting invite codes migration...
📝 Found 150 users needing invite system updates

📝 Generated invite code ABC123XY for user 507f1f77bcf86cd799439011
💰 Added invite rewards structure for user 507f1f77bcf86cd799439011
✅ Updated user 507f1f77bcf86cd799439011

📊 Migration Summary:
   Users processed: 150
   Invite codes added: 120
   Invite rewards structures added: 30
   Errors: 0
   Total users checked: 150

🔍 Verifying migration...
✅ Migration completed successfully! All users now have complete invite system data.
```

## Safety Features

- **Non-destructive**: Only adds missing fields, never overwrites existing data
- **Unique codes**: Generates and validates uniqueness of invite codes
- **Error handling**: Continues processing even if individual users fail
- **Verification**: Confirms completion after migration
- **Detailed logging**: Shows exactly what was updated

## When to run

- **After deploying** invite code feature to production
- **Before enabling** invite functionality in the app
- **As maintenance** if data inconsistencies are detected

## Troubleshooting

### If migration fails:
1. Check database connection
2. Verify user has write permissions
3. Check for any validation errors in logs
4. Re-run the script (it's safe to run multiple times)

### If some users still missing data:
```bash
# Re-run the migration
npm run migration:invite-codes

# Or check manually in MongoDB
db.users.find({ 
  $or: [
    { inviteCode: { $exists: false } },
    { inviteRewards: { $exists: false } }
  ]
})
```

## Database Indexes

The migration will work with these existing indexes:
- `inviteCode: 1` (unique, sparse)
- `invitedBy: 1`

Make sure these indexes exist for optimal performance.
