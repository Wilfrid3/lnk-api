import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MulterFile } from '../interfaces';
import { WatermarkService } from '../../common/services/watermark.service';

@Injectable()
export class FileUploadService {
  private readonly uploadDir = path.join(process.cwd(), 'upload');

  constructor(private readonly watermarkService: WatermarkService) {
    // Ensure upload directory exists
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: MulterFile): Promise<string> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const filename = `${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
      const filePath = path.join(this.uploadDir, filename); // Write file
      if (!file.buffer) {
        throw new BadRequestException('Fichier invalide: buffer est manquant');
      }
      fs.writeFileSync(filePath, file.buffer);

      // Apply watermark to images
      if (this.watermarkService.isImageFile(file.mimetype)) {
        try {
          console.log('Applying watermark to uploaded file:', filename);
          const watermarkConfig = this.watermarkService.getWatermarkConfig('post');
          await this.watermarkService.applyWatermark(filePath, filePath, watermarkConfig);
          console.log('Watermark applied successfully to:', filename);
        } catch (error) {
          console.warn('Failed to apply watermark, proceeding without it:', error.message);
          // Continue without watermark - don't block the upload
        }
      }

      // Return relative path
      return `/upload/${filename}`;
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors du chargement du fichier: ${error.message}`,
      );
    }
  }

  async uploadMultipleFiles(files: MulterFile[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  private validateFile(file: MulterFile) {
    // Check file exists
    if (!file) {
      throw new BadRequestException('Fichier non fourni');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'Le fichier est trop volumineux. La taille maximale est de 5MB',
      );
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
        'Format de fichier non supporté. Utilisez JPG, PNG ou WEBP',
      );
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, filename);

      // Check if file exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la suppression du fichier: ${error.message}`,
      );
    }
  }
}
