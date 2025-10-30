import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as ffprobeStatic from 'ffprobe-static';
import { MulterFile } from '../interfaces';
import {
  PostFile,
  PostFileDocument,
  FileType,
} from '../schemas/post-file.schema';
import { WatermarkService } from '../../common/services/watermark.service';

@Injectable()
export class PostFileService {
  private readonly uploadDir = path.join(process.cwd(), 'upload');
  constructor(
    @InjectModel('PostFile') private postFileModel: Model<PostFileDocument>,
    private readonly watermarkService: WatermarkService,
  ) {
    // Ensure upload directory exists
    this.ensureUploadDirExists();

    if (!this.postFileModel) {
      console.error('PostFile model is not available!');
    } else {
      console.log('PostFileService initialized with model');
    }
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }
  /**
   * Upload a file and save its metadata to the database
   */
  async uploadFile(
    file: MulterFile,
    userId: string,
    postId?: string,
  ): Promise<PostFileDocument> {
    try {
      console.log('Starting file upload for:', file.originalname);

      // Validate file
      await this.validateFile(file);

      // Determine file type
      const fileType = this.getFileType(file.mimetype);

      // For files from AnyFilesInterceptor, the file is already saved, so we use the existing path
      let filePath: string;
      let url: string;
      let duration: number | undefined;

      if (file.path) {
        // File is already saved by Multer
        filePath = file.path;
        const filename = path.basename(file.path);
        url = `/upload/${filename}`;
        console.log('File already saved at:', filePath);
      } else {
        // Manual save for buffer-based uploads
        const filename = `${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
        filePath = path.join(this.uploadDir, filename);
        url = `/upload/${filename}`;

        // Write file
        if (!file.buffer) {
          throw new BadRequestException(
            'Fichier invalide: buffer est manquant',
          );
        }
        fs.writeFileSync(filePath, file.buffer);
        console.log('File saved to:', filePath);
      }

      // Get video duration if it's a video file
      if (fileType === FileType.VIDEO) {
        try {
          duration = await this.getVideoDuration(filePath);
        } catch (error) {
          console.warn('Could not get video duration:', error.message);
        }
      }

      // Apply watermark to images asynchronously (non-blocking)
      if (fileType === FileType.IMAGE && this.watermarkService.isImageFile(file.mimetype)) {
        try {
          console.log('Applying watermark to image:', filePath);
          const watermarkConfig = this.watermarkService.getWatermarkConfig('post');
          await this.watermarkService.applyWatermark(filePath, filePath, watermarkConfig);
          console.log('Watermark applied successfully to:', filePath);
        } catch (error) {
          console.warn('Failed to apply watermark, proceeding without it:', error.message);
          // Continue without watermark - don't block the upload
        }
      }

      // Create file record in database
      const postFile = new this.postFileModel({
        originalName: file.originalname,
        path: filePath,
        url: url,
        mimeType: file.mimetype,
        size: file.size,
        fileType: fileType,
        userId: new Types.ObjectId(userId),
        ...(postId && { postId: new Types.ObjectId(postId) }),
        ...(duration && { duration }),
      });

      console.log('Creating file record in database:', {
        originalName: file.originalname,
        path: filePath,
        url: url,
        fileType: fileType,
        duration: duration,
      });

      // Save to database and return
      const saved = await postFile.save();
      console.log('File record created with ID:', saved._id);
      return saved;
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors du chargement du fichier: ${error.message}`,
      );
    }
  }
  /**
   * Upload multiple files and save their metadata
   */
  async uploadMultipleFiles(
    files: MulterFile[],
    userId: string,
    postId?: string,
  ): Promise<PostFileDocument[]> {
    console.log(`Uploading ${files.length} files for post ${postId || 'new'}`);
    const uploadPromises = files.map((file) =>
      this.uploadFile(file, userId, postId),
    );
    const results = await Promise.all(uploadPromises);
    // console.log(
    //   `Successfully uploaded ${results.length} files with IDs:`,
    //   results.map((doc) => doc._id),
    // );
    return results;
  }

