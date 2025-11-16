import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from './schemas/video.schema';
import { VideoLike, VideoLikeDocument } from './schemas/video-like.schema';
import { VideoView, VideoViewDocument } from './schemas/video-view.schema';
import {
  VideoComment,
  VideoCommentDocument,
} from './schemas/video-comment.schema';
import {
  VideoCommentLike,
  VideoCommentLikeDocument,
} from './schemas/video-comment-like.schema';
import { CreateVideoDto } from './dto/create-video.dto';
import { GetVideosDto } from './dto/get-videos.dto';
import {
  CreateCommentDto,
  UpdateCommentDto,
  GetCommentsDto,
} from './dto/video-comment.dto';
import {
  VideoResponse,
  VideosFeedResponse,
  VideoUploadResponse,
  VideoActionResponse,
} from './interfaces/video.interface';
import { UsersService } from '../users/users.service';
import { MulterFile } from '../posts/interfaces/file.interface';
import { join } from 'path';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { VideosCacheService } from './services/videos-cache.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VideosService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    @InjectModel(VideoLike.name)
    private videoLikeModel: Model<VideoLikeDocument>,
    @InjectModel(VideoView.name)
    private videoViewModel: Model<VideoViewDocument>,
    @InjectModel(VideoComment.name)
    private videoCommentModel: Model<VideoCommentDocument>,
    @InjectModel(VideoCommentLike.name)
    private videoCommentLikeModel: Model<VideoCommentLikeDocument>,
    private usersService: UsersService,
    private cacheService: VideosCacheService,
    private notificationsService: NotificationsService,
  ) {}

  async uploadVideo(
    userId: string,
    createVideoDto: CreateVideoDto,
    videoFile: MulterFile,
    thumbnailFile?: MulterFile,
  ): Promise<VideoUploadResponse> {
    try {
      // Validate file
      if (!videoFile) {
        throw new BadRequestException('Video file is required');
      }

      // Check file size (max 100MB)
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (videoFile.size > maxFileSize) {
        throw new BadRequestException(
          'Video file size exceeds maximum limit of 100MB',
        );
      }

      // Validate video format
      const allowedMimeTypes = [
        'video/mp4',
        'video/webm',
        'video/avi',
        'video/mov',
        'video/quicktime',
      ];
      if (!allowedMimeTypes.includes(videoFile.mimetype)) {
        throw new BadRequestException(
          'Invalid video format. Supported formats: MP4, WebM, AVI, MOV',
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const fileExtension = videoFile.originalname.split('.').pop();
      const videoFileName = `video_${timestamp}_${randomSuffix}.${fileExtension}`;

      // Get the file path (file is already saved by multer)
      const videoPath = videoFile.path || videoFile.filename;
      if (!videoPath) {
        throw new BadRequestException('Video file path is required');
      }

      // Handle thumbnail if provided
      let thumbnailPath: string | undefined;
      if (thumbnailFile) {
        thumbnailPath = thumbnailFile.path || thumbnailFile.filename;
      }

      // Extract video metadata (simplified - in production, use FFmpeg)
      const duration = await this.extractVideoDuration(videoPath);

      // Create video document
      const video = new this.videoModel({
        title: createVideoDto.title,
        phone: createVideoDto.phone,
        whatsapp: createVideoDto.whatsapp,
        description: createVideoDto.description,
        fileName: videoFile.originalname,
        filePath: videoPath,
        fileSize: videoFile.size,
        mimeType: videoFile.mimetype,
        thumbnailPath,
        userId: new Types.ObjectId(userId),
        duration,
        tags: createVideoDto.tags || [],
        location: createVideoDto.location,
        privacy: createVideoDto.privacy || 'public',
        isProcessing: false, // In production, set to true and process asynchronously
      });

      const savedVideo = await video.save();

      // Send new video notification to all users (async, non-blocking)
      setImmediate(async () => {
        try {
          const author = await this.usersService.findById(userId);
          if (author) {
            const authorName = author.name || 'Un utilisateur';
            const videoTitle = savedVideo.title || 'Nouvelle vidéo';
            
            await this.notificationsService.sendNewVideoNotification(
              authorName,
              videoTitle
            );
          }
        } catch (notificationError) {
          console.error('Failed to send new video notification:', notificationError);
          // Don't throw error for notification failure - the video was created successfully
        }
      });

      // Invalidate feed cache since a new video was uploaded
      await this.cacheService.invalidateFeedCache();
      await this.cacheService.invalidateFeedCache(userId);

      return {
        id: (savedVideo._id as any).toString(),
        title: savedVideo.title,
        phone: savedVideo.phone,
        whatsapp: savedVideo.whatsapp,
        description: savedVideo.description,
        videoUrl: `/api/videos/${savedVideo._id}/stream`,
        thumbnailUrl: savedVideo.thumbnailPath
          ? `/api/videos/${savedVideo._id}/thumbnail`
          : undefined,
        duration: savedVideo.duration,
        isProcessing: savedVideo.isProcessing,
        message: 'Video uploaded successfully',
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload video');
    }
  }

  async getVideosFeed(
    query: GetVideosDto,
    currentUserId?: string,
  ): Promise<VideosFeedResponse> {
    try {
      const { page = 1, limit = 10, excludes = [] } = query;

      // Try to get from cache first (skip cache if excludes are provided)
      if (!excludes || excludes.length === 0) {
        const cachedFeed = await this.cacheService.getFeedCache(
          currentUserId,
          page,
          limit,
        );
        if (cachedFeed) {
          return cachedFeed;
        }
      }

      const skip = (page - 1) * limit;

      // Build the query filter
      const filter: any = { isActive: true, privacy: 'public' };
      
      // Add excludes filter if provided
      if (excludes && excludes.length > 0) {
        // Validate ObjectIds
        const validExcludes = excludes.filter(id => Types.ObjectId.isValid(id));
        if (validExcludes.length > 0) {
          filter._id = { $nin: validExcludes.map(id => new Types.ObjectId(id)) };
        }
      }

      // Get videos with user info
      const videos = await this.videoModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name avatar isVerified')
        .exec();

      // Get total count for pagination
      const totalCount = await this.videoModel.countDocuments(filter);

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      // Get user's likes if authenticated
      let userLikes: Set<string> = new Set();
      if (currentUserId) {
        const likes = await this.videoLikeModel
          .find({
            userId: new Types.ObjectId(currentUserId),
            videoId: { $in: videos.map((v) => v._id) },
          })
          .exec();
        userLikes = new Set(likes.map((like) => like.videoId.toString()));
      }

      // Transform videos to response format
      const videoResponses: VideoResponse[] = videos.map((video) => {
        const user = video.userId as any;
        return {
          id: (video._id as any).toString(),
          title: video.title,
          phone: video.phone,
          whatsapp: video.whatsapp,
          description: video.description,
          videoUrl: `/api/videos/${video._id}/stream`,
          thumbnailUrl: video.thumbnailPath
            ? `/api/videos/${video._id}/thumbnail`
            : undefined,
          user: {
            id: user._id.toString(),
            name: user.name,
            avatar: user.avatar,
            isVerified: user.isVerified || false,
          },
          stats: {
            likes: video.likes,
            comments: video.comments,
            shares: video.shares,
            views: video.views,
          },
          isLiked: userLikes.has((video._id as any).toString()),
          duration: video.duration,
          createdAt: (video as any).createdAt.toISOString(),
          tags: video.tags,
          location: video.location,
          privacy: video.privacy,
        };
      });

      const response = {
        videos: videoResponses,
        hasMore,
        currentPage: page,
        totalPages,
        totalCount,
      };

      // Cache the response for 5 minutes (only if no excludes to keep cache consistent)
      if (!excludes || excludes.length === 0) {
        await this.cacheService.setFeedCache(
          response,
          currentUserId,
          page,
          limit,
          300,
        );
      }

      return response;
    } catch (error) {
      console.error('Error fetching videos feed:', error);
      throw new InternalServerErrorException('Failed to fetch videos feed');
    }
  }

  async findByUserId(
    userId: string,
    query: GetVideosDto,
    currentUserId?: string,
  ): Promise<VideosFeedResponse> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      const { page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      // Get videos for the specific user
      const videos = await this.videoModel
        .find({ 
          userId: new Types.ObjectId(userId),
          isActive: true,
          // Include private videos only if requesting user is the owner
          ...(currentUserId === userId ? {} : { privacy: 'public' })
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name avatar isVerified')
        .exec();

      // Get total count for pagination
      const totalCount = await this.videoModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isActive: true,
        ...(currentUserId === userId ? {} : { privacy: 'public' })
      });

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      // Get user's likes if authenticated
      let userLikes: Set<string> = new Set();
      if (currentUserId) {
        const likes = await this.videoLikeModel
          .find({
            userId: new Types.ObjectId(currentUserId),
            videoId: { $in: videos.map((v) => v._id) },
          })
          .exec();
        userLikes = new Set(likes.map((like) => like.videoId.toString()));
      }

      // Transform videos to response format
      const videoResponses: VideoResponse[] = videos.map((video) => {
        const user = video.userId as any;
        return {
          id: (video._id as any).toString(),
          title: video.title,
          phone: video.phone,
          whatsapp: video.whatsapp,
          description: video.description,
          videoUrl: `/api/videos/${video._id}/stream`,
          thumbnailUrl: video.thumbnailPath
            ? `/api/videos/${video._id}/thumbnail`
            : undefined,
          user: {
            id: user._id.toString(),
            name: user.name,
            avatar: user.avatar,
            isVerified: user.isVerified || false,
          },
          stats: {
            likes: video.likes,
            comments: video.comments,
            shares: video.shares,
            views: video.views,
          },
          isLiked: userLikes.has((video._id as any).toString()),
          duration: video.duration,
          createdAt: (video as any).createdAt.toISOString(),
          tags: video.tags,
          location: video.location,
          privacy: video.privacy,
        };
      });

      return {
        videos: videoResponses,
        hasMore,
        currentPage: page,
        totalPages,
        totalCount,
      };
    } catch (error) {
      console.error('Error fetching user videos:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch user videos');
    }
  }

  async getVideoById(
    videoId: string,
    currentUserId?: string,
  ): Promise<VideoResponse> {
    try {
      if (!Types.ObjectId.isValid(videoId)) {
        throw new BadRequestException('Invalid video ID');
      }

      // Try to get from cache first
      const cachedVideo = await this.cacheService.getVideoCache(
        videoId,
        currentUserId,
      );
      if (cachedVideo) {
        return cachedVideo;
      }

      const video = await this.videoModel
        .findById(videoId)
        .populate('userId', 'name avatar isVerified')
        .exec();

      if (!video) {
        throw new NotFoundException('Video not found');
      }

      // Check if user has access to this video
      if (
        video.privacy === 'private' &&
        video.userId.toString() !== currentUserId
      ) {
        throw new ForbiddenException('You do not have access to this video');
      }

      // Check if user liked this video
      let isLiked = false;
      if (currentUserId) {
        const like = await this.videoLikeModel
          .findOne({
            userId: new Types.ObjectId(currentUserId),
            videoId: new Types.ObjectId(videoId),
          })
          .exec();
        isLiked = !!like;
      }

      const user = video.userId as any;
      const response = {
        id: (video._id as any).toString(),
        title: video.title,
          phone: video.phone,
          whatsapp: video.whatsapp,
        description: video.description,
        videoUrl: `/api/videos/${video._id}/stream`,
        thumbnailUrl: video.thumbnailPath
          ? `/api/videos/${video._id}/thumbnail`
          : undefined,
        user: {
          id: user._id.toString(),
          name: user.name,
          avatar: user.avatar,
          isVerified: user.isVerified || false,
        },
        stats: {
          likes: video.likes,
          comments: video.comments,
          shares: video.shares,
          views: video.views,
        },
        isLiked,
        duration: video.duration,
        createdAt: (video as any).createdAt.toISOString(),
        tags: video.tags,
        location: video.location,
        privacy: video.privacy,
      };

      // Cache the response for 10 minutes
      await this.cacheService.setVideoCache(
        videoId,
        response,
        currentUserId,
        600,
      );

      return response;
    } catch (error) {
      console.error('Error fetching video:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch video');
    }
  }

  async getVideoFile(videoId: string): Promise<{
    filePath: string;
    mimeType: string;
    fileSize: number;
    fileName: string;
  }> {
    try {
      if (!Types.ObjectId.isValid(videoId)) {
        throw new BadRequestException('Invalid video ID');
      }

      const video = await this.videoModel.findById(videoId).exec();
      if (!video) {
        throw new NotFoundException('Video not found');
      }

      // Check if file exists
      if (!existsSync(video.filePath)) {
        throw new NotFoundException('Video file not found');
      }

      return {
        filePath: video.filePath,
        mimeType: video.mimeType,
        fileSize: video.fileSize,
        fileName: video.fileName,
      };
    } catch (error) {
      console.error('Error getting video file:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get video file');
    }
  }

  async getThumbnailFile(videoId: string): Promise<{
    filePath: string;
    mimeType: string;
  }> {
    try {
      if (!Types.ObjectId.isValid(videoId)) {
        throw new BadRequestException('Invalid video ID');
      }

      const video = await this.videoModel.findById(videoId).exec();
      if (!video || !video.thumbnailPath) {
        throw new NotFoundException('Thumbnail not found');
      }

      // Check if file exists
      if (!existsSync(video.thumbnailPath)) {
        throw new NotFoundException('Thumbnail file not found');
      }

      return {
        filePath: video.thumbnailPath,
        mimeType: 'image/jpeg', // Assume JPEG for simplicity
      };
    } catch (error) {
      console.error('Error getting thumbnail file:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get thumbnail file');
    }
  }

  async likeVideo(
    videoId: string,
    userId: string,
  ): Promise<VideoActionResponse> {
    try {
      if (!Types.ObjectId.isValid(videoId)) {
        throw new BadRequestException('Invalid video ID');
      }

      const video = await this.videoModel.findById(videoId).exec();
      if (!video) {
        throw new NotFoundException('Video not found');
      }

      // Check if user already liked this video
      const existingLike = await this.videoLikeModel
        .findOne({
          userId: new Types.ObjectId(userId),
          videoId: new Types.ObjectId(videoId),
        })
        .exec();

      if (existingLike) {
        // Unlike the video
        await this.videoLikeModel.deleteOne({ _id: existingLike._id });
        await this.videoModel.findByIdAndUpdate(videoId, {
          $inc: { likes: -1 },
        });

        // Invalidate cache after like/unlike
        await this.cacheService.invalidateVideoCache(videoId);
        await this.cacheService.invalidateStatsCache(videoId);
        await this.cacheService.invalidateUserVideoStatusCache(userId, videoId);
        await this.cacheService.invalidateFeedCache(); // Public feed
        await this.cacheService.invalidateFeedCache(userId); // User-specific feed

        return {
          success: true,
          message: 'Video unliked successfully',
          isLiked: false,
          likesCount: video.likes - 1,
        };
      } else {
        // Like the video
        const newLike = new this.videoLikeModel({
          userId: new Types.ObjectId(userId),
          videoId: new Types.ObjectId(videoId),
        });
        await newLike.save();

        await this.videoModel.findByIdAndUpdate(videoId, {
          $inc: { likes: 1 },
        });

        // Send push notification to video owner (if not the same user who liked) - async
        if (String(video.userId) !== userId) {
          const ownerId = video.userId.toString();
          setImmediate(async () => {
            try {
              // Get the user who liked the video for the notification content
              const likingUser = await this.usersService.findById(userId);
              if (likingUser) {
                const videoTitle = video.title || 'votre vidéo';
                const userName = likingUser.name || 'Quelqu\'un';
                
                this.notificationsService.sendLikeNotification(
                  ownerId,
                  userName,
                  videoTitle
                );
              }
            } catch (notificationError) {
              console.error('Failed to send video like notification:', notificationError);
              // Don't throw error for notification failure - the like was successful
            }
          });
        }

        // Invalidate cache after like/unlike
        await this.cacheService.invalidateVideoCache(videoId);
        await this.cacheService.invalidateStatsCache(videoId);
        await this.cacheService.invalidateUserVideoStatusCache(userId, videoId);
        await this.cacheService.invalidateFeedCache(); // Public feed
        await this.cacheService.invalidateFeedCache(userId); // User-specific feed

        return {
          success: true,
          message: 'Video liked successfully',
          isLiked: true,
          likesCount: video.likes + 1,
        };
      }
    } catch (error) {
      console.error('Error liking video:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to like video');
    }
  }

  async shareVideo(videoId: string): Promise<VideoActionResponse> {
    try {
      if (!Types.ObjectId.isValid(videoId)) {
        throw new BadRequestException('Invalid video ID');
      }

      const video = await this.videoModel.findById(videoId).exec();
      if (!video) {
        throw new NotFoundException('Video not found');
      }

      // Increment share count
      await this.videoModel.findByIdAndUpdate(videoId, {
        $inc: { shares: 1 },
      });

      return {
        success: true,
        message: 'Video shared successfully',
        sharesCount: video.shares + 1,
      };
    } catch (error) {
      console.error('Error sharing video:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to share video');
    }
  }

  async recordView(
    videoId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(videoId)) {
        return; // Silently fail for invalid IDs in view tracking
      }

      const video = await this.videoModel.findById(videoId).exec();
      if (!video) {
        return; // Silently fail for non-existent videos
      }

      // Check if this is a unique view (within last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Build query to check for existing view
      let viewQuery: any = {
        videoId: new Types.ObjectId(videoId),
        createdAt: { $gte: oneDayAgo },
      };

      // Check for existing view based on user or IP
      if (userId) {
        // If user is authenticated, check by userId
        viewQuery.userId = new Types.ObjectId(userId);
      } else if (ipAddress) {
        // If user is not authenticated, check by IP address and user agent
        viewQuery = {
          ...viewQuery,
          userId: { $exists: false }, // Ensure no userId (anonymous view)
          ipAddress: ipAddress,
          userAgent: userAgent,
        };
      } else {
        // No userId or IP address, can't track properly
        console.log('Cannot track view: no userId or ipAddress provided');
        return;
      }

      // console.log('View query:', JSON.stringify(viewQuery, null, 2));

      const existingView = await this.videoViewModel.findOne(viewQuery).exec();

      if (!existingView) {
        // Record new view
        const newView = new this.videoViewModel({
          videoId: new Types.ObjectId(videoId),
          userId: userId ? new Types.ObjectId(userId) : undefined,
          ipAddress,
          userAgent,
        });

        // console.log('Creating new view:', {
        //   videoId,
        //   userId,
        //   ipAddress,
        //   userAgent,
        // });

        await newView.save();

        // Increment view count
        const updatedVideo = await this.videoModel.findByIdAndUpdate(
          videoId,
          { $inc: { views: 1 } },
          { new: true },
        );

        // console.log(`View recorded! New view count: ${updatedVideo?.views}`);
      } else {
        // console.log('View already exists within 24 hours, not recording duplicate');
      }
    } catch (error) {
      console.error('Error recording view:', error);
      // Silently fail for view tracking to not affect user experience
    }
  }

  // Comment methods
  async createComment(
    videoId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<any> {
    try {
      // Check if video exists
      const video = await this.videoModel.findById(videoId);
      if (!video) {
        throw new NotFoundException('Video not found');
      }

      // Check if parent comment exists (for replies)
      let parentComment: VideoCommentDocument | null = null;
      if (createCommentDto.parentId) {
        parentComment = await this.videoCommentModel.findById(
          createCommentDto.parentId,
        );
        if (!parentComment) {
          throw new NotFoundException('Parent comment not found');
        }
        // Ensure parent comment belongs to the same video
        if ((parentComment as any).videoId.toString() !== videoId) {
          throw new BadRequestException(
            'Parent comment does not belong to this video',
          );
        }
      }

      // Create the comment
      const comment = new this.videoCommentModel({
        videoId: new Types.ObjectId(videoId),
        userId: new Types.ObjectId(userId),
        content: createCommentDto.content,
        parentId: createCommentDto.parentId
          ? new Types.ObjectId(createCommentDto.parentId)
          : null,
      });

      const savedComment = await comment.save();

      // If it's a reply, increment parent comment's reply count
      if (parentComment) {
        console.log(
          `Incrementing reply count for parent comment: ${createCommentDto.parentId}`,
        );
        await this.videoCommentModel.findByIdAndUpdate(
          createCommentDto.parentId,
          { $inc: { replies: 1 } },
        );
      } else {
        // If it's a root comment, increment video's comment count
        console.log(`Incrementing comment count for video: ${videoId}`);
        const updateResult = await this.videoModel.findByIdAndUpdate(
          videoId,
          { $inc: { comments: 1 } },
          { new: true },
        );
        console.log(
          `Video comment count updated. New count: ${updateResult?.comments}`,
        );
      }

      // Populate user info for response
      const populatedComment = await this.videoCommentModel
        .findById(savedComment._id)
        .populate('userId', 'name avatar isVerified')
        .exec();

      // Invalidate comments cache
      await this.cacheService.invalidateCommentsCache(videoId);
      if (createCommentDto.parentId) {
        // If it's a reply, also invalidate the parent comment replies cache
        await this.cacheService.invalidateCommentRepliesCache(
          createCommentDto.parentId,
        );
      }
      // Invalidate video cache to refresh comment count
      await this.cacheService.invalidateVideoCache(videoId);
      await this.cacheService.invalidateStatsCache(videoId);

      // Send push notification to video owner or parent comment owner - async
      setImmediate(async () => {
        try {
          // Get the user who commented for the notification content
          const commentingUser = await this.usersService.findById(userId);
          if (commentingUser) {
            const userName = commentingUser.name || 'Quelqu\'un';
            
            if (createCommentDto.parentId && parentComment) {
              // It's a reply - notify the parent comment owner (if not the same user)
              if (String(parentComment.userId) !== userId) {
                const commentText = createCommentDto.content.length > 50 
                  ? createCommentDto.content.substring(0, 50) + '...' 
                  : createCommentDto.content;
                
                this.notificationsService.sendCommentNotification(
                  String(parentComment.userId),
                  userName,
                  commentText,
                  'votre commentaire'
                );
              }
            }
              // It's a root comment - notify the video owner (if not the same user)
              if (String(video.userId) !== userId) {
                const videoTitle = video.title || 'votre vidéo';
                const commentText = createCommentDto.content.length > 50 
                  ? createCommentDto.content.substring(0, 50) + '...' 
                  : createCommentDto.content;
                
                this.notificationsService.sendCommentNotification(
                  String(video.userId),
                  userName,
                  commentText,
                  videoTitle
                );
              }
            
          }
        } catch (notificationError) {
          console.error('Failed to send comment notification:', notificationError);
          // Don't throw error for notification failure - the comment was successful
        }
      });

      return this.formatCommentResponse(populatedComment);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create comment');
    }
  }

  async getComments(
    videoId: string,
    getCommentsDto: GetCommentsDto,
    userId?: string,
  ): Promise<any> {
    try {
      const page = getCommentsDto.page || 1;
      const limit = Math.min(getCommentsDto.limit || 20, 50);

      // Try to get from cache first
      const cachedComments = await this.cacheService.getCommentsCache(
        videoId,
        page,
        limit,
        'createdAt',
      );
      if (cachedComments) {
        return cachedComments;
      }

      // Check if video exists
      const video = await this.videoModel.findById(videoId);
      if (!video) {
        throw new NotFoundException('Video not found');
      }

      const skip = (page - 1) * limit;

      // Get root comments (no parent)
      const commentsQuery = this.videoCommentModel
        .find({
          videoId: new Types.ObjectId(videoId),
          parentId: null,
          isDeleted: false,
        })
        .populate('userId', 'name avatar isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const comments = await commentsQuery.exec();

      // Get replies for each comment (limited to 3 most recent)
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await this.videoCommentModel
            .find({
              parentId: comment._id,
              isDeleted: false,
            })
            .populate('userId', 'name avatar isVerified')
            .sort({ createdAt: -1 })
            .limit(3)
            .exec();

          const formattedComment = this.formatCommentResponse(comment, userId);
          formattedComment.replies = replies.map((reply) =>
            this.formatCommentResponse(reply, userId),
          );
          formattedComment.hasMoreReplies = comment.replies > 3;

          return formattedComment;
        }),
      );

      // Get total count for pagination
      const totalCount = await this.videoCommentModel.countDocuments({
        videoId: new Types.ObjectId(videoId),
        parentId: null,
        isDeleted: false,
      });

      const totalPages = Math.ceil(totalCount / limit);

      const response = {
        comments: commentsWithReplies,
        pagination: {
          page,
          limit,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      // Cache the response for 5 minutes
      await this.cacheService.setCommentsCache(
        videoId,
        response,
        page,
        limit,
        'createdAt',
        300,
      );

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get comments');
    }
  }

  async getReplies(
    commentId: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<any> {
    try {
      // Check if parent comment exists
      const parentComment = await this.videoCommentModel.findById(commentId);
      if (!parentComment) {
        throw new NotFoundException('Comment not found');
      }

      const skip = (page - 1) * limit;

      const replies = await this.videoCommentModel
        .find({
          parentId: new Types.ObjectId(commentId),
          isDeleted: false,
        })
        .populate('userId', 'name avatar isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const totalCount = await this.videoCommentModel.countDocuments({
        parentId: new Types.ObjectId(commentId),
        isDeleted: false,
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        replies: replies.map((reply) =>
          this.formatCommentResponse(reply, userId),
        ),
        pagination: {
          page,
          limit,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get replies');
    }
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<any> {
    try {
      const comment = await this.videoCommentModel.findById(commentId);
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId.toString() !== userId) {
        throw new ForbiddenException('You can only edit your own comments');
      }

      if (comment.isDeleted) {
        throw new BadRequestException('Cannot edit deleted comment');
      }

      const updatedComment = await this.videoCommentModel
        .findByIdAndUpdate(
          commentId,
          {
            content: updateCommentDto.content,
            updatedAt: new Date(),
          },
          { new: true },
        )
        .populate('userId', 'name avatar isVerified')
        .exec();

      return this.formatCommentResponse(updatedComment, userId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update comment');
    }
  }

  async deleteComment(commentId: string, userId: string): Promise<any> {
    try {
      const comment = await this.videoCommentModel.findById(commentId);
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId.toString() !== userId) {
        throw new ForbiddenException('You can only delete your own comments');
      }

      if (comment.isDeleted) {
        throw new BadRequestException('Comment already deleted');
      }

      // Soft delete the comment
      await this.videoCommentModel.findByIdAndUpdate(commentId, {
        isDeleted: true,
        // content: '[This comment has been deleted]',
        updatedAt: new Date(),
      });

      // If it's a reply, decrement parent comment's reply count
      if (comment.parentId) {
        await this.videoCommentModel.findByIdAndUpdate(comment.parentId, {
          $inc: { replies: -1 },
        });
      } else {
        // If it's a root comment, decrement video's comment count
        await this.videoModel.findByIdAndUpdate(comment.videoId, {
          $inc: { comments: -1 },
        });
      }

      // Invalidate cache after deleting comment
      const videoId = comment.videoId.toString();
      await this.cacheService.invalidateCommentsCache(videoId);
      if (comment.parentId) {
        await this.cacheService.invalidateCommentRepliesCache(
          comment.parentId.toString(),
        );
      }
      await this.cacheService.invalidateVideoCache(videoId);
      await this.cacheService.invalidateStatsCache(videoId);

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete comment');
    }
  }

  async likeComment(commentId: string, userId: string): Promise<any> {
    try {
      const comment = await this.videoCommentModel.findById(commentId);
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.isDeleted) {
        throw new BadRequestException('Cannot like deleted comment');
      }

      // Check if user already liked this comment
      const existingLike = await this.videoCommentLikeModel.findOne({
        commentId: new Types.ObjectId(commentId),
        userId: new Types.ObjectId(userId),
      });

      if (existingLike) {
        // Unlike the comment
        await this.videoCommentLikeModel.findByIdAndDelete(existingLike._id);
        await this.videoCommentModel.findByIdAndUpdate(commentId, {
          $inc: { likes: -1 },
        });

        return { message: 'Comment unliked successfully', liked: false };
      } else {
        // Like the comment
        const newLike = new this.videoCommentLikeModel({
          commentId: new Types.ObjectId(commentId),
          userId: new Types.ObjectId(userId),
        });
        await newLike.save();

        await this.videoCommentModel.findByIdAndUpdate(commentId, {
          $inc: { likes: 1 },
        });

        return { message: 'Comment liked successfully', liked: true };
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to like/unlike comment');
    }
  }

  /**
   * Soft delete a video (mark as inactive)
   */
  async deleteVideo(videoId: string, userId: string): Promise<{ message: string }> {
    try {
      // Find video and verify ownership
      const video = await this.videoModel.findById(videoId).exec();

      if (!video) {
        throw new NotFoundException(`Vidéo non trouvée avec l'ID: ${videoId}`);
      }

      if (video.userId.toString() !== userId) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à supprimer cette vidéo",
        );
      }

      if (!video.isActive) {
        throw new BadRequestException('Cette vidéo est déjà supprimée');
      }

      // Soft delete the video by setting isActive to false
      await this.videoModel.findByIdAndUpdate(
        videoId,
        { 
          isActive: false,
          // Add deleted timestamp for tracking
          deletedAt: new Date()
        },
        { new: true }
      ).exec();

      // Clear cache for this user's videos
      await this.cacheService.invalidateFeedCache(userId);

      return { message: 'Vidéo supprimée avec succès' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de la suppression de la vidéo: ${error.message}`,
      );
    }
  }

  private formatCommentResponse(comment: any, userId?: string): any {
    const user = comment.userId;
    return {
      id: comment._id.toString(),
      content: comment.content,
      likes: comment.likes,
      replies: comment.replies,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar,
        isVerified: user.isVerified || false,
      },
      isOwner: userId ? user._id.toString() === userId : false,
    };
  }

  private async extractVideoDuration(filePath: string): Promise<number> {
    // Simplified duration extraction - in production, use FFprobe
    // For now, return a default duration
    return 30; // 30 seconds default
  }
}
