import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WatermarkService } from '../../common/services/watermark.service';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

@Injectable()
export class UserFileService {
  private readonly uploadDir = path.join(process.cwd(), 'upload');
  private readonly avatarsDir = path.join(this.uploadDir, 'avatars');
  private readonly coversDir = path.join(this.uploadDir, 'covers');

  constructor(private readonly watermarkService: WatermarkService) {
    // Ensure upload directories exist
    this.ensureUploadDirsExist();
  }

  private ensureUploadDirsExist() {
    [this.uploadDir, this.avatarsDir, this.coversDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async uploadAvatar(file: MulterFile, userId: string): Promise<string> {
    try {
      // Validate file
      this.validateImageFile(file);

      // Generate unique filename
      const filename = `avatar-${userId}-${uuidv4()}${this.getFileExtension(file.originalname)}`;
      const filePath = path.join(this.avatarsDir, filename);

      // Write file
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else if (file.path) {
        // If file is already saved by multer, move it to the correct location
        fs.copyFileSync(file.path, filePath);
        fs.unlinkSync(file.path); // Remove original file
      } else {
        throw new BadRequestException('Invalid file data');
      }

      // Apply watermark to avatar
      try {
        console.log('Applying watermark to avatar:', filename);
        const watermarkConfig =
          this.watermarkService.getWatermarkConfig('avatar');
        await this.watermarkService.applyWatermark(
          filePath,
          filePath,
          watermarkConfig,
        );
        console.log('Watermark applied successfully to avatar:', filename);
      } catch (error) {
        console.warn(
          'Failed to apply watermark to avatar, proceeding without it:',
          (error as Error).message,
        );
        // Continue without watermark - don't block the upload
      }

      // Return relative path
      return `/upload/avatars/${filename}`;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error uploading avatar: ${(error as Error).message}`,
      );
    }
  }

  async uploadCoverImage(file: MulterFile, userId: string): Promise<string> {
    try {
      // Validate file
      this.validateImageFile(file);

      // Generate unique filename
      const filename = `cover-${userId}-${uuidv4()}${this.getFileExtension(file.originalname)}`;
      const filePath = path.join(this.coversDir, filename);

      // Write file
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else if (file.path) {
        // If file is already saved by multer, move it to the correct location
        fs.copyFileSync(file.path, filePath);
        fs.unlinkSync(file.path); // Remove original file
      } else {
        throw new BadRequestException('Invalid file data');
      }

      // Apply watermark to cover image
      try {
        console.log('Applying watermark to cover image:', filename);
        const watermarkConfig =
          this.watermarkService.getWatermarkConfig('cover');
        await this.watermarkService.applyWatermark(
          filePath,
          filePath,
          watermarkConfig,
        );
        console.log('Watermark applied successfully to cover image:', filename);
      } catch (error) {
        console.warn(
          'Failed to apply watermark to cover image, proceeding without it:',
          (error as Error).message,
        );
        // Continue without watermark - don't block the upload
      }

      // Return relative path
      return `/upload/covers/${filename}`;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error uploading cover image: ${(error as Error).message}`,
      );
    }
  }

  deleteFile(filePath: string): void {
    try {
      // Convert relative path to absolute path
      const absolutePath = path.join(process.cwd(), filePath);

      // Check if file exists and delete it
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      // Don't throw error if file deletion fails, just log it
      console.warn(
        `Failed to delete file ${filePath}:`,
        (error as Error).message,
      );
    }
  }

  private validateImageFile(file: MulterFile) {
    // Check file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 5MB');
    }

    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file format. Use JPG, PNG, or WEBP',
      );
    }
  }

  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }
}