  /**
   * Validate if a file meets requirements
   */
  private async validateFile(file: MulterFile) {
    // Check file exists
    if (!file) {
      throw new BadRequestException('Fichier non fourni');
    }

    const fileType = this.getFileType(file.mimetype);

    if (fileType === FileType.IMAGE) {
      // Image validation
      const maxImageSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxImageSize) {
        throw new BadRequestException(
          "L'image est trop volumineuse. La taille maximale est de 5MB",
        );
      }

      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
      ];
      if (!allowedImageTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          "Format d'image non supporté. Utilisez JPG, PNG ou WEBP",
        );
      }
    } else if (fileType === FileType.VIDEO) {
      // Video validation
      const maxVideoSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxVideoSize) {
        throw new BadRequestException(
          'La vidéo est trop volumineuse. La taille maximale est de 50MB',
        );
      }

      const allowedVideoTypes = [
        'video/mp4',
        'video/quicktime', // .mov files
        'video/x-msvideo', // .avi files
      ];
      if (!allowedVideoTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Format de vidéo non supporté. Utilisez MP4, MOV ou AVI',
        );
      }

      // Check video duration if file path is available
      if (file.path) {
        try {
          const duration = await this.getVideoDuration(file.path);
          if (duration > 60) {
            throw new BadRequestException(
              'La durée de la vidéo ne peut pas dépasser 60 secondes',
            );
          }
        } catch (error) {
          console.warn(
            'Could not validate video duration, proceeding anyway:',
            error.message,
          );
          // Don't throw here, allow upload to continue
        }
      }
    } else {
      throw new BadRequestException(
        'Type de fichier non supporté. Utilisez des images (JPG, PNG, WEBP) ou des vidéos (MP4, MOV, AVI)',
      );
    }
  }

  /**
   * Determine file type based on MIME type
   */
  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    } else {
      throw new BadRequestException('Type de fichier non supporté');
    }
  }

  /**
   * Get video duration using ffprobe-static
   */
  private async getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(ffprobeStatic.path, [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          console.warn(`ffprobe exited with code ${code}, stderr: ${stderr}`);
          // Return a default duration if ffprobe fails
          resolve(30); // Default to 30 seconds if we can't determine duration
          return;
        }

        try {
          const result = JSON.parse(stdout);

          if (result.format && result.format.duration) {
            const duration = parseFloat(result.format.duration);
            if (isNaN(duration)) {
              console.warn(
                'Could not parse video duration from ffprobe output',
              );
              resolve(30); // Default fallback
            } else {
              resolve(Math.round(duration));
            }
          } else {
            console.warn('No duration found in ffprobe output');
            resolve(30); // Default fallback
          }
        } catch (error) {
          console.warn('Error parsing ffprobe JSON output:', error.message);
          resolve(30); // Default fallback
        }
      });

      ffprobe.on('error', (error) => {
        console.warn('ffprobe spawn error:', error.message);
        resolve(30); // Default fallback
      });
    });
  }

  /**
   * Delete a file and its database record
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      // Find file in database
      const file = await this.postFileModel.findById(fileId).exec();
      if (!file) {
        throw new BadRequestException(`Fichier avec ID ${fileId} non trouvé`);
      }

      // Delete physical file if it exists
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Remove from database
      await file.deleteOne();
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la suppression du fichier: ${error.message}`,
      );
    }
  }

  /**
   * Get a file by ID
   */
  async getFileById(fileId: string): Promise<PostFileDocument> {
    const file = await this.postFileModel.findById(fileId).exec();
    if (!file) {
      throw new BadRequestException(`Fichier avec ID ${fileId} non trouvé`);
    }
    return file;
  }

  /**
   * Get files by post ID
   */
  async getFilesByPostId(postId: string): Promise<PostFileDocument[]> {
    return this.postFileModel
      .find({ postId: new Types.ObjectId(postId) })
      .exec();
  }
}

// Examining post-file.service.ts content
