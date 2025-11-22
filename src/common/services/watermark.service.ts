import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

export interface WatermarkOptions {
  opacity?: number; // 0-100
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: number; // Percentage of image width/height (5-15)
  text?: string;
  fontColor?: string;
  fontSize?: number;
  useLogo?: boolean; // Whether to use logo instead of text
}

export interface WatermarkResult {
  originalPath: string;
  watermarkedPath: string;
  originalSize: number;
  watermarkedSize: number;
}

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);
  private readonly defaultWatermarkText = 'YamoZone';
  
  // Default configuration
  private readonly defaultOptions: WatermarkOptions = {
    opacity: 50, // Increased to 50% for better visibility during testing
    position: 'center',
    size: 45, // Increased size to 20% of image dimensions for better visibility
    text: this.defaultWatermarkText,
    fontColor: '#ff6997',
    fontSize: 24,
    useLogo: true, // Enable logo now that we have the SVG
  };
  
  private readonly logoPath = path.join(process.cwd(), 'assets', 'watermark.svg');

  /**
   * Apply watermark to an image file
   */
  async applyWatermark(
    inputPath: string,
    outputPath?: string,
    options?: Partial<WatermarkOptions>,
  ): Promise<WatermarkResult> {
    try {
      if (!fs.existsSync(inputPath)) {
        throw new BadRequestException(`Input file not found: ${inputPath}`);
      }

      const config = { ...this.defaultOptions, ...options };
      const finalOutputPath = outputPath || inputPath;

      this.logger.debug(`Applying watermark to: ${inputPath}`);
      this.logger.debug(`Watermark config:`, config);

      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Could not determine image dimensions');
      }

      const originalSize = fs.statSync(inputPath).size;

      // Calculate watermark dimensions
      const watermarkSize = Math.min(
        Math.floor((metadata.width * config.size!) / 100),
        Math.floor((metadata.height * config.size!) / 100),
      );

      // Create watermark (logo or text)
      let watermarkBuffer: Buffer;
      let actualWatermarkWidth = watermarkSize;
      let actualWatermarkHeight = watermarkSize;
      
      try {
        if (config.useLogo && fs.existsSync(this.logoPath)) {
          // For logo, calculate proper dimensions from viewBox
          const logoSvg = fs.readFileSync(this.logoPath, 'utf-8');
          const viewBoxMatch = logoSvg.match(/viewBox="([^"]+)"/);
          
          if (viewBoxMatch) {
            const viewBoxValues = viewBoxMatch[1].split(/\s+/).map(Number);
            if (viewBoxValues.length >= 4) {
              const [x, y, vbWidth, vbHeight] = viewBoxValues;
              const aspectRatio = vbWidth / vbHeight;
              
              this.logger.debug(`Logo aspect ratio: ${aspectRatio} (${vbWidth}x${vbHeight})`);
              
              if (aspectRatio > 1) {
                actualWatermarkWidth = watermarkSize;
                actualWatermarkHeight = Math.round(watermarkSize / aspectRatio);
              } else {
                actualWatermarkHeight = watermarkSize;
                actualWatermarkWidth = Math.round(watermarkSize * aspectRatio);
              }
              
              this.logger.debug(`Actual watermark dimensions: ${actualWatermarkWidth}x${actualWatermarkHeight}`);
            }
          }
          
          watermarkBuffer = this.createLogoWatermark(
            watermarkSize,
            config.opacity!,
          );
        } else {
          // Create text watermark SVG with calculated dimensions
          const fontSize = Math.max(32, Math.floor(watermarkSize * 0.6));
          const estimatedTextWidth = config.text!.length * fontSize * 0.6;
          const textHeight = fontSize * 1.2;
          
          actualWatermarkWidth = Math.max(watermarkSize, estimatedTextWidth + 20);
          actualWatermarkHeight = Math.max(watermarkSize, textHeight + 20);
          
          const watermarkSvg = this.createTextWatermarkSvg(
            config.text!,
            watermarkSize,
            config.fontColor!,
            config.opacity!,
          );
          watermarkBuffer = Buffer.from(watermarkSvg);
        }
      } catch (logoError) {
        this.logger.warn('Logo watermark failed, falling back to text:', logoError.message);
        // Fallback to text watermark
        const fontSize = Math.max(32, Math.floor(watermarkSize * 0.6));
        const estimatedTextWidth = config.text!.length * fontSize * 0.6;
        const textHeight = fontSize * 1.2;
        
        actualWatermarkWidth = Math.max(watermarkSize, estimatedTextWidth + 20);
        actualWatermarkHeight = Math.max(watermarkSize, textHeight + 20);
        
        const watermarkSvg = this.createTextWatermarkSvg(
          config.text!,
          watermarkSize,
          config.fontColor!,
          config.opacity!,
        );
        watermarkBuffer = Buffer.from(watermarkSvg);
      }

      // Calculate position using actual watermark dimensions
      const position = this.calculatePosition(
        metadata.width,
        metadata.height,
        actualWatermarkWidth,
        actualWatermarkHeight,
        config.position!,
      );

      // Use temporary file if input and output are the same
      const needsTempFile = inputPath === finalOutputPath;
      const workingOutputPath = needsTempFile 
        ? `${inputPath}.tmp${Date.now()}` 
        : finalOutputPath;

      // Determine output format based on input format
      const outputFormat = metadata.format === 'png' ? 'png' : 'jpeg';
      const sharpInstance = sharp(inputPath)
        .composite([
          {
            input: watermarkBuffer,
            top: position.top,
            left: position.left,
            blend: 'over',
          },
        ]);

      // Apply appropriate format options and save
      if (outputFormat === 'png') {
        await sharpInstance.png({ quality: 90 }).toFile(workingOutputPath);
      } else {
        await sharpInstance.jpeg({ quality: 90 }).toFile(workingOutputPath);
      }

      // If we used a temp file, replace the original
      if (needsTempFile) {
        fs.renameSync(workingOutputPath, finalOutputPath);
      }

      const watermarkedSize = fs.statSync(finalOutputPath).size;

      this.logger.debug(`Watermark applied successfully. Original: ${originalSize}b, Watermarked: ${watermarkedSize}b`);

      return {
        originalPath: inputPath,
        watermarkedPath: finalOutputPath,
        originalSize,
        watermarkedSize,
      };
    } catch (error) {
      this.logger.error(`Error applying watermark to ${inputPath}:`, error);
      throw new BadRequestException(`Watermark failed: ${error.message}`);
    }
  }

  /**
   * Apply watermark to image buffer
   */
  async applyWatermarkToBuffer(
    imageBuffer: Buffer,
    options?: Partial<WatermarkOptions>,
  ): Promise<Buffer> {
    try {
      const config = { ...this.defaultOptions, ...options };

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Could not determine image dimensions');
      }

      // Calculate watermark dimensions
      const watermarkSize = Math.min(
        Math.floor((metadata.width * config.size!) / 100),
        Math.floor((metadata.height * config.size!) / 100),
      );

      // Create text watermark SVG
      const watermarkSvg = this.createTextWatermarkSvg(
        config.text!,
        watermarkSize,
        config.fontColor!,
        config.opacity!,
      );

      // Calculate position
      const position = this.calculatePosition(
        metadata.width,
        metadata.height,
        watermarkSize,
        watermarkSize,
        config.position!,
      );

      // Apply watermark and return buffer
      return await sharp(imageBuffer)
        .composite([
          {
            input: Buffer.from(watermarkSvg),
            top: position.top,
            left: position.left,
            blend: 'over',
          },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Error applying watermark to buffer:', error);
      throw new BadRequestException(`Watermark failed: ${error.message}`);
    }
  }

  /**
   * Process multiple images asynchronously
   */
  async processMultipleImages(
    imagePaths: string[],
    options?: Partial<WatermarkOptions>,
  ): Promise<WatermarkResult[]> {
    this.logger.debug(`Processing ${imagePaths.length} images with watermarks`);
    
    const promises = imagePaths.map(async (imagePath) => {
      try {
        return await this.applyWatermark(imagePath, undefined, options);
      } catch (error) {
        this.logger.error(`Failed to watermark ${imagePath}:`, error);
        // Return original file info if watermarking fails
        const originalSize = fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0;
        return {
          originalPath: imagePath,
          watermarkedPath: imagePath,
          originalSize,
          watermarkedSize: originalSize,
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Check if file is an image that can be watermarked
   */
  isImageFile(mimetype: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/bmp',
    ];
    return supportedTypes.includes(mimetype.toLowerCase());
  }

  /**
   * Get watermark configuration for different image types
   */
  getWatermarkConfig(imageType: 'post' | 'avatar' | 'cover' | 'chat'): Partial<WatermarkOptions> {
    switch (imageType) {
      case 'avatar':
        return {
          opacity: 30, // Increased for testing
          size: 10,
          position: 'bottom-right',
          useLogo: true, // Enable logo for avatars
        };
      case 'cover':
        return {
          opacity: 25, // Increased for testing
          size: 8,
          position: 'bottom-right',
          useLogo: true, // Enable logo for covers
        };
      case 'post':
        return {
          opacity: 60, // Increased for better visibility
          size: 25, // Increased size to 25% for better visibility
          position: 'center',
          useLogo: true, // Enable logo for posts
        };
      case 'chat':
        return {
          opacity: 25, // Increased for testing
          size: 8,
          position: 'bottom-right',
          useLogo: true, // Enable logo for chat images
        };
      default:
        return this.defaultOptions;
    }
  }

  /**
   * Create SVG watermark with text
   */
  private createTextWatermarkSvg(
    text: string,
    size: number,
    color: string,
    opacity: number,
  ): string {
    // Make font size more proportional - use 60% of the watermark size but with minimum 32px
    const fontSize = Math.max(32, Math.floor(size * 0.6)); 
    const actualOpacity = opacity / 100;
    
    // Calculate SVG dimensions based on text length - text is usually wider than tall
    // Approximate character width is about 0.6 * fontSize for Arial bold
    const estimatedTextWidth = text.length * fontSize * 0.6;
    const textHeight = fontSize * 1.2; // Add some padding for descenders
    
    // Make SVG wide enough for the text with some padding
    const svgWidth = Math.max(size, estimatedTextWidth + 20);
    const svgHeight = Math.max(size, textHeight + 20);

    return `
      <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.7"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="transparent"/>
        <text x="50%" y="50%" 
              text-anchor="middle" 
              dominant-baseline="middle"
              font-family="Arial, sans-serif" 
              font-size="${fontSize}px" 
              font-weight="bold"
              stroke="white"
              stroke-width="2"
              fill="${color}" 
              opacity="${actualOpacity}"
              filter="url(#shadow)">
          ${text}
        </text>
      </svg>
    `;
  }

  /**
   * Create logo watermark from SVG file
   */
  private createLogoWatermark(
    size: number,
    opacity: number,
  ): Buffer {
    try {
      let logoSvg = fs.readFileSync(this.logoPath, 'utf-8');

      // Extract viewBox to calculate aspect ratio
      const viewBoxMatch = logoSvg.match(/viewBox="([^"]+)"/);
      let logoWidth = size;
      let logoHeight = size;
      
      if (viewBoxMatch) {
        const viewBoxValues = viewBoxMatch[1].split(/\s+/).map(Number);
        if (viewBoxValues.length >= 4) {
          const [x, y, vbWidth, vbHeight] = viewBoxValues;
          const aspectRatio = vbWidth / vbHeight;
          
          this.logger.debug(`Logo viewBox: ${x} ${y} ${vbWidth} ${vbHeight}, aspect ratio: ${aspectRatio}`);
          
          // Adjust dimensions to maintain aspect ratio
          if (aspectRatio > 1) {
            // Logo is wider than tall
            logoWidth = size;
            logoHeight = Math.round(size / aspectRatio);
          } else {
            // Logo is taller than wide
            logoHeight = size;
            logoWidth = Math.round(size * aspectRatio);
          }
          
          this.logger.debug(`Calculated logo dimensions: ${logoWidth}x${logoHeight}`);
        }
      }

      // Extract the content inside the SVG tags while preserving CSS and structure
      const svgContentMatch = logoSvg.match(/<svg[^>]*>(.*)<\/svg>/s);
      if (!svgContentMatch) {
        throw new Error('Could not parse SVG content');
      }
      
      const svgContent = svgContentMatch[1];
      const actualOpacity = opacity / 100;
      
      // Create a new SVG with explicit dimensions and opacity wrapper
      // This preserves all CSS classes and styling
      const watermarkedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 335.95 98.5" width="${logoWidth}" height="${logoHeight}">
  <g opacity="${actualOpacity}">
    ${svgContent}
  </g>
</svg>`;

      return Buffer.from(watermarkedSvg, 'utf-8');
    } catch (error) {
      // Fallback to text watermark if logo fails
      this.logger.warn(
        'Logo watermark failed, falling back to text:',
        (error as Error).message,
      );
      const textSvg = this.createTextWatermarkSvg('YamoZone', size, '#FFFFFF', opacity);
      return Buffer.from(textSvg, 'utf-8');
    }
  }

  /**
   * Calculate watermark position
   */
  private calculatePosition(
    imageWidth: number,
    imageHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    position: string,
  ): { top: number; left: number } {
    const margin = 20; // Margin from edges

    switch (position) {
      case 'top-left':
        return { top: margin, left: margin };
      case 'top-right':
        return { 
          top: margin, 
          left: imageWidth - watermarkWidth - margin 
        };
      case 'bottom-left':
        return { 
          top: imageHeight - watermarkHeight - margin, 
          left: margin 
        };
      case 'bottom-right':
        return { 
          top: imageHeight - watermarkHeight - margin, 
          left: imageWidth - watermarkWidth - margin 
        };
      case 'center':
      default:
        return { 
          top: Math.floor((imageHeight - watermarkHeight) / 2), 
          left: Math.floor((imageWidth - watermarkWidth) / 2) 
        };
    }
  }
}
