/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MulterFile } from '../interfaces';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PostsService } from '../services/posts.service';
import { UpdatePostDto } from '../dto/update-post.dto';
import { QueryPostDto } from '../dto/query-post.dto';
import { FileUploadDto } from '../dto/file-upload.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle annonce avec images' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Annonce créée avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorisé',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        postData: {
          type: 'string',
          description: 'Post data as JSON string',
        },
        mainPhoto: {
          type: 'string',
          format: 'binary',
          description: 'Main photo for the post',
        },
        additionalPhotos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Additional photos for the post (max 8)',
        },
        videos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Videos for the post (max 3, MP4/MOV/AVI, max 50MB each, max 60s duration)',
        },
      },
    },
  })
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'upload');
          // Ensure directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Allow images
        if (file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return cb(null, true);
        }
        // Allow videos
        if (file.originalname.match(/\.(mp4|mov|avi)$/)) {
          return cb(null, true);
        }
        return cb(
          new Error(
            'Seules les images (jpg, jpeg, png, webp) et les vidéos (mp4, mov, avi) sont autorisées',
          ),
          false,
        );
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB (max for videos)
      },
    }),
  )
  async create(
    @Request() req,
    @Body('postData') postDataString: string,
    @UploadedFiles() files: MulterFile[],
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;

    // Parse post data from JSON string
    let postData;
    try {
      postData = JSON.parse(postDataString);
    } catch (error) {
      throw new BadRequestException(
        'Le format des données est invalide. Veuillez fournir un JSON valide.',
      );
    }

    console.log('Received files:', files);

    // Extract main photo, additional photos, and videos from the files array
    const mainPhotoFiles = files.filter(
      (file) => file.fieldname === 'mainPhoto',
    );
    const additionalPhotoFiles = files.filter(
      (file) => file.fieldname === 'additionalPhotos',
    );
    const videoFiles = files.filter((file) => file.fieldname === 'videos');

    const mainPhoto = mainPhotoFiles.length > 0 ? mainPhotoFiles[0] : undefined;

    console.log('Main photo:', mainPhoto ? mainPhoto.originalname : 'None');
    console.log(
      'Additional photos:',
      additionalPhotoFiles.length,
      additionalPhotoFiles.map((f) => f.originalname),
    );
    console.log(
      'Videos:',
      videoFiles.length,
      videoFiles.map((f) => f.originalname),
    );

    // Validate required fields in postData
    if (!postData.title) {
      throw new BadRequestException('Le titre est requis');
    }
    if (!postData.description) {
      throw new BadRequestException('La description est requise');
    }
    if (!postData.city) {
      throw new BadRequestException('La ville est requise');
    }

    // Ensure services is an array
    if (!Array.isArray(postData.services)) {
      postData.services = [];
    }

    // Ensure arrays are initialized
    if (!Array.isArray(postData.offerings)) {
      postData.offerings = [];
    }
    console.log('Creating post with data:', {
      title: postData.title,
      clientType: postData.clientType,
      city: postData.city,
      services: postData.services?.length || 0,
    });

    return this.postsService.createWithFiles(
      userId,
      postData,
      mainPhoto,
      additionalPhotoFiles,
      videoFiles,
    );
  }

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: 'Obtenir les annonces mises en avant',
    description:
      "Retourne jusqu'à 10 annonces marquées comme mises en avant (isFeatured=true)",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des annonces mises en avant récupérée avec succès',
  })
  async findFeatured() {
    return this.postsService.findFeatured();
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Obtenir toutes les annonces avec pagination',
    description:
      "Retourne une liste paginée d'annonces avec leurs photos et informations sur le propriétaire.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste paginée d'annonces récupérée avec succès.",
  })
  findAll(@Query() queryDto: QueryPostDto) {
    return this.postsService.findAll(queryDto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Rechercher des annonces avec des filtres' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Résultats de recherche récupérés avec succès',
  })
  async search(@Query() queryDto: QueryPostDto) {
    return this.postsService.search(queryDto);
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({
    summary: "Récupérer toutes les annonces d'un utilisateur spécifique",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Liste des annonces de l'utilisateur récupérée avec succès",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID utilisateur invalide',
  })
  async findByUserId(
    @Param('userId') userId: string,
    @Query() queryDto: QueryPostDto,
  ) {
    return this.postsService.findByUserId(userId, queryDto);
  }

  @Get('cities/top-cities')
  @Public()
  @ApiOperation({
    summary: 'Obtenir les villes avec le plus de posts',
    description: 'Retourne la liste des villes classées par nombre de posts décroissant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des villes récupérée avec succès',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          city: { type: 'string', example: 'Yaoundé' },
          count: { type: 'number', example: 10 },
        },
      },
    },
  })
  async getTopCities() {
    return this.postsService.getTopCities();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtenir une annonce par ID' })
  @ApiResponse({
    status: 200,
    description:
      'Annonce trouvée avec informations du propriétaire et fichiers inclus.',
  })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée.' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une annonce par ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Annonce mise à jour avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides ou utilisateur non propriétaire',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Annonce non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorisé',
  })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    const userId = req.user.sub;
    return this.postsService.update(id, userId, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une annonce par ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Annonce supprimée avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Utilisateur non propriétaire',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Annonce non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorisé',
  })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    await this.postsService.remove(id, userId);
    return { message: 'Annonce supprimée avec succès' };
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Photo à télécharger',
    type: FileUploadDto,
  })
  @ApiOperation({ summary: 'Télécharger une photo pour une annonce' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Photo téléchargée avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Fichier invalide ou utilisateur non propriétaire',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Annonce non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorisé',
  })
  async uploadPhoto(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: MulterFile,
    @Body() fileUploadDto: FileUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier n'a été téléchargé");
    }

    const userId = req.user.sub;
    const isMainPhoto = fileUploadDto.isMainPhoto || false;

    return this.postsService.uploadPhoto(id, userId, file, isMainPhoto);
  }

  @Post(':id/additional-photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('additionalPhotos', 10)) // Allow up to 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Ajouter plusieurs photos additionnelles à une annonce existante',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Photos additionnelles ajoutées avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Fichiers invalides ou utilisateur non propriétaire',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Annonce non trouvée',
  })
  async addAdditionalPhotos(
    @Param('id') id: string,
    @Request() req,
    @UploadedFiles() additionalPhotos: MulterFile[],
  ) {
    if (!additionalPhotos || additionalPhotos.length === 0) {
      throw new BadRequestException("Aucun fichier n'a été téléchargé");
    }

    const userId = req.user.sub;

    // Process and add all additional photos to the post
    return this.postsService.addAdditionalPhotos(id, userId, additionalPhotos);
  }

  // Like/Unlike System
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post liked successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Post already liked by this user',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
  })
  async likePost(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.postsService.likePost(id, userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post unliked successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Post not liked by this user',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
  })
  async unlikePost(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.postsService.unlikePost(id, userId);
  }

  @Get(':id/like-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if post is liked by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Like status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isLiked: { type: 'boolean', example: true },
      },
    },
  })
  async getPostLikeStatus(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    const isLiked = await this.postsService.isPostLikedByUser(id, userId);
    return { isLiked };
  }
}
