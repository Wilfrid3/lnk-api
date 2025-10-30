/**
 * Migration script to add invite code fields to existing users
 * Run this script to update all existing users with:
 * - inviteCode: unique 8-character alphanumeric code
 * - inviteRewards: object with default values
 * 
 * Usage:
 * node src/migrations/add-invite-codes.js
 */

const { MongoClient } = require('mongodb');

// Configuration - Update these values according to your environment
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lnk-database';
const DATABASE_NAME = process.env.DATABASE_NAME || 'lnk-database';
const COLLECTION_NAME = 'users';

/**
 * Generate a unique 8-character alphanumeric invite code
 */
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Check if invite code already exists in the database
 */
async function isInviteCodeUnique(collection, inviteCode) {
  const existingUser = await collection.findOne({ inviteCode });
  return !existingUser;
}

/**
 * Generate a unique invite code that doesn't exist in the database
 */
async function generateUniqueInviteCode(collection) {
  let isUnique = false;
  let inviteCode = '';

  while (!isUnique) {
    inviteCode = generateInviteCode();
    isUnique = await isInviteCodeUnique(collection, inviteCode);
  }

  return inviteCode;
}

/**
 * Main migration function
 */
async function migrateInviteCodes() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log('📊 Checking users without invite codes...');
    
    // Find users that don't have invite codes
    const usersWithoutInviteCodes = await collection.find({
      $or: [
        { inviteCode: { $exists: false } },
        { inviteCode: null },
        { inviteCode: '' }
      ]
    }).toArray();

    console.log(`📝 Found ${usersWithoutInviteCodes.length} users without invite codes`);

    if (usersWithoutInviteCodes.length === 0) {
      console.log('✅ All users already have invite codes!');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutInviteCodes) {
      try {
        // Generate unique invite code
        const inviteCode = await generateUniqueInviteCode(collection);

        // Prepare update object
        const updateDoc = {
          $set: {
            inviteCode: inviteCode,
            // Only set inviteRewards if it doesn't exist
            ...((!user.inviteRewards) && {
              inviteRewards: {
                totalInvitedUsers: 0,
                totalRewards: 0,
                currency: 'YZ'
              }
            })
          }
        };

        // Update the user
        const result = await collection.updateOne(
          { _id: user._id },
          updateDoc
        );

        if (result.modifiedCount === 1) {
          processedCount++;
          console.log(`✅ Updated user ${user._id} with invite code: ${inviteCode}`);
        } else {
          console.log(`⚠️  User ${user._id} was not updated`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating user ${user._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Users processed: ${processedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total users found: ${usersWithoutInviteCodes.length}`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingUsers = await collection.find({
      $or: [
        { inviteCode: { $exists: false } },
        { inviteCode: null },
        { inviteCode: '' }
      ]
    }).count();

    if (remainingUsers === 0) {
      console.log('✅ Migration completed successfully! All users now have invite codes.');
    } else {
      console.log(`⚠️  Migration incomplete. ${remainingUsers} users still need invite codes.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔒 Database connection closed');
  }
}

/**
 * Run migration with error handling
 */
async function runMigration() {
  console.log('🚀 Starting invite codes migration...');
  console.log(`📍 Database: ${DATABASE_NAME}`);
  console.log(`📍 Collection: ${COLLECTION_NAME}`);
  console.log(`📍 MongoDB URI: ${MONGO_URI.replace(/\/\/.*:.*@/, '//***:***@')}\n`);

  try {
    await migrateInviteCodes();
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateInviteCodes,
  generateUniqueInviteCode,
  generateInviteCode
};
