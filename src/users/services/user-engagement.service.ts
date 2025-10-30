import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { UserRating, UserRatingDocument } from '../schemas/user-rating.schema';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { PostsService } from '../../posts/services/posts.service';

@Injectable()
export class UserEngagementService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserRating.name)
    private userRatingModel: Model<UserRatingDocument>,
    @Inject(forwardRef(() => PostsService)) private postsService: PostsService,
  ) {}

  // Follow/Unfollow System
  async followUser(followerId: string, targetUserId: string): Promise<void> {
    if (followerId === targetUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const [follower, target] = await Promise.all([
      this.userModel.findById(followerId),
      this.userModel.findById(targetUserId),
    ]);

    if (!follower || !target) {
      throw new NotFoundException('User not found');
    }

    const targetObjectId = new Types.ObjectId(targetUserId);
    const followerObjectId = new Types.ObjectId(followerId);

    // Check if already following
    const alreadyFollowing = follower.following?.some((id) =>
      id.equals(targetObjectId),
    );
    if (alreadyFollowing) {
      throw new BadRequestException('Already following this user');
    }

    // Add to follower's following list and target's followers list
    await Promise.all([
      this.userModel.findByIdAndUpdate(followerId, {
        $addToSet: { following: targetObjectId },
      }),
      this.userModel.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: followerObjectId },
      }),
    ]);
  }

  async unfollowUser(followerId: string, targetUserId: string): Promise<void> {
    if (followerId === targetUserId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    const targetObjectId = new Types.ObjectId(targetUserId);
    const followerObjectId = new Types.ObjectId(followerId);

    // Remove from both lists
    await Promise.all([
      this.userModel.findByIdAndUpdate(followerId, {
        $pull: { following: targetObjectId },
      }),
      this.userModel.findByIdAndUpdate(targetUserId, {
        $pull: { followers: followerObjectId },
      }),
    ]);
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const user = await this.userModel.findById(userId).populate({
      path: 'followers',
      select: 'name avatar isVerified isPremium',
      match: { isAdmin: { $ne: true } }, // Exclude admin users
      options: { skip, limit },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalFollowers = user.followers?.length || 0;
    const totalPages = Math.ceil(totalFollowers / limit);

    return {
      followers: user.followers || [],
      pagination: {
        page,
        limit,
        total: totalFollowers,
        totalPages,
      },
    };
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const user = await this.userModel.findById(userId).populate({
      path: 'following',
      select: 'name avatar isVerified isPremium',
      match: { isAdmin: { $ne: true } }, // Exclude admin users
      options: { skip, limit },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalFollowing = user.following?.length || 0;
    const totalPages = Math.ceil(totalFollowing / limit);

    return {
      following: user.following || [],
      pagination: {
        page,
        limit,
        total: totalFollowing,
        totalPages,
      },
    };
  }

  // Rating System
  async rateUser(
    raterId: string,
    targetUserId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<UserRatingDocument> {
    if (raterId === targetUserId) {
      throw new BadRequestException('Cannot rate yourself');
    }

    const target = await this.userModel.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User not found');
    }

    try {
      // Create or update rating
      const rating = await this.userRatingModel.findOneAndUpdate(
        { ratedUserId: targetUserId, raterUserId: raterId },
        {
          ratedUserId: targetUserId,
          raterUserId: raterId,
          rating: createRatingDto.rating,
          comment: createRatingDto.comment,
        },
        { upsert: true, new: true },
      );

      // Recalculate user's average rating
      await this.recalculateUserRating(targetUserId);

      return rating;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('You have already rated this user');
      }
      throw error;
    }
  }

  async getUserRatings(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.userRatingModel
        .find({ ratedUserId: userId })
        .populate({
          path: 'raterUserId',
          select: 'name avatar',
          match: { isAdmin: { $ne: true } }, // Exclude admin users
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.userRatingModel.countDocuments({ ratedUserId: userId }),
    ]);

    // Filter out ratings where raterUserId was filtered out by populate match
    const filteredRatings = ratings.filter((rating) => rating.raterUserId);

    const totalPages = Math.ceil(total / limit);

    return {
      ratings: filteredRatings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private async recalculateUserRating(userId: string): Promise<void> {
    const stats = await this.userRatingModel.aggregate([
      { $match: { ratedUserId: userId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const result = stats[0] || {
      averageRating: 0,
      totalRatings: 0,
      ratingCount: 0,
    };

    await this.userModel.findByIdAndUpdate(userId, {
      averageRating: Math.round(result.averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: result.totalRatings,
      ratingCount: result.ratingCount,
    });
  }

  // Profile View System
  async incrementProfileView(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { profileViews: 1 },
    });
  }

  // User Stats
  async getUserStats(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get real post and like counts
    const [postsCount, likesCount] = await Promise.all([
      this.postsService.getUserPostsCount(userId),
      this.postsService.getUserLikesCount(userId),
    ]);

    return {
      posts: postsCount,
      views: user.profileViews || 0,
      likes: likesCount,
      followers: user.followers?.length || 0,
      rank: user.currentRank || 0,
      rankHistory: user.rankHistory || {
        week: 0,
        month: 0,
        year: 0,
      },
    };
  }

  // Ranking System (to be called periodically via cron job)
  async updateUserRankings(): Promise<void> {
    // Calculate rankings based on engagement metrics
    const users = await this.userModel.aggregate([
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: [{ $ifNull: ['$profileViews', 0] }, 1] },
              { $multiply: [{ $size: { $ifNull: ['$followers', []] } }, 10] },
              { $multiply: [{ $ifNull: ['$averageRating', 0] }, 20] },
              { $multiply: [{ $ifNull: ['$ratingCount', 0] }, 5] },
            ],
          },
        },
      },
      { $sort: { engagementScore: -1 } },
      { $project: { _id: 1, engagementScore: 1 } },
    ]);

    // Update ranks
    const bulkOps = users.map((user, index) => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            currentRank: index + 1,
            'rankHistory.week': index + 1, // You can implement time-based logic here
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await this.userModel.bulkWrite(bulkOps);
    }
  }

  /**
   * Check if followerId is following targetUserId
   */
  async isFollowing(
    followerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (followerId === targetUserId) {
      return false;
    }
    const follower = await this.userModel
      .findById(followerId)
      .select('following');
    if (!follower) {
      throw new NotFoundException('User not found');
    }
    const targetObjectId = new Types.ObjectId(targetUserId);
    return Array.isArray(follower.following)
      ? follower.following.some(
          (id) => id.equals?.(targetObjectId) || String(id) === targetUserId,
        )
      : false;
  }

  /**
   * Get the rating given by raterId to targetUserId
   */
  async getUserRatingByRater(raterId: string, targetUserId: string) {
    return this.userRatingModel.findOne({
      ratedUserId: targetUserId,
      raterUserId: raterId,
    });
  }
}
