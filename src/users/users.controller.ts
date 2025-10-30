import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
  HttpStatus,
  Patch,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesRatesDto } from './dto/update-preferences-rates.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { MulterFile } from './services/user-file.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { UserServicePackageService } from './services/user-service-package.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UserEngagementService } from './services/user-engagement.service';
import { PostsService } from '../posts/services/posts.service';
import { QueryPostDto } from '../posts/dto/query-post.dto';
import { InviteStatsDto } from './dto/invite-stats.dto';
import { InvitedUsersResponseDto } from './dto/invited-users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userServicePackageService: UserServicePackageService,
    private readonly userEngagementService: UserEngagementService,
    private readonly postsService: PostsService,
  ) {}

  @Post()
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List users with pagination',
    description:
      'Retourne une liste paginée de tous les utilisateurs (accessible aux invités)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Utilisateurs récupérés avec succès',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          description: 'Liste des utilisateurs',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' },
              age: { type: 'number' },
              userType: { type: 'string' },
              city: { type: 'string' },
              bio: { type: 'string' },
              isVerified: { type: 'boolean' },
              isPremium: { type: 'boolean' },
              offerings: { type: 'array', items: { type: 'string' } },
              appearance: { type: 'string' },
              clientType: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Paramètres de pagination invalides',
  })
  async findAll(@Query() queryDto: QueryUserDto) {
    try {
      const result = await this.usersService.findAllWithPagination(queryDto);

      // Format response to match the specified structure and sanitize for guests
      return {
        users: result.items.map((user) => this.sanitizeUserForGuests(user)),
        pagination: {
          page: result.meta.currentPage,
          limit: result.meta.itemsPerPage,
          total: result.meta.totalItems,
          totalPages: result.meta.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to retrieve users: ' + error.message,
      );
    }
  }

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: 'Get featured/premium users',
    description:
      "Retourne une liste d'utilisateurs premium/mis en avant (accessible aux invités)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Utilisateurs premium récupérés avec succès',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          description: 'Liste des utilisateurs premium',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' },
              age: { type: 'number' },
              userType: { type: 'string' },
              city: { type: 'string' },
              bio: { type: 'string' },
              isVerified: { type: 'boolean' },
              isPremium: { type: 'boolean' },
              offerings: { type: 'array', items: { type: 'string' } },
              appearance: { type: 'string' },
              clientType: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Paramètres de pagination invalides',
  })
  async getFeaturedUsers(@Query() queryDto: QueryUserDto) {
    try {
      const result = await this.usersService.findFeaturedUsers(queryDto);

      // Format response to match the specified structure and sanitize for guests
      return {
        users: result.items.map((user) => this.sanitizeUserForGuests(user)),
        pagination: {
          page: result.meta.currentPage,
          limit: result.meta.itemsPerPage,
          total: result.meta.totalItems,
          totalPages: result.meta.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to retrieve featured users: ' + error.message,
      );
    }
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Rechercher des utilisateurs avec des filtres',
    description:
      "Retourne une liste paginée d'utilisateurs filtrable par différents critères",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Résultats de recherche récupérés avec succès',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          description: 'Liste des utilisateurs',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              avatar: { type: 'string' },
              age: { type: 'number' },
              userType: { type: 'string' },
              city: { type: 'string' },
              bio: { type: 'string' },
              isVerified: { type: 'boolean' },
              isPremium: { type: 'boolean' },
              offerings: { type: 'array', items: { type: 'string' } },
              appearance: { type: 'string' },
              clientType: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Paramètres de recherche invalides',
  })
  async searchUsers(@Query() queryDto: QueryUserDto) {
    try {
      const result = await this.usersService.searchUsers(queryDto);

      // Format response to match the specified structure
      return {
        users: result.items,
        pagination: {
          page: result.meta.currentPage,
          limit: result.meta.itemsPerPage,
          total: result.meta.totalItems,
          totalPages: result.meta.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to search users: ' + error.message);
    }
  }

  @Get(':id/guest')
  @Public()
  async findOneForGuest(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return this.sanitizeUserForGuests(user);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get single user profile',
    description:
      "Récupère le profil d'un utilisateur spécifique (accessible aux invités)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profil utilisateur récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        avatar: { type: 'string' },
        age: { type: 'number' },
        userType: { type: 'string' },
        city: { type: 'string' },
        bio: { type: 'string' },
        isVerified: { type: 'boolean' },
        isPremium: { type: 'boolean' },
        offerings: { type: 'array', items: { type: 'string' } },
        appearance: { type: 'string' },
        clientType: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Utilisateur non trouvé',
  })
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.usersService.findOne(id);
      return this.sanitizeUserForGuests(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve user: ' + error.message,
      );
    }
  }

  @Get(':id/posts')
  @Public()
  @ApiOperation({
    summary: 'Get user posts with pagination',
    description:
      'Retrieve all posts created by a specific user with pagination support',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'List of user posts',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              city: { type: 'string' },
              clientType: { type: 'string' },
              price: { type: 'number' },
              views: { type: 'number' },
              likesCount: { type: 'number' },
              isActive: { type: 'boolean' },
              isFeatured: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            totalItems: { type: 'number' },
            itemsPerPage: { type: 'number' },
            totalPages: { type: 'number' },
            currentPage: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID or query parameters',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getUserPosts(
    @Param('id') userId: string,
    @Query() queryDto: QueryPostDto,
  ) {
    try {
      const result = await this.postsService.findByUserId(userId, queryDto);
      // Populate only the mainPhoto field
      const populatedItems = await this.postsService.populateMainPhotoOnly(
        result.items,
      );
      return {
        items: populatedItems,
        meta: result.meta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve user posts: ' + error.message,
      );
    }
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    try {
      // Extract user ID from JWT token
      const userId = req.user.sub;

      // Get user from database
      const user = await this.usersService.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Return sanitized user data
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve profile: ' + error.message,
      );
    }
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    try {
      // Extract user ID from JWT token
      const userId = req.user.sub;

      // Update profile using the service
      const updatedUser = await this.usersService.updateProfile(
        userId,
        updateProfileDto,
      );

      // Return sanitized user data (remove sensitive information)
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      }
      if (
        error.message === 'Email is already in use' ||
        error.message === 'Phone number is already in use' ||
        error.message ===
          'User type cannot be changed once set to homme, femme, couple, or autres' ||
        error.message ===
          'User type must be one of: homme, femme, couple, autres'
      ) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'Failed to update profile: ' + error.message,
      );
    }
  }

  @Patch('profile/preferences-rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user preferences and rates information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences and rates updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async updatePreferencesRates(
    @Request() req,
    @Body() updatePreferencesRatesDto: UpdatePreferencesRatesDto,
  ) {
    try {
      // Extract user ID from JWT token
      const userId = req.user.sub;

      // Update preferences and rates using the service
      const updatedUser = await this.usersService.updatePreferencesRates(
        userId,
        updatePreferencesRatesDto,
      );

      // Return sanitized user data
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      }
      if (
        error.message.includes('must be a positive number') ||
        error.message.includes('must be an array')
      ) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'Failed to update preferences and rates: ' + error.message,
      );
    }
  }

  @Patch('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user avatar' })
  @ApiBody({
    description: 'Avatar image file',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or input data',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async updateAvatar(@Request() req, @UploadedFile() file: MulterFile) {
    try {
      if (!file) {
        throw new BadRequestException('No avatar file provided');
      }

      // Extract user ID from JWT token
      const userId = req.user.sub;

      // Update avatar using the service
      const updatedUser = await this.usersService.updateAvatar(userId, file);

      // Return sanitized user data
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException(
        'Failed to update avatar: ' + error.message,
      );
    }
  }

  @Patch('profile/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user cover image' })
  @ApiBody({
    description: 'Cover image file',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cover image updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or input data',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async updateCoverImage(@Request() req, @UploadedFile() file: MulterFile) {
    try {
      if (!file) {
        throw new BadRequestException('No cover image file provided');
      }

      // Extract user ID from JWT token
      const userId = req.user.sub;

      // Update cover image using the service
      const updatedUser = await this.usersService.updateCoverImage(
        userId,
        file,
      );

      // Return sanitized user data
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException(
        'Failed to update cover image: ' + error.message,
      );
    }
  }

  // Service Package CRUD Endpoints
  @Get('profile/packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user service packages' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service packages retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUserPackages(@Request() req) {
    try {
      const userId = req.user.sub;
      const packages =
        await this.userServicePackageService.getUserPackages(userId);
      return { packages };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve packages: ' + error.message,
      );
    }
  }

  @Post('profile/packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service package' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service package created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async createPackage(
    @Request() req,
    @Body() createPackageDto: CreateServicePackageDto,
  ) {
    try {
      const userId = req.user.sub;
      const newPackage = await this.userServicePackageService.createPackage(
        userId,
        createPackageDto,
      );
      return { package: newPackage };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create package: ' + error.message,
      );
    }
  }

  @Put('profile/packages/:packageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service package' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service package updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or package not found',
  })
  async updatePackage(
    @Request() req,
    @Param('packageId') packageId: string,
    @Body() updatePackageDto: UpdateServicePackageDto,
  ) {
    try {
      const userId = req.user.sub;
      const updatedPackage = await this.userServicePackageService.updatePackage(
        userId,
        packageId,
        updatePackageDto,
      );
      return { package: updatedPackage };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update package: ' + error.message,
      );
    }
  }

  @Delete('profile/packages/:packageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service package' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service package deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or package not found',
  })
  async deletePackage(@Request() req, @Param('packageId') packageId: string) {
    try {
      const userId = req.user.sub;
      await this.userServicePackageService.deletePackage(userId, packageId);
      return { message: 'Package deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to delete package: ' + error.message,
      );
    }
  }

  // User Engagement Endpoints

  // Follow/Unfollow System
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User followed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot follow yourself or already following',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async followUser(@Request() req, @Param('id') targetUserId: string) {
    try {
      const followerId = req.user.sub;
      await this.userEngagementService.followUser(followerId, targetUserId);
      return { message: 'User followed successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to follow user: ' + error.message);
    }
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User unfollowed successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async unfollowUser(@Request() req, @Param('id') targetUserId: string) {
    try {
      const followerId = req.user.sub;
      await this.userEngagementService.unfollowUser(followerId, targetUserId);
      return { message: 'User unfollowed successfully' };
    } catch (error) {
      throw new BadRequestException(
        'Failed to unfollow user: ' + error.message,
      );
    }
  }

  @Get(':id/followers')
  @Public()
  @ApiOperation({ summary: 'Get user followers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Followers retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUserFollowers(
    @Param('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    try {
      return await this.userEngagementService.getFollowers(userId, page, limit);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to get followers: ' + error.message,
      );
    }
  }

  @Get(':id/following')
  @Public()
  @ApiOperation({ summary: 'Get users being followed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Following list retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUserFollowing(
    @Param('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    try {
      return await this.userEngagementService.getFollowing(userId, page, limit);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to get following: ' + error.message,
      );
    }
  }

  // Rating System
  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User rated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid rating or already rated',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async rateUser(
    @Request() req,
    @Param('id') targetUserId: string,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    try {
      const raterId = req.user.sub;
      const rating = await this.userEngagementService.rateUser(
        raterId,
        targetUserId,
        createRatingDto,
      );
      return { rating };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to rate user: ' + error.message);
    }
  }

  @Get(':id/ratings')
  @Public()
  @ApiOperation({ summary: 'Get user ratings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ratings retrieved successfully',
  })
  async getUserRatings(
    @Param('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    try {
      return await this.userEngagementService.getUserRatings(
        userId,
        page,
        limit,
      );
    } catch (error) {
      throw new BadRequestException('Failed to get ratings: ' + error.message);
    }
  }

  // Profile View Counter
  @Post(':id/view')
  @Public()
  @ApiOperation({ summary: 'Track profile view' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile view tracked successfully',
  })
  async trackProfileView(@Param('id') userId: string) {
    try {
      await this.userEngagementService.incrementProfileView(userId);
      return { message: 'Profile view tracked' };
    } catch (error) {
      throw new BadRequestException('Failed to track view: ' + error.message);
    }
  }

  // User Stats
  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        posts: { type: 'number', example: 12 },
        views: { type: 'number', example: 1450 },
        likes: { type: 'number', example: 89 },
        followers: { type: 'number', example: 45 },
        rank: { type: 'number', example: 15 },
        rankHistory: {
          type: 'object',
          properties: {
            week: { type: 'number', example: 18 },
            month: { type: 'number', example: 22 },
            year: { type: 'number', example: 35 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUserStats(@Param('id') userId: string) {
    try {
      return await this.userEngagementService.getUserStats(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to get user stats: ' + error.message,
      );
    }
  }

  @Get(':id/follow-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is following this user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Follow status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isFollowing: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getFollowStatus(@Request() req, @Param('id') targetUserId: string) {
    try {
      const currentUserId = req.user.sub;
      const isFollowing = await this.userEngagementService.isFollowing(
        currentUserId,
        targetUserId,
      );
      return { isFollowing };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get follow status: ' + error.message,
      );
    }
  }

  @Get(':id/my-rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's rating for this profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current user's rating for this profile",
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'object', nullable: true },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getMyRating(@Request() req, @Param('id') targetUserId: string) {
    try {
      const currentUserId = req.user.sub;
      const rating = await this.userEngagementService.getUserRatingByRater(
        currentUserId,
        targetUserId,
      );
      return rating;
    } catch (error) {
      throw new BadRequestException('Failed to get rating: ' + error.message);
    }
  }

  // Invite Statistics
  @Get('profile/invite-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user invitation statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation statistics retrieved successfully',
    type: InviteStatsDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getInviteStats(@Request() req) {
    try {
      const currentUserId = req.user.sub;
      const stats = await this.usersService.getInviteStats(currentUserId);
      return stats;
    } catch (error) {
      throw new BadRequestException(
        'Failed to get invite statistics: ' + error.message,
      );
    }
  }

  // GET /users/profile/invited-users
  @Get('profile/invited-users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of users invited by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invited users list retrieved successfully',
    type: InvitedUsersResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getInvitedUsers(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    try {
      const currentUserId = req.user.sub;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const pageNum = page ? parseInt(page, 10) : 1;
      const skip = (pageNum - 1) * limitNum;

      const result = await this.usersService.getInvitedUsers(
        currentUserId,
        limitNum,
        skip,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        'Failed to get invited users: ' + error.message,
      );
    }
  }

  // Helper method to sanitize user data
  private sanitizeUser(user: any) {
    const userData = user.toObject ? user.toObject() : { ...user };

    // Remove sensitive fields
    delete userData.password;
    delete userData.refreshToken;
    delete userData.isAdmin;

    return userData;
  }

  // Helper method to sanitize user data for guest access
  private sanitizeUserForGuests(user: any) {
    const userData = user.toObject ? user.toObject() : { ...user };

    // Remove sensitive fields
    delete userData.password;
    delete userData.refreshToken;
    delete userData.email;
    delete userData.phoneNumber;
    delete userData.isAdmin;

    return userData;
  }
}
