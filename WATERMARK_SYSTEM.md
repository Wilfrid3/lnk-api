# Watermarking System Documentation

## Overview

The LNK API now includes a comprehensive watermarking system that automatically applies subtle watermarks to all uploaded images across the platform. This system is designed to protect content while maintaining image quality and user experience.

## Features

- **Automatic watermarking** for all image uploads
- **Multiple watermark types**: Text-based and logo-based watermarks
- **Configurable positioning**: center, corners
- **Type-specific configurations** for different image types
- **Non-blocking uploads**: Watermarking runs asynchronously
- **Fallback mechanisms**: If watermarking fails, upload continues without watermark
- **High-quality output**: Maintains 90% JPEG quality

## Integration Points

### 1. Post Images
- **Main photos**: Logo watermark, center position, 15% opacity
- **Additional photos**: Logo watermark, center position, 15% opacity
- **Endpoint**: `/posts` (multipart/form-data)

### 2. User Profile Images
- **Avatars**: Text watermark, bottom-right position, 12% opacity
- **Cover images**: Logo watermark, bottom-right position, 10% opacity
- **Endpoints**: `/users/avatar`, `/users/cover-image`

### 3. Chat Attachments
- **Images**: Text watermark, bottom-right position, 10% opacity
- **Endpoint**: `/upload/chat-files`

## Configuration

### Default Settings
- **Opacity**: 10-15% (varies by image type)
- **Size**: 5-8% of image dimensions
- **Position**: Context-dependent (center for posts, corners for profiles)
- **Quality**: 90% JPEG compression

### Watermark Types

#### Text Watermark
- Uses "LNK" text
- White color with shadow effect
- Font: Arial, bold
- Used for: Avatars, chat images

#### Logo Watermark
- Uses SVG logo from `/assets/lnk-logo.svg`
- Scalable vector graphics
- Used for: Posts, cover images

## Technical Implementation

### Technologies Used
- **Sharp**: High-performance image processing
- **SVG**: Scalable watermarks
- **Buffer processing**: In-memory image manipulation

### Performance Considerations
- **Asynchronous processing**: Non-blocking uploads
- **Error handling**: Graceful fallbacks
- **Memory efficient**: Buffer-based processing
- **Quality preservation**: High-quality output settings

### File Support
- **Formats**: JPEG, PNG, WebP, TIFF, BMP
- **Size limits**: Varies by upload type (5MB for posts, etc.)

## API Changes

All existing upload endpoints continue to work unchanged. Watermarking is applied automatically without requiring client-side modifications.

### Response Format
Responses remain the same - watermarked images are returned with the same URLs and metadata as before.

## Monitoring and Logging

The system logs watermarking activities:
- Success/failure of watermark application
- Fallback scenarios
- Performance metrics

## Customization

### Changing Watermark Settings
Modify the `WatermarkService.getWatermarkConfig()` method to adjust settings for different image types.

### Adding New Image Types
Extend the `getWatermarkConfig()` method with new cases for additional upload types.

### Updating the Logo
Replace `/assets/lnk-logo.svg` with a new SVG file maintaining the same dimensions.

## Error Handling

The system is designed to be fault-tolerant:
1. If watermarking fails, upload continues without watermark
2. If logo file is missing, falls back to text watermark
3. All errors are logged for monitoring

## Security Considerations

- Watermarks help identify source of leaked images
- Subtle placement minimizes user experience impact
- Transparent implementation maintains existing API contracts

## Future Enhancements

Potential improvements:
- Dynamic watermark text (user-specific)
- Batch processing for existing images
- Advanced positioning algorithms
- Format-specific optimizations
