# Videos Module

A comprehensive TikTok-like video system for the LNK API, providing video upload, streaming, social interactions, and content management capabilities.

## 🎯 Features

### Core Functionality
- **Video Upload**: Upload videos with metadata and optional thumbnails
- **Video Streaming**: HTTP Range-supported video streaming for efficient playback
- **Thumbnail Management**: Automatic thumbnail serving and custom thumbnail upload
- **Social Interactions**: Like/unlike videos and share tracking
- **View Tracking**: Intelligent view counting with duplicate prevention
- **Content Feed**: Paginated video feed with user information

### Advanced Features
- **File Validation**: Comprehensive file type and size validation
- **Privacy Controls**: Public/private video settings
- **User Integration**: Full user profile integration with verification status
- **Real-time Stats**: Live statistics for likes, views, shares, and comments
- **Mobile Optimization**: Optimized for mobile video consumption
- **Production Ready**: Error handling, logging, and performance optimizations

## 📁 Module Structure

```
src/videos/
├── README.md                    # This documentation
├── videos.controller.ts         # API endpoints and request handling
├── videos.service.ts           # Business logic and data operations
├── videos.module.ts            # Module configuration and dependencies
├── dto/
│   ├── create-video.dto.ts     # Video creation data transfer object
│   └── get-videos.dto.ts       # Video feed query parameters
├── schemas/
│   ├── video.schema.ts         # Main video document schema
│   ├── video-like.schema.ts    # Video likes tracking schema
│   └── video-view.schema.ts    # Video views tracking schema
└── interfaces/
    └── video.interface.ts      # TypeScript interfaces and types
```

## 🚀 API Endpoints

