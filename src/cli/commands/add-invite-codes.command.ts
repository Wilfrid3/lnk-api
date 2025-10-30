import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
@Command({
  name: 'add-invite-codes',
  description: "Add invite codes to existing users who don't have them",
})
export class AddInviteCodesCommand extends CommandRunner {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting invite codes migration...');

    try {
      // Find users that don't have complete invite system data
      // Use lean() to get raw database documents without Mongoose defaults applied
      const usersNeedingUpdate = await this.userModel
        .find({
          $or: [
            { inviteCode: { $exists: false } },
            { inviteCode: null },
            { inviteCode: '' },
            { inviteRewards: { $exists: false } },
          ],
        })
        .lean()
        .exec();

      console.log(
        `📝 Found ${usersNeedingUpdate.length} users needing invite system updates`,
      );

      if (usersNeedingUpdate.length === 0) {
        console.log('✅ All users already have complete invite system data!');
        return;
      }

      let processedCount = 0;
      let errorCount = 0;
      let inviteCodesAdded = 0;
      let inviteRewardsAdded = 0;

      for (const user of usersNeedingUpdate) {
        try {
          // Prepare update object
          const updateDoc: any = {};
          let needsUpdate = false;

          // Add invite code if missing
          if (!user.inviteCode || user.inviteCode === '') {
            const inviteCode = await this.generateUniqueInviteCode();
            updateDoc.inviteCode = inviteCode;
            inviteCodesAdded++;
            needsUpdate = true;
            console.log(
              `📝 Generated invite code ${inviteCode} for user ${user._id}`,
            );
          }

          // Add inviteRewards if missing from database (lean query shows raw data)
          if (!user.inviteRewards) {
            updateDoc.inviteRewards = {
              totalInvitedUsers: 0,
              totalRewards: 0,
              currency: 'YZ',
            };
            inviteRewardsAdded++;
            needsUpdate = true;
            console.log(
              `💰 Added invite rewards structure for user ${user._id}`,
            );
          }

          // Update the user only if needed
          if (needsUpdate) {
            const result = await this.userModel.updateOne(
              { _id: user._id },
              { $set: updateDoc },
            );

            if (result.modifiedCount === 1) {
              processedCount++;
              console.log(`✅ Updated user ${user._id}`);
            } else {
              console.log(`⚠️  User ${user._id} was not updated`);
            }
          } else {
            console.log(
              `ℹ️  User ${user._id} already has complete invite data`,
            );
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error updating user ${user._id}:`, error.message);
        }
      }

      console.log('\n📊 Migration Summary:');
      console.log(`   Users processed: ${processedCount}`);
      console.log(`   Invite codes added: ${inviteCodesAdded}`);
      console.log(`   Invite rewards structures added: ${inviteRewardsAdded}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Total users checked: ${usersNeedingUpdate.length}`);

      // Verify the migration
      console.log('\n🔍 Verifying migration...');
      const remainingUsersWithoutInviteCode =
        await this.userModel.countDocuments({
          $or: [
            { inviteCode: { $exists: false } },
            { inviteCode: null },
            { inviteCode: '' },
          ],
        });

      // More comprehensive check for incomplete invite rewards
      const remainingUsersWithIncompleteInviteRewards =
        await this.userModel.countDocuments({
          $or: [
            { inviteRewards: { $exists: false } },
            { inviteRewards: null },
            { 'inviteRewards.totalInvitedUsers': { $exists: false } },
            { 'inviteRewards.totalRewards': { $exists: false } },
            { 'inviteRewards.currency': { $exists: false } },
          ],
        });

      if (
        remainingUsersWithoutInviteCode === 0 &&
        remainingUsersWithIncompleteInviteRewards === 0
      ) {
        console.log(
          '✅ Migration completed successfully! All users now have complete invite system data.',
        );
      } else {
        if (remainingUsersWithoutInviteCode > 0) {
          console.log(
            `⚠️  ${remainingUsersWithoutInviteCode} users still need invite codes.`,
          );
        }
        if (remainingUsersWithIncompleteInviteRewards > 0) {
          console.log(
            `⚠️  ${remainingUsersWithIncompleteInviteRewards} users still need complete invite rewards structure.`,
          );
        }
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique invite code
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let isUnique = false;
    let inviteCode = '';

    while (!isUnique) {
      // Generate 8-character alphanumeric code
      inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Check if code already exists
      const existingUser = await this.userModel.findOne({ inviteCode }).exec();
      if (!existingUser) {
        isUnique = true;
      }
    }

    return inviteCode;
  }
}
