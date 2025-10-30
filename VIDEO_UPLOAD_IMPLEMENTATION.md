# Video Upload Implementation Documentation

## Overview

This document describes the implementation of video upload functionality in the Posts API. The system now supports uploading videos alongside images when creating posts, with comprehensive validation and file management.

## Features

- **Multi-format support**: MP4, MOV, AVI video formats
- **Automatic validation**: File size, duration, and format checking
- **Robust error handling**: Graceful fallbacks for video analysis failures
- **Database integration**: Structured storage with metadata
- **API consistency**: Seamless integration with existing post creation workflow

## Database Schema Changes

### Post Schema Updates

The `Post` model has been enhanced with a new `videos` field:

```typescript
@Prop({
  type: [{ type: MongooseSchema.Types.ObjectId, ref: 'PostFile' }],
  default: [],
})
videos: Types.ObjectId[];
```

### PostFile Schema Updates

The `PostFile` model has been extended with file type classification and video metadata:

```typescript
export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Prop({ required: true, enum: FileType })
fileType: FileType;

@Prop({ required: false })
duration?: number; // Duration in seconds (for videos only)
```

## API Endpoint

### POST /posts

**Content-Type**: `multipart/form-data`

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `postData` | string | ✅ | JSON string containing post details |
| `mainPhoto` | file | ❌ | Single main image file |
| `additionalPhotos` | file[] | ❌ | Up to 8 additional image files |
| `videos` | file[] | ❌ | Up to 3 video files |

#### Post Data Structure

```json
{
  "title": "string",
  "description": "string", 
  "services": [{"service": "string", "price": number}],
  "clientType": "homme|femme|couple|tous",
  "appearance": "string",
  "offerings": ["string"],
  "city": "string",
  "neighborhood": "string",
  "travelOption": "reçoit|se déplace|les deux|aucun",
  "phoneNumber": "string",
  "whatsappNumber": "string",
  "isActive": boolean
}
```

## File Specifications

### Video Files

- **Supported formats**: MP4, MOV, AVI
- **Maximum file size**: 50MB per video
- **Maximum duration**: 60 seconds
- **Maximum count**: 3 videos per post
- **Validation**: Automatic duration checking with ffprobe-static

### Image Files

- **Supported formats**: JPG, JPEG, PNG, WEBP
- **Maximum file size**: 5MB per image
- **Main photo**: 1 optional file
- **Additional photos**: Up to 8 files

## Implementation Details

### File Upload Flow

1. **Request Processing**: Files are parsed using `AnyFilesInterceptor`
2. **File Categorization**: Files are separated by fieldname (mainPhoto, additionalPhotos, videos)
3. **Validation**: Each file type is validated according to its specifications
4. **Storage**: Files are saved to the upload directory with unique names
5. **Database Records**: File metadata is stored in the PostFile collection
6. **Post Creation**: Post is created with references to uploaded files

### Video Duration Validation

The system uses `ffprobe-static` for video analysis:

```typescript
private async getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobeStatic.path, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);
    // ... processing logic with fallback to 30 seconds default
  });
}
```

### Error Handling

The system implements multiple layers of error handling:

1. **File type validation**: Checks MIME types and file extensions
2. **Size validation**: Enforces different limits for images and videos
3. **Duration validation**: Validates video duration with graceful fallbacks
4. **Count validation**: Ensures file count limits are respected
5. **Graceful degradation**: Continues upload even if video analysis fails

## Usage Examples

### Frontend Implementation

```javascript
// Create FormData object
const formData = new FormData();

// Add post data as JSON string
formData.append("postData", JSON.stringify({
  title: "Mon annonce avec vidéo",
  description: "Description de mon service",
  city: "Paris",
  clientType: "tous",
  services: [
    { service: "Consultation", price: 50 }
  ],
  offerings: ["service1", "service2"],
  phoneNumber: "+33123456789",
  isActive: true
}));

// Add files
formData.append("mainPhoto", mainImageFile);
formData.append("additionalPhotos", additionalImage1);
formData.append("additionalPhotos", additionalImage2);
formData.append("videos", videoFile1);
formData.append("videos", videoFile2);

// Send request
const response = await fetch("/api/posts", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + token
  },
  body: formData
});

const result = await response.json();
```

### Response Structure

```json
{
  "id": "post_id",
  "title": "Mon annonce avec vidéo",
  "description": "Description...",
  "mainPhoto": {
    "id": "file_id",
    "url": "/upload/filename.jpg",
    "fileType": "IMAGE",
    "size": 1024000
  },
  "additionalPhotos": [
    {
      "id": "file_id",
      "url": "/upload/filename2.jpg", 
      "fileType": "IMAGE"
    }
  ],
  "videos": [
    {
      "id": "file_id",
      "url": "/upload/video.mp4",
      "fileType": "VIDEO",
      "duration": 45,
      "size": 15000000
    }
  ],
  "user": {
    "id": "user_id",
    "name": "Username"
  },
  "createdAt": "2025-09-01T00:00:00.000Z"
}
```

## Error Responses

### Validation Errors

```json
{
  "statusCode": 400,
  "message": "La vidéo est trop volumineuse. La taille maximale est de 50MB",
  "error": "Bad Request"
}
```

### Common Error Messages

- `"Vous ne pouvez télécharger que 3 vidéos maximum"`
- `"Vous ne pouvez télécharger que 8 photos additionnelles maximum"`
- `"Format de vidéo non supporté. Utilisez MP4, MOV ou AVI"`
- `"La durée de la vidéo ne peut pas dépasser 60 secondes"`
- `"Le format des données est invalide. Veuillez fournir un JSON valide."`

## Technical Dependencies

- **ffprobe-static**: For video metadata extraction and duration validation
- **multer**: For multipart file upload handling
- **uuid**: For generating unique file names
- **mongoose**: For database operations and file references

## File Storage Structure

```
upload/
├── mainPhoto-1234567890-123456789.jpg
├── additionalPhotos-1234567890-987654321.png
├── videos-1234567890-555666777.mp4
└── ...
```

## Security Considerations

- File type validation prevents malicious uploads
- File size limits prevent storage abuse
- Duration limits prevent excessive video uploads
- Unique file naming prevents conflicts
- Database references maintain data integrity

## Performance Considerations

- Videos are validated asynchronously
- Fallback mechanisms prevent blocking operations
- File metadata is cached in database
- Population queries are optimized with selective field loading

## Future Enhancements

- Video thumbnail generation
- Video compression for large files
- Streaming support for video playback
- Advanced video format support
- Video preview functionality