### Upload Video
**POST** `/api/videos`
- **Auth**: Required (JWT Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Purpose**: Upload a new video with metadata and optional thumbnail

**Request Body:**
```javascript
{
  "videoData": JSON.stringify({
    "title": "My Amazing Video",
    "description": "This is a description of my video",
    "tags": ["entertainment", "fun", "viral"],
    "location": "Paris, France",
    "privacy": "public" // or "private"
  }),
  "videoFile": [video file], // Required - MP4, WebM, AVI, MOV, MKV
  "thumbnail": [image file]   // Optional - JPG, JPEG, PNG, WebP
}
```

**Response:**
```json
{
  "id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "title": "My Amazing Video",
  "description": "This is a description of my video",
  "videoUrl": "/api/videos/60f7b3b3b3b3b3b3b3b3b3b3/stream",
  "thumbnailUrl": "/api/videos/60f7b3b3b3b3b3b3b3b3b3b3/thumbnail",
  "duration": 30,
  "isProcessing": false,
  "message": "Video uploaded successfully"
}
```

### Get Videos Feed
**GET** `/api/videos`
- **Auth**: Optional (provides personalized data if authenticated)
- **Purpose**: Retrieve paginated video feed

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Videos per page (default: 10, max: 50)

**Response:**
```json
{
  "videos": [
    {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "Amazing Video",
      "description": "Video description",
      "videoUrl": "/api/videos/60f7b3b3b3b3b3b3b3b3b3b3/stream",
      "thumbnailUrl": "/api/videos/60f7b3b3b3b3b3b3b3b3b3b3/thumbnail",
      "user": {
        "id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "John Doe",
        "avatar": "/uploads/avatars/avatar.jpg",
        "isVerified": true
      },
      "stats": {
        "likes": 1250,
        "comments": 89,
        "shares": 45,
        "views": 15670
      },
      "isLiked": false,
      "duration": 30,
      "createdAt": "2023-07-20T10:30:00Z",
      "tags": ["entertainment", "fun"],
      "location": "Paris, France",
      "privacy": "public"
    }
  ],
  "hasMore": true,
  "currentPage": 1,
  "totalPages": 25,
  "totalCount": 250
}
```

### Get Video Details
**GET** `/api/videos/:id`
- **Auth**: Optional (required for private videos)
- **Purpose**: Get detailed information about a specific video

**Response:** Same as individual video object in feed

### Stream Video
**GET** `/api/videos/:id/stream`
- **Auth**: Not required (public streaming)
- **Purpose**: Stream video file with HTTP Range support
- **Features**: 
  - Automatic view tracking
  - Partial content support (HTTP 206)
  - Proper caching headers
  - Mobile-optimized streaming

**Headers:**
- `Range`: `bytes=0-1023` (optional, for partial content)

**Response Headers:**
- `Accept-Ranges`: `bytes`
- `Content-Type`: `video/mp4`
- `Content-Length`: File size in bytes
- `Content-Range`: `bytes start-end/total` (for partial content)

### Get Video Thumbnail
**GET** `/api/videos/:id/thumbnail`
- **Auth**: Not required
- **Purpose**: Serve video thumbnail image

**Response:** Image file (JPEG/PNG/WebP)

### Like/Unlike Video
**POST** `/api/videos/:id/like`
- **Auth**: Required (JWT Bearer Token)
- **Purpose**: Toggle like status for a video

**Response:**
```json
{
  "success": true,
  "message": "Video liked successfully",
  "isLiked": true,
  "likesCount": 1251
}
```

### Share Video
**POST** `/api/videos/:id/share`
- **Auth**: Not required
- **Purpose**: Track video share and increment share count

**Response:**
```json
{
  "success": true,
  "message": "Video shared successfully",
  "sharesCount": 46
}
```

## 🔧 Configuration

### File Upload Limits
- **Maximum file size**: 100MB
- **Supported video formats**: MP4, WebM, AVI, MOV, MKV
- **Supported thumbnail formats**: JPG, JPEG, PNG, WebP
- **Storage**: Local disk storage in `upload/videos/` directory

### File Storage Structure
```
upload/
├── videos/
│   ├── video_1642687200000_abc123.mp4
│   ├── video_1642687300000_def456.webm
│   └── thumbnails/
│       ├── thumb_1642687200000_abc123.jpg
│       └── thumb_1642687300000_def456.png
```

### Environment Variables
```bash
# MongoDB connection (inherited from main app)
MONGODB_URI=mongodb://localhost:27017/lnk_db

# File upload settings (optional overrides)
MAX_VIDEO_SIZE=104857600  # 100MB in bytes
VIDEO_UPLOAD_DIR=./upload/videos
```

## 🛠️ Usage Examples

### Frontend Integration (JavaScript)

#### Upload Video
```javascript
const uploadVideo = async (videoFile, thumbnailFile, metadata) => {
  const formData = new FormData();
  formData.append('videoFile', videoFile);
  if (thumbnailFile) {
    formData.append('thumbnail', thumbnailFile);
  }
  formData.append('videoData', JSON.stringify(metadata));

  const response = await fetch('/api/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

#### Get Video Feed
```javascript
const getVideoFeed = async (page = 1, limit = 10) => {
  const response = await fetch(`/api/videos?page=${page}&limit=${limit}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  return response.json();
};
```

#### Video Player Component (React)
```jsx
const VideoPlayer = ({ videoId }) => {
  return (
    <video 
      controls 
      poster={`/api/videos/${videoId}/thumbnail`}
      style={{ width: '100%', maxWidth: '400px' }}
    >
      <source src={`/api/videos/${videoId}/stream`} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};
```

### Backend Integration (NestJS)

#### Using VideosService
```typescript
import { VideosService } from './videos/videos.service';

@Injectable()
export class MyService {
  constructor(private videosService: VideosService) {}

  async getUserVideos(userId: string) {
    const query = { page: 1, limit: 20 };
    return this.videosService.getVideosFeed(query, userId);
  }
}
```

## 📊 Database Schema

### Video Document
```typescript
{
  _id: ObjectId,
  title: string,
  description: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  mimeType: string,
  thumbnailPath?: string,
  userId: ObjectId,
  duration: number,
  tags: string[],
  location?: string,
  privacy: 'public' | 'private',
  isProcessing: boolean,
  isActive: boolean,
  likes: number,
  comments: number,
  shares: number,
  views: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Video Like Document
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  videoId: ObjectId,
  createdAt: Date
}
```

### Video View Document
```typescript
{
  _id: ObjectId,
  videoId: ObjectId,
  userId?: ObjectId,
  ipAddress?: string,
  userAgent?: string,
  createdAt: Date
}
```

## 🔍 View Tracking Algorithm

The system implements intelligent view tracking to prevent duplicate views:

1. **Unique View Definition**: One view per user/IP per 24 hours
2. **Authenticated Users**: Tracked by user ID
3. **Anonymous Users**: Tracked by IP address
4. **Time Window**: 24-hour sliding window
5. **Performance**: Async tracking doesn't block video streaming

## 🚨 Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Video file is required",
  "error": "Bad Request"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Video not found",
  "error": "Not Found"
}
```

**413 Payload Too Large**
```json
{
  "statusCode": 413,
  "message": "Video file size exceeds maximum limit of 100MB",
  "error": "Payload Too Large"
}
```

## 🔐 Security Features

### File Validation
- **MIME Type Checking**: Validates actual file content, not just extension
- **File Size Limits**: Prevents resource exhaustion attacks
- **Path Sanitization**: Prevents directory traversal attacks
- **Extension Validation**: Double-checks file extensions

### Access Control
- **JWT Authentication**: Required for video upload and like actions
- **Privacy Settings**: Private videos only accessible to owners
- **Rate Limiting**: Prevents abuse (implement with guards)

### Data Protection
- **Input Sanitization**: All user inputs are validated and sanitized
- **SQL Injection Prevention**: Using Mongoose ODM with proper validation
- **XSS Prevention**: Proper data encoding in responses

## 📈 Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Videos load on-demand in feed
- **CDN Ready**: File paths structured for CDN integration
- **Caching**: Appropriate cache headers for static content
- **Database Indexing**: Optimized queries with proper indexes

### Recommended Indexes
```javascript
// Video collection indexes
db.videos.createIndex({ userId: 1, createdAt: -1 });
db.videos.createIndex({ privacy: 1, isActive: 1, createdAt: -1 });
db.videos.createIndex({ tags: 1 });

// Video likes collection indexes
db.videolikes.createIndex({ userId: 1, videoId: 1 }, { unique: true });
db.videolikes.createIndex({ videoId: 1 });

// Video views collection indexes
db.videoviews.createIndex({ videoId: 1, createdAt: -1 });
db.videoviews.createIndex({ userId: 1, createdAt: -1 });
db.videoviews.createIndex({ ipAddress: 1, createdAt: -1 });
```

## 🔄 Future Enhancements

### Planned Features
- **Video Processing**: FFmpeg integration for transcoding and optimization
- **Multiple Qualities**: 360p, 720p, 1080p versions
- **Comments System**: Video comments and replies
- **Playlist Support**: Create and manage video playlists
- **Analytics**: Detailed video analytics and insights
- **Live Streaming**: Real-time video streaming capabilities
- **Video Editing**: Basic video editing tools
- **Shorts Support**: TikTok-style short videos
- **AI Features**: Content moderation and recommendations

### Technical Improvements
- **CDN Integration**: Amazon S3 + CloudFront integration
- **Video Transcoding**: Automatic format conversion
- **Thumbnail Generation**: Auto-generate thumbnails from video
- **Progressive Upload**: Chunked upload for large files
- **WebRTC Support**: Peer-to-peer video streaming
- **Mobile Apps**: React Native integration

## 📞 Support

For issues, questions, or feature requests related to the videos module:

1. **Check Documentation**: Review this README and API documentation
2. **Error Logs**: Check application logs for detailed error information
3. **Database**: Verify MongoDB connection and collection indexes
4. **File Permissions**: Ensure proper write permissions for upload directory
5. **Dependencies**: Verify all required packages are installed

## 🧪 Testing

### Manual Testing
Use the provided test script or tools like Postman to test endpoints:

```bash
# Start the application
npm run start

# Test endpoints at http://localhost:3001/api/videos
# View API documentation at http://localhost:3001/docs
```

### Unit Tests
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

---

*This module is part of the LNK API project and follows the established patterns and conventions of the codebase.*
