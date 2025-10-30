import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostFile, PostFileDocument, FileType } from '../../posts/schemas/post-file.schema';
import { WatermarkService } from '../../common/services/watermark.service';
import * as fs from 'fs';
import * as path from 'path';

interface WatermarkCommandOptions {
  startDate?: string;
  endDate?: string;
  dryRun?: boolean;
  imageType?: 'post' | 'avatar' | 'cover' | 'chat' | 'all';
  batchSize?: number;
}

@Injectable()
@Command({
  name: 'watermark:apply',
  description: 'Apply watermarks to existing images',
  arguments: '',
  options: { isDefault: false },
})
export class ApplyWatermarkCommand extends CommandRunner {
  private readonly logger = new Logger(ApplyWatermarkCommand.name);

  constructor(
    @InjectModel('PostFile') private postFileModel: Model<PostFileDocument>,
    private readonly watermarkService: WatermarkService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options: WatermarkCommandOptions,
  ): Promise<void> {
    try {
      this.logger.log('Starting watermark application process...');
      
      const {
        startDate,
        endDate,
        dryRun = false,
        imageType = 'all',
        batchSize = 10,
      } = options;

      this.logger.log(`Options: dryRun=${dryRun}, imageType=${imageType}, batchSize=${batchSize}`);

      // Build query for filtering images
      const query: any = {
        fileType: FileType.IMAGE,
      };

      // Check total PostFile documents for reference
      const totalPostFiles = await this.postFileModel.countDocuments({});
      this.logger.log(`Total PostFile documents in database: ${totalPostFiles}`);

      this.logger.log('Applying query filters...');
      this.logger.log(`Query: ${JSON.stringify(query)}`);

      // Add date filtering if provided
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
          this.logger.log(`Filtering images from: ${startDate}`);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
          this.logger.log(`Filtering images until: ${endDate}`);
        }
      }

      // Get total count of matching images
      this.logger.log('Counting matching image documents...');
      const totalImages = await this.postFileModel.countDocuments(query);
      this.logger.log(`Found ${totalImages} images to process`);

      if (totalImages === 0) {
        this.logger.log('No images found matching the criteria');
        this.logger.log('This could mean:');
        this.logger.log('1. No PostFile documents exist in the database');
        this.logger.log('2. No documents have fileType: "image"');
        this.logger.log('3. No documents match your date criteria');
        return;
      }

      if (dryRun) {
        this.logger.log('DRY RUN MODE - No actual watermarks will be applied');
        
        // Show sample of files that would be processed
        const sampleFiles = await this.postFileModel
          .find(query)
          .limit(5)
          .select('originalName path url createdAt')
          .exec();
        
        this.logger.log(`Sample files that would be processed (${sampleFiles.length} of ${totalImages}):`);
        sampleFiles.forEach((file, index) => {
          const createdAt = (file as any).createdAt || 'Unknown date';
          this.logger.log(`${index + 1}. ${file.originalName} (${createdAt})`);
        });
        
        this.logger.log(`\nTotal: ${totalImages} image files would be watermarked.`);
        return;
      }

      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      this.logger.log(`Starting watermark processing for ${totalImages} images...`);

      // Process images in batches
      for (let skip = 0; skip < totalImages; skip += batchSize) {
        const batch = await this.postFileModel
          .find(query)
          .skip(skip)
          .limit(batchSize)
          .exec();

        this.logger.log(`Processing batch ${Math.floor(skip / batchSize) + 1}/${Math.ceil(totalImages / batchSize)} (${batch.length} files)`);

        const batchPromises = batch.map(async (file) => {
          try {
            await this.processImage(file, imageType);
            successCount++;
            this.logger.debug(`✅ Processed: ${file.originalName}`);
          } catch (error) {
            errorCount++;
            this.logger.error(`❌ Failed to process ${file.originalName}: ${error.message}`);
          }
          processedCount++;
        });

        await Promise.all(batchPromises);

        // Log progress
        const progress = Math.round((processedCount / totalImages) * 100);
        this.logger.log(`Progress: ${processedCount}/${totalImages} (${progress}%)`);
      }

      // Final summary
      this.logger.log('\n=== WATERMARK APPLICATION SUMMARY ===');
      this.logger.log(`Total images processed: ${processedCount}`);
      this.logger.log(`✅ Successfully watermarked: ${successCount}`);
      this.logger.log(`⏭️  Skipped (already watermarked or not found): ${skippedCount}`);
      this.logger.log(`❌ Errors: ${errorCount}`);
      this.logger.log('=====================================\n');

    } catch (error) {
      this.logger.error('Failed to apply watermarks:', error);
      throw error;
    }
  }

  private async processImage(file: PostFileDocument, imageType: string): Promise<void> {
    // Check if file exists
    if (!fs.existsSync(file.path)) {
      throw new Error(`File not found: ${file.path}`);
    }

    // Check if it's an image file that can be watermarked
    if (!this.watermarkService.isImageFile(file.mimeType)) {
      throw new Error(`Unsupported image format: ${file.mimeType}`);
    }

    // Create backup of original file
    const backupPath = `${file.path}.backup`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(file.path, backupPath);
    }

    // Determine watermark configuration based on image type
    let watermarkType: 'post' | 'avatar' | 'cover' | 'chat' = 'post';
    
    if (imageType !== 'all') {
      watermarkType = imageType as 'post' | 'avatar' | 'cover' | 'chat';
    } else {
      // Try to determine type from file path or name
      if (file.path.includes('avatar')) {
        watermarkType = 'avatar';
      } else if (file.path.includes('cover')) {
        watermarkType = 'cover';
      } else if (file.path.includes('chat')) {
        watermarkType = 'chat';
      }
    }

    const watermarkConfig = this.watermarkService.getWatermarkConfig(watermarkType);

    // Apply watermark
    await this.watermarkService.applyWatermark(file.path, file.path, watermarkConfig);
  }

  @Option({
    flags: '-s, --start-date <date>',
    description: 'Start date (YYYY-MM-DD or ISO string) - only process images uploaded after this date',
  })
  parseStartDate(val: string): string {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid start date format. Use YYYY-MM-DD or ISO string.');
    }
    return val;
  }

  @Option({
    flags: '-e, --end-date <date>',
    description: 'End date (YYYY-MM-DD or ISO string) - only process images uploaded before this date',
  })
  parseEndDate(val: string): string {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid end date format. Use YYYY-MM-DD or ISO string.');
    }
    return val;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Preview what would be processed without actually applying watermarks',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-t, --image-type <type>',
    description: 'Type of images to watermark: post, avatar, cover, chat, or all (default: all)',
  })
  parseImageType(val: string): string {
    const validTypes = ['post', 'avatar', 'cover', 'chat', 'all'];
    if (!validTypes.includes(val)) {
      throw new Error(`Invalid image type. Must be one of: ${validTypes.join(', ')}`);
    }
    return val;
  }

  @Option({
    flags: '-b, --batch-size <number>',
    description: 'Number of images to process in parallel (default: 10)',
  })
  parseBatchSize(val: string): number {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1 || num > 50) {
      throw new Error('Batch size must be a number between 1 and 50');
    }
    return num;
  }
}
