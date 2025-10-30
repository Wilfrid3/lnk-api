import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserFileService, MulterFile } from './services/user-file.service';
import { QueryUserDto } from './dto/query-user.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../common/dto/pagination.dto';
import { AdultServicesService } from '../modules/adult-services/services/adult-services.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private userFileService: UserFileService,
    private readonly adultServicesService: AdultServicesService,
  ) {}
  // processUserNameFields method removed as we'll handle name directly in the auth controller
  async create(createUserDto: any): Promise<UserDocument> {
    try {
      // Generate invite code if not provided
      createUserDto.inviteCode ??= await this.generateUniqueInviteCode();

      const createdUser = new this.userModel(createUserDto);
      return await createdUser.save();
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Generate unique invite code
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

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  /**
   * Find all users with pagination and filtering for guest access
   */
  async findAllWithPagination(
    queryDto: QueryUserDto,
  ): Promise<PaginatedResponseDto<UserDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = queryDto;
    const skip = (page - 1) * limit;

    // Create sort object with proper typing for mongoose
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Build filter query
    const filterQuery: any = {};

    // Premium filter
    if (filters.premium !== undefined) {
      filterQuery.isPremium = filters.premium;
    }

    // City filter
    if (filters.city) {
      filterQuery.city = { $regex: filters.city, $options: 'i' };
    }

    // User type filter
    if (filters.userType) {
      filterQuery.userType = filters.userType;
    }

    // Verified filter
    if (filters.verified !== undefined) {
      filterQuery.isVerified = filters.verified;
    }

    // Offerings filter
    if (filters.offerings && filters.offerings.length > 0) {
      filterQuery.offerings = { $in: filters.offerings };
    }

    // Client type filter
    if (filters.clientType) {
      filterQuery.clientType = filters.clientType;
    }

    // Only include active users and exclude admin users
    filterQuery.isActive = true;
    filterQuery.isAdmin = { $ne: true };

    try {
      // Execute query with pagination
      const [users, totalItems] = await Promise.all([
        this.userModel
          .find(filterQuery)
          // Exclude sensitive information from the results
          .select('-password -refreshToken -firebaseUid -email -phoneNumber')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(filterQuery).exec(),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);

      const meta: PaginationMetaDto = {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      };

      return new PaginatedResponseDto(users, meta);
    } catch (error) {
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  /**
   * Find featured/premium users with pagination, fallback to random users if no featured users exist
   */
  async findFeaturedUsers(
    queryDto: QueryUserDto,
  ): Promise<PaginatedResponseDto<UserDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = queryDto;
    const skip = (page - 1) * limit;

    // Create sort object with proper typing for mongoose
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Build base filter query
    const baseFilterQuery: any = {};

    // Apply additional filters if provided
    if (filters.city) {
      baseFilterQuery.city = { $regex: filters.city, $options: 'i' };
    }

    if (filters.userType) {
      baseFilterQuery.userType = filters.userType;
    }

    if (filters.offerings && filters.offerings.length > 0) {
      baseFilterQuery.offerings = { $in: filters.offerings };
    }

    if (filters.clientType) {
      baseFilterQuery.clientType = filters.clientType;
    }

    // Only include active users and exclude admin users
    baseFilterQuery.isActive = true;
    baseFilterQuery.isAdmin = { $ne: true };

    try {
      // First, try to get featured users (premium or verified)
      const featuredFilterQuery = {
        ...baseFilterQuery,
        $or: [{ isPremium: true }, { isVerified: true }],
      };

      const [featuredUsers, featuredTotalItems] = await Promise.all([
        this.userModel
          .find(featuredFilterQuery)
          .select('-password -refreshToken -firebaseUid -email -phoneNumber')
          .sort({ isPremium: -1, isVerified: -1, ...sortOptions })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(featuredFilterQuery).exec(),
      ]);

      // If we have featured users, return them
      if (featuredUsers.length > 0) {
        const totalPages = Math.ceil(featuredTotalItems / limit);

        const meta: PaginationMetaDto = {
          totalItems: featuredTotalItems,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
        };

        return new PaginatedResponseDto(featuredUsers, meta);
      }

      // If no featured users, fall back to users with highest post count
      const [randomUsers, randomTotalItems] = await Promise.all([
        this.userModel.aggregate([
          { $match: baseFilterQuery },
          {
            $lookup: {
              from: 'posts',
              localField: '_id',
              foreignField: 'userId',
              as: 'userPosts',
            },
          },
          {
            $addFields: {
              postCount: { $size: '$userPosts' },
            },
          },
          { $sort: { postCount: -1, createdAt: -1 } }, // Sort by post count first, then by creation date
          { $limit: limit },
          {
            $project: {
              password: 0,
              refreshToken: 0,
              firebaseUid: 0,
              email: 0,
              phoneNumber: 0,
              userPosts: 0, // Remove the posts array from final result
            },
          },
        ]),
        this.userModel.countDocuments(baseFilterQuery).exec(),
      ]);

      // For random selection, we don't use traditional pagination
      // but we still provide pagination metadata for consistency
      const totalPages = Math.ceil(randomTotalItems / limit);

      const meta: PaginationMetaDto = {
        totalItems: randomTotalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      };

      return new PaginatedResponseDto(randomUsers, meta);
    } catch (error) {
      throw new Error(`Failed to retrieve featured users: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    return this.findOne(id);
  }

  async findByPhone(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: any): Promise<UserDocument> {
    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          id,
          { $set: updateUserDto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async markPhoneAsVerified(id: string): Promise<UserDocument> {
    return this.update(id, { isPhoneVerified: true });
  }

  async markEmailAsVerified(id: string): Promise<UserDocument> {
    return this.update(id, { isEmailVerified: true });
  }

  async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.refreshToken = refreshToken;
    return user.save();
  }

  async getUserByRefreshToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ refreshToken: token }).exec();
  }

  async remove(id: string): Promise<UserDocument> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();

    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return deletedUser;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ firebaseUid }).exec();
  }

  /**
   * Remove the refresh token from a user
   */
  async removeRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 },
    });
  }
  /**
   * Updates a user's profile information with validation for unique fields
   */
  async updateProfile(userId: string, updateData: any): Promise<UserDocument> {
    // First check if user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if userType update is requested and validate business rules
    if (updateData.userType !== undefined) {
      const restrictedUserTypes = ['homme', 'femme', 'couple', 'autres'];

      // If current userType is already one of the restricted types, don't allow change
      if (restrictedUserTypes.includes(user.userType)) {
        throw new Error(
          'User type cannot be changed once set to homme, femme, couple, or autres',
        );
      }

      // If trying to set to a non-restricted value, validate it's one of the allowed values
      if (!restrictedUserTypes.includes(updateData.userType)) {
        throw new Error(
          'User type must be one of: homme, femme, couple, autres',
        );
      }
    }

    // Check if email update is requested and validate uniqueness
    if (updateData.email && updateData.email !== user.email) {
      const existingUserWithEmail = await this.findByEmail(updateData.email);
      if (
        existingUserWithEmail &&
        String(existingUserWithEmail._id) !== userId
      ) {
        throw new Error('Email is already in use');
      }
    }

    // Check if phone update is requested and validate uniqueness
    if (updateData.phoneNumber && updateData.phoneNumber !== user.phoneNumber) {
      const existingUserWithPhone = await this.findByPhone(
        updateData.phoneNumber,
      );
      if (
        existingUserWithPhone &&
        String(existingUserWithPhone._id) !== userId
      ) {
        throw new Error('Phone number is already in use');
      }
    }

    // Update the user profile
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }

    return updatedUser;
  }

  /**
   * Updates a user's avatar
   */
  async updateAvatar(userId: string, file: MulterFile): Promise<UserDocument> {
    // First check if user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete old avatar if it exists
    if (user.avatar) {
      await this.userFileService.deleteFile(user.avatar);
    }

    // Upload new avatar
    const avatarUrl = await this.userFileService.uploadAvatar(file, userId);

    // Update user with new avatar URL
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatarUrl } },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new Error('Failed to update user avatar');
    }

    return updatedUser;
  }

  /**
   * Updates a user's cover image
   */
  async updateCoverImage(
    userId: string,
    file: MulterFile,
  ): Promise<UserDocument> {
    // First check if user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete old cover image if it exists
    if (user.coverImage) {
      await this.userFileService.deleteFile(user.coverImage);
    }

    // Upload new cover image
    const coverImageUrl = await this.userFileService.uploadCoverImage(
      file,
      userId,
    );

    // Update user with new cover image URL
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { coverImage: coverImageUrl } },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new Error('Failed to update user cover image');
    }

    return updatedUser;
  }

  /**
   * Updates a user's preferences and rates
   */
  async updatePreferencesRates(
    userId: string,
    updateData: any,
  ): Promise<UserDocument> {
    // First check if user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Handle service packages validation if provided
    if (updateData.servicePackages) {
      await this.validateServicePackages(updateData.servicePackages);
      // Add IDs and timestamps to service packages
      updateData.servicePackages = updateData.servicePackages.map(
        (pkg: CreateServicePackageDto) => ({
          _id: new Types.ObjectId().toString(),
          ...pkg,
          currency: pkg.currency || 'FCFA',
          isActive: pkg.isActive !== undefined ? pkg.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    }

    // Validate numeric fields are positive if provided
    const numericFields = [
      'hourlyRate',
      'halfDayRate',
      'fullDayRate',
      'weekendRate',
    ];
    for (const field of numericFields) {
      if (updateData[field] !== undefined && updateData[field] < 0) {
        throw new Error(`${field} must be a positive number`);
      }
    }

    // Ensure array fields contain only strings
    const arrayFields = ['offerings', 'paymentMethods'];
    for (const field of arrayFields) {
      if (updateData[field] !== undefined) {
        if (!Array.isArray(updateData[field])) {
          throw new Error(`${field} must be an array`);
        }
        // Filter to ensure only strings
        updateData[field] = updateData[field].filter(
          (item: any) => typeof item === 'string',
        );
      }
    }

    // Update the user preferences and rates
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new Error('Failed to update user preferences and rates');
    }

    return updatedUser;
  }

  /**
   * Validates service packages data
   */
  private async validateServicePackages(
    packages: CreateServicePackageDto[],
  ): Promise<void> {
    for (const pkg of packages) {
      // Validate service IDs exist
      const invalidIds = await this.adultServicesService.getInvalidServiceIds(
        pkg.services,
      );
      if (invalidIds.length > 0) {
        throw new Error(
          `Invalid service IDs in package "${pkg.title}": ${invalidIds.join(', ')}. Please check that these services exist and are active.`,
        );
      }

      // Check for duplicate services within the package
      const duplicates = pkg.services.filter(
        (service, index) => pkg.services.indexOf(service) !== index,
      );
      if (duplicates.length > 0) {
        throw new Error(
          `Duplicate services found in package "${pkg.title}": ${duplicates.join(', ')}. Each service can only be included once per package.`,
        );
      }
    }
  }

  /**
   * Search users with filters and pagination
   */
  async searchUsers(
    queryDto: QueryUserDto,
  ): Promise<PaginatedResponseDto<UserDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = queryDto;
    const skip = (page - 1) * limit;

    // Create sort object with proper typing for mongoose
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Build filter query
    const filterQuery: any = {};

    // Text search in name and bio
    if (filters.search) {
      filterQuery.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { bio: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // City filter
    if (filters.city) {
      filterQuery.city = { $regex: filters.city, $options: 'i' };
    }

    // User type filter
    if (filters.userType) {
      filterQuery.userType = filters.userType;
    }

    // Appearance filter
    if (filters.appearance) {
      filterQuery.appearance = filters.appearance;
    }

    // Verified filter
    if (filters.verified !== undefined) {
      filterQuery.isVerified = filters.verified;
    }

    // Premium filter
    if (filters.premium !== undefined) {
      filterQuery.isPremium = filters.premium;
    }

    // Offerings filter
    if (filters.offerings && filters.offerings.length > 0) {
      filterQuery.offerings = { $in: filters.offerings };
    }

    // Client type filter
    if (filters.clientType) {
      filterQuery.clientType = filters.clientType;
    }

    // Age filters
    if (filters.minAge || filters.maxAge) {
      filterQuery.age = {};
      if (filters.minAge) {
        filterQuery.age.$gte = filters.minAge;
      }
      if (filters.maxAge) {
        filterQuery.age.$lte = filters.maxAge;
      }
    }

    // Only include active users and exclude admin users
    filterQuery.isActive = true;
    filterQuery.isAdmin = { $ne: true };

    try {
      // Execute query with pagination
      const [users, totalItems] = await Promise.all([
        this.userModel
          .find(filterQuery)
          // Exclude sensitive information from the results
          .select('-password -refreshToken -firebaseUid -email -phoneNumber')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(filterQuery).exec(),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);

      const meta: PaginationMetaDto = {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      };

      return new PaginatedResponseDto(users, meta);
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  // Find user by invite code
  async findByInviteCode(inviteCode: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ inviteCode }).exec();
  }

  // Process invite code during registration
  async processInviteCode(
    inviteCode: string,
    newUserId: string,
  ): Promise<void> {
    const inviter = await this.findByInviteCode(inviteCode);
    if (!inviter) {
      throw new NotFoundException('Invalid invite code');
    }

    // Update the new user with invitedBy field
    await this.userModel.findByIdAndUpdate(newUserId, {
      invitedBy: inviter._id,
    });

    // Update inviter's rewards
    const rewardAmount = 100; // 1000 FCFA reward per invite
    await this.userModel.findByIdAndUpdate(inviter._id, {
      $inc: {
        'inviteRewards.totalInvitedUsers': 1,
        'inviteRewards.totalRewards': rewardAmount,
      },
    });
  }

  // Get invitation statistics for a user
  async getInviteStats(userId: string): Promise<any> {
    const user = await this.findOne(userId);
    const invitedUsers = await this.userModel.countDocuments({
      invitedBy: new Types.ObjectId(userId),
    });

    return {
      inviteCode: user.inviteCode,
      totalInvitedUsers: user.inviteRewards?.totalInvitedUsers ?? 0,
      totalRewards: user.inviteRewards?.totalRewards ?? 0,
      currency: user.inviteRewards?.currency ?? 'YZ',
      actualInvitedUsersCount: invitedUsers,
    };
  }

  // Get list of invited users
  async getInvitedUsers(
    userId: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<any> {
    const invitedUsers = await this.userModel
      .find({
        invitedBy: new Types.ObjectId(userId),
        isAdmin: { $ne: true }, // Exclude admin users
      })
      .select('name avatar phoneNumber createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const total = await this.userModel.countDocuments({
      invitedBy: userId,
      isAdmin: { $ne: true }, // Exclude admin users from count too
    });

    return {
      users: invitedUsers,
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
