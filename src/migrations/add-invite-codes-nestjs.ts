import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { getModelToken } from '@nestjs/mongoose';

/**
 * NestJS-based migration script to add invite codes to existing users
 *
 * Usage:
 * npm run build
 * node dist/migrations/add-invite-codes-nestjs.js
 */

async function runMigration() {
  console.log('🚀 Starting NestJS invite codes migration...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const usersService = app.get(UsersService);
    const userModel: Model<UserDocument> = app.get(getModelToken(User.name));

    console.log('📊 Checking users without invite codes...');

    // Find users that don't have invite codes
    const usersWithoutInviteCodes = await userModel
      .find({
        $or: [
          { inviteCode: { $exists: false } },
          { inviteCode: null },
          { inviteCode: '' },
        ],
      })
      .exec();

    console.log(
      `📝 Found ${usersWithoutInviteCodes.length} users without invite codes`,
    );

    if (usersWithoutInviteCodes.length === 0) {
      console.log('✅ All users already have invite codes!');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutInviteCodes) {
      try {
        // Generate unique invite code using the service method
        const inviteCode = await generateUniqueInviteCode(userModel);

        // Prepare update object
        const updateDoc: any = {
          inviteCode: inviteCode,
        };

        // Only set inviteRewards if it doesn't exist
        if (!user.inviteRewards) {
          updateDoc.inviteRewards = {
            totalInvitedUsers: 0,
            totalRewards: 0,
            currency: 'YZ',
          };
        }

        // Update the user
        const result = await userModel.updateOne(
          { _id: user._id },
          { $set: updateDoc },
        );

        if (result.modifiedCount === 1) {
          processedCount++;
          console.log(
            `✅ Updated user ${user._id} with invite code: ${inviteCode}`,
          );
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
    const remainingUsers = await userModel.countDocuments({
      $or: [
        { inviteCode: { $exists: false } },
        { inviteCode: null },
        { inviteCode: '' },
      ],
    });

    if (remainingUsers === 0) {
      console.log(
        '✅ Migration completed successfully! All users now have invite codes.',
      );
    } else {
      console.log(
        `⚠️  Migration incomplete. ${remainingUsers} users still need invite codes.`,
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await app.close();
    console.log('🔒 Application context closed');
  }
}

/**
 * Generate unique invite code (copied from UsersService logic)
 */
async function generateUniqueInviteCode(
  userModel: Model<UserDocument>,
): Promise<string> {
  let isUnique = false;
  let inviteCode = '';

  while (!isUnique) {
    // Generate 8-character alphanumeric code
    inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Check if code already exists
    const existingUser = await userModel.findOne({ inviteCode }).exec();
    if (!existingUser) {
      isUnique = true;
    }
  }

  return inviteCode;
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
