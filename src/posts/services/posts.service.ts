/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { PostFile, PostFileDocument } from '../schemas/post-file.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { QueryPostDto } from '../dto/query-post.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination.dto';
import { FileUploadService } from './file-upload.service';
import { PostFileService } from './post-file.service';
import { MulterFile } from '../interfaces';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private fileUploadService: FileUploadService,
    private postFileService: PostFileService,
    private notificationsService: NotificationsService,
  ) {
    console.log('PostsService initialized with PostFileService');
  }

  async create(
    userId: string,
    createPostDto: CreatePostDto,
  ): Promise<PostDocument> {
    try {
      const createdPost = new this.postModel({
        ...createPostDto,
        userId: new Types.ObjectId(userId),
      });
      return await createdPost.save();
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la création de l'annonce: ${error.message}`,
      );
    }
  }

  /**
   * Creates a post with an optional main photo file
   */
  async createWithMedia(
    userId: string,
    createPostDto: CreatePostDto,
    mainPhoto?: MulterFile,
  ): Promise<PostDocument> {
    try {
      // Upload main photo if present
      let mainPhotoUrl: string | undefined;
      if (mainPhoto) {
        mainPhotoUrl = await this.fileUploadService.uploadFile(mainPhoto);
      }

      // Create a new post with the uploaded photo URL
      const postData = {
        ...createPostDto,
        userId: new Types.ObjectId(userId),
        ...(mainPhotoUrl && { mainPhoto: mainPhotoUrl }),
      };

      const createdPost = new this.postModel(postData);
      return await createdPost.save();
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la création de l'annonce: ${error.message}`,
      );
    }
  }
  /**
   * Creates a post with optional main photo, additional photos, and videos
   */
  async createWithFiles(
    userId: string,
    createPostDto: CreatePostDto,
    mainPhoto?: MulterFile,
    additionalPhotos: MulterFile[] = [],
    videos: MulterFile[] = [],
  ): Promise<PostDocument> {
    try {
      console.log('Creating post with files:', {
        hasMainPhoto: !!mainPhoto,
        additionalPhotosCount: additionalPhotos.length,
        videosCount: videos.length,
      });

      // Validate file limits
      if (additionalPhotos.length > 8) {
        throw new BadRequestException(
          'Vous ne pouvez télécharger que 8 photos additionnelles maximum',
        );
      }

      if (videos.length > 3) {
        throw new BadRequestException(
          'Vous ne pouvez télécharger que 3 vidéos maximum',
        );
      }

      // First, create a post without files
      const postData = {
        ...createPostDto,
        userId: new Types.ObjectId(userId),
      };

      const createdPost = new this.postModel(postData);
      await createdPost.save();

      // Now that we have a post ID, we can associate files with it
      const postId = createdPost.id;

      // Upload main photo if present
      if (mainPhoto) {
        console.log('Uploading main photo:', mainPhoto.originalname);
        const mainPhotoDoc = await this.postFileService.uploadFile(
          mainPhoto,
          userId,
          postId,
        );
        createdPost.mainPhoto = mainPhotoDoc._id as any;
        console.log('Main photo saved with ID:', mainPhotoDoc._id);
      }

      // Upload additional photos if present
      if (additionalPhotos && additionalPhotos.length > 0) {
        console.log('Uploading additional photos:', additionalPhotos.length);
        const additionalPhotoDocs =
          await this.postFileService.uploadMultipleFiles(
            additionalPhotos,
            userId,
            postId,
          );
        createdPost.additionalPhotos = additionalPhotoDocs.map(
          (doc) => doc._id,
        ) as any[];
        console.log(
          'Additional photos saved:',
          createdPost.additionalPhotos.length,
        );
      }

      // Upload videos if present
      if (videos && videos.length > 0) {
        console.log('Uploading videos:', videos.length);
        const videoDocs = await this.postFileService.uploadMultipleFiles(
          videos,
          userId,
          postId,
        );
        createdPost.videos = videoDocs.map((doc) => doc._id) as any[];
        console.log('Videos saved:', createdPost.videos.length);
      }

      // Save the post with file references
      await createdPost.save();
      console.log('Post saved with file references');

      // Send new post notification to all users (async, non-blocking)
      setImmediate(async () => {
        try {
          const author = await this.userModel.findById(userId).select('name');
          if (author) {
            const authorName = author.name || 'Un utilisateur';
            const postTitle = createdPost.title || 'Nouvelle publication';
            
            await this.notificationsService.sendNewPostNotification(
              authorName,
              postTitle
            );
          }
        } catch (notificationError) {
          console.error('Failed to send new post notification:', notificationError);
          // Don't throw error for notification failure - the post was created successfully
        }
      });

      // Return the populated post
      return this.findByIdWithFiles(postId);
    } catch (error) {
      console.error('Error creating post with files:', error);
      throw new BadRequestException(
        `Erreur lors de la création de l'annonce: ${error.message}`,
      );
    }
  }

  async getTopCities() {
    const cities = await this.postModel.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $project: {
          _id: 0,
          city: '$_id',
          count: 1,
        },
      },
    ]);

    return cities;
  }

  async findAll(
    queryDto: QueryPostDto,
  ): Promise<PaginatedResponseDto<PostDocument>> {
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

    // Text search in title and description
    if (filters.search) {
      filterQuery.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // City filter
    if (filters.city) {
      filterQuery.city = { $regex: filters.city, $options: 'i' };
    }

    // Client type filter
    if (filters.clientType) {
      filterQuery.clientType = filters.clientType;
    }

    // Price filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      filterQuery.price = {};
      if (filters.minPrice !== undefined) {
        filterQuery.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        filterQuery.price.$lte = filters.maxPrice;
      }
    }

    // Offerings filter - match any of the provided offerings
    if (filters.offerings && filters.offerings.length > 0) {
      filterQuery.offerings = { $in: filters.offerings };
    }

    // Only include active posts
    filterQuery.isActive = true;

    try {
      // Build aggregation pipeline
      const pipeline: any[] = [
        { $match: filterQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
      ];

      // Add user name filter if provided
      if (filters.userName) {
        pipeline.push({
          $match: {
            'userInfo.name': { $regex: filters.userName, $options: 'i' },
          },
        });
      }

      // Add sorting
      pipeline.push({ $sort: sortOptions });

      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Execute aggregation pipeline
      const posts = await this.postModel.aggregate(pipeline).exec();

      // Count total items (without pagination)
      const countPipeline = [
        { $match: filterQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
      ];

      if (filters.userName) {
        countPipeline.push({
          $match: {
            'userInfo.name': { $regex: filters.userName, $options: 'i' },
          },
        });
      }

      countPipeline.push({ $count: 'total' });

      const countResult = await this.postModel.aggregate(countPipeline).exec();
      const totalItems = countResult.length > 0 ? countResult[0].total : 0;

      // Convert aggregation results back to documents and populate file references
      const postDocs = posts.map(post => new this.postModel(post));
      const populatedPosts = await this.populatePostFiles(postDocs);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);

      // Return paginated response
      return {
        items: populatedPosts,
        meta: {
          totalItems,
          itemsPerPage: limit,
          totalPages,
          currentPage: page,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la récupération des annonces: ${error.message}`,
      );
    }
  }

  async search(
    queryDto: QueryPostDto,
  ): Promise<PaginatedResponseDto<PostDocument>> {
    // Reuse findAll with search parameters
    return this.findAll(queryDto);
  }

  async findByUserId(
    userId: string,
    queryDto: QueryPostDto,
  ): Promise<PaginatedResponseDto<PostDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;
    const skip = (page - 1) * limit;
    // Create sort object with proper typing for mongoose
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    try {
      // Execute query with pagination
      const [results, totalItems] = await Promise.all([
        this.postModel
          .find({ userId: new Types.ObjectId(userId) })
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.postModel
          .countDocuments({ userId: new Types.ObjectId(userId) })
          .exec(),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);

      const meta: PaginationMetaDto = {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      };

      return new PaginatedResponseDto(results, meta);
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la récupération des annonces de l'utilisateur: ${error.message}`,
      );
    }
  }

  /**
   * Find a post by ID with populated file data
   */
  async findOne(id: string): Promise<PostDocument> {
    return this.findByIdWithFiles(id);
  }

  async incrementViews(id: string): Promise<PostDocument> {
    try {
      const post = await this.postModel
        .findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
        .exec();

      if (!post) {
        throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
      }

      return post;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de l'incrémentation des vues: ${error.message}`,
      );
    }
  }

  async update(
    id: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<PostDocument> {
    try {
      // First verify the post exists and belongs to the user
      const post = await this.postModel.findById(id).exec();

      if (!post) {
        throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
      }

      if (post.userId.toString() !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à modifier cette annonce",
        );
      }
      // Update the post
      const updatedPost = await this.postModel
        .findByIdAndUpdate(
          id,
          { $set: updatePostDto },
          { new: true, runValidators: true },
        )
        .exec();

      // Check if post was found and updated
      if (!updatedPost) {
        throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
      }

      return updatedPost;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de la mise à jour de l'annonce: ${error.message}`,
      );
    }
  }

  /**
   * Soft delete a post (mark as inactive)
   */
  async remove(id: string, userId: string): Promise<void> {
    try {
      // Find post and verify ownership
      const post = await this.postModel.findById(id).exec();

      if (!post) {
        throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
      }

      if (post.userId.toString() !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à supprimer cette annonce",
        );
      }

      if (!post.isActive) {
        throw new BadRequestException('Cette annonce est déjà supprimée');
      }

      // Soft delete the post by setting isActive to false
      await this.postModel.findByIdAndUpdate(
        id,
        { 
          isActive: false,
          // Add deleted timestamp for tracking
          deletedAt: new Date()
        },
        { new: true }
      ).exec();

    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de la suppression de l'annonce: ${error.message}`,
      );
    }
  }
  async uploadPhoto(
    id: string,
    userId: string,
    file: MulterFile,
    isMainPhoto: boolean = false,
  ): Promise<PostDocument> {
    try {
      // First verify the post exists and belongs to the user
      const post = await this.postModel.findById(id).exec();

      if (!post) {
        throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
      }

      if (post.userId.toString() !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à modifier les photos de cette annonce",
        );
      }

      // Upload the file and create a PostFile document
      const photoDoc = await this.postFileService.uploadFile(file, userId, id);
      // Update the post with the file reference
      if (isMainPhoto) {
        // If there's an existing main photo, move it to additional photos
        if (post.mainPhoto) {
          if (!post.additionalPhotos) {
            post.additionalPhotos = [];
          }
          post.additionalPhotos.push(post.mainPhoto as any);
        }

        post.mainPhoto = photoDoc._id as any;
      } else {
        // Add to additional photos
        if (!post.additionalPhotos) {
          post.additionalPhotos = [];
        }
        post.additionalPhotos.push(photoDoc._id as any);
      }

      await post.save();
      return post;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de l'ajout de la photo: ${error.message}`,
      );
    }
  }
  /**
   * Add multiple additional photos to an existing post
   */
  async addAdditionalPhotos(
    id: string,
    userId: string,
    additionalPhotos: MulterFile[],
  ): Promise<PostDocument> {
    try {
      // First verify the post exists and belongs to the user
      const post = await this.postModel.findById(id).exec();

      if (!post) {
        throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
      }

      if (post.userId.toString() !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à modifier les photos de cette annonce",
        );
      }

      // Upload all additional photos and create PostFile documents
      const photoDocs = await this.postFileService.uploadMultipleFiles(
        additionalPhotos,
        userId,
        id,
      );
      // Add file references to additional photos array
      if (!post.additionalPhotos) {
        post.additionalPhotos = [];
      }

      post.additionalPhotos.push(...(photoDocs.map((doc) => doc._id) as any[]));

      // Save the updated post
      await post.save();
      return post;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de l'ajout des photos: ${error.message}`,
      );
    }
  }
  /**
   * Helper method to populate post with file data and owner information
   */
  private async populatePostFiles<T extends PostDocument | PostDocument[]>(
    post: T,
  ): Promise<T> {
    if (Array.isArray(post)) {
      const populated = await this.postModel.populate(post, [
        { path: 'mainPhoto', model: 'PostFile' },
        { path: 'additionalPhotos', model: 'PostFile' },
        { path: 'videos', model: 'PostFile' },
        {
          path: 'userId',
          model: 'User',
          select: 'email name avatar userType bio isPremium isVip isVerified',
        },
      ]);
      return populated as unknown as T;
    }

    const populated = await this.postModel.populate(post, [
      { path: 'mainPhoto', model: 'PostFile' },
      { path: 'additionalPhotos', model: 'PostFile' },
      { path: 'videos', model: 'PostFile' },
      {
        path: 'userId',
        model: 'User',
        select: 'email name avatar userType bio isPremium isVip isVerified',
      },
    ]);
    return populated as unknown as T;
  }

  /**
   * Populate only the mainPhoto field for a post or array of posts
   */
  async populateMainPhotoOnly<T extends PostDocument | PostDocument[]>(
    post: T,
  ): Promise<T> {
    if (Array.isArray(post)) {
      const populated = await this.postModel.populate(post, [
        { path: 'mainPhoto', model: 'PostFile' },
      ]);
      return populated as unknown as T;
    }
    const populated = await this.postModel.populate(post, [
      { path: 'mainPhoto', model: 'PostFile' },
    ]);
    return populated as unknown as T;
  }

  /**
   * Helper method to automatically populate a post result with files
   */
  private async findByIdWithFiles(id: string): Promise<PostDocument> {
    const post = await this.postModel.findById(id).exec();

    if (!post) {
      throw new NotFoundException(`Annonce non trouvée avec l'ID: ${id}`);
    }
    this.incrementViews(id);
    return this.populatePostFiles(post);
  }
  /**
   * Find featured posts (limited to 10)
   * If no featured posts are found, returns the 10 latest normal posts instead
   */
  async findFeatured(): Promise<PostDocument[]> {
    try {
      // First try to get featured posts
      let posts = await this.postModel
        .find({ isFeatured: true, isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      // If no featured posts found, get latest normal posts instead
      if (posts.length === 0) {
        // console.log('No featured posts found, returning latest normal posts instead');
        posts = await this.postModel
          .find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(10)
          .exec();
      }

      // Populate file and user information
      return this.populatePostFiles(posts);
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la récupération des annonces mises en avant: ${error.message}`,
      );
    }
  }

  // Like/Unlike System
  async likePost(postId: string, userId: string): Promise<PostDocument> {
    try {
      const post = await this.postModel.findById(postId);

      if (!post) {
        throw new NotFoundException(`Post not found with ID: ${postId}`);
      }

      const userObjectId = new Types.ObjectId(userId);
      const isAlreadyLiked = post.likes.some(
        (id) => (id as any).equals?.(userObjectId) || String(id) === userId,
      );

      if (isAlreadyLiked) {
        throw new BadRequestException('Post already liked by this user');
      }

      // Add user to likes array and increment counter
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        {
          $addToSet: { likes: userObjectId },
          $inc: { likesCount: 1 },
        },
        { new: true },
      );

      if (!updatedPost) {
        throw new NotFoundException('Failed to update post');
      }

      // Send push notification to post owner (if not the same user who liked) - async
      if (String(updatedPost.userId) !== userId) {
        const ownerId = String(updatedPost.userId);
        setImmediate(async () => {
          try {
            // Get the user who liked the post for the notification content
            const likingUser = await this.userModel.findById(userId).select('name');
            if (likingUser) {
              const postTitle = updatedPost.title || 'votre publication';
              const userName = likingUser.name || 'Quelqu\'un';
              
              this.notificationsService.sendLikeNotification(
                ownerId,
                userName,
                postTitle
              );
            }
          } catch (notificationError) {
            console.error('Failed to send like notification:', notificationError);
            // Don't throw error for notification failure - the like was successful
          }
        });
      }

      return this.populatePostFiles(updatedPost) as Promise<PostDocument>;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Error liking post: ${error.message}`);
    }
  }

  async unlikePost(postId: string, userId: string): Promise<PostDocument> {
    try {
      const post = await this.postModel.findById(postId);

      if (!post) {
        throw new NotFoundException(`Post not found with ID: ${postId}`);
      }

      const userObjectId = new Types.ObjectId(userId);
      const isLiked = post.likes.some(
        (id) => (id as any).equals?.(userObjectId) || String(id) === userId,
      );

      if (!isLiked) {
        throw new BadRequestException('Post not liked by this user');
      }

      // Remove user from likes array and decrement counter
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        {
          $pull: { likes: userObjectId },
          $inc: { likesCount: -1 },
        },
        { new: true },
      );

      if (!updatedPost) {
        throw new NotFoundException('Failed to update post');
      }

      return this.populatePostFiles(updatedPost) as Promise<PostDocument>;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Error unliking post: ${error.message}`);
    }
  }

  // Post Statistics Methods
  async getUserPostsCount(userId: string): Promise<number> {
    try {
      return await this.postModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isActive: true,
      });
    } catch (error) {
      throw new BadRequestException(
        `Error counting user posts: ${error.message}`,
      );
    }
  }

  async getUserLikesCount(userId: string): Promise<number> {
    try {
      const result = await this.postModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: '$likesCount' },
          },
        },
      ]);

      return result.length > 0 ? result[0].totalLikes : 0;
    } catch (error) {
      throw new BadRequestException(
        `Error counting user likes: ${error.message}`,
      );
    }
  }

  async isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
    try {
      const post = await this.postModel.findById(postId).select('likes');
      if (!post) {
        return false;
      }

      const userObjectId = new Types.ObjectId(userId);
      return post.likes.some(
        (id) => (id as any).equals?.(userObjectId) || String(id) === userId,
      );
    } catch (error) {
      return false;
    }
  }
}
