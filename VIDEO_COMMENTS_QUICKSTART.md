# Video Comments System - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/lnk-api

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000

# Optional: Firebase Configuration (for authentication)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key
```

### 3. Start the Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 4. Access the API
- Base URL: `http://localhost:3000/api`
- Swagger Documentation: `http://localhost:3000/api/docs`

## 🎬 Video Comments API Endpoints

### Available Endpoints:

1. **GET** `/videos/:videoId/comments` - Get video comments (public)
2. **POST** `/videos/:videoId/comments` - Create comment (auth required)
3. **GET** `/videos/comments/:commentId/replies` - Get comment replies (public)
4. **PUT** `/videos/comments/:commentId` - Update comment (auth required)
5. **DELETE** `/videos/comments/:commentId` - Delete comment (auth required)
6. **POST** `/videos/comments/:commentId/like` - Like/unlike comment (auth required)

## 🧪 Testing the System

### Method 1: Using the Test Script
```bash
# Update the configuration in test_video_comments_system.js
node test_video_comments_system.js
```

### Method 2: Using curl Commands

#### Create a comment:
```bash
curl -X POST http://localhost:3000/api/videos/VIDEO_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"content": "This is a test comment!"}'
```

#### Get comments:
```bash
curl -X GET "http://localhost:3000/api/videos/VIDEO_ID/comments?page=1&limit=10"
```

#### Reply to a comment:
```bash
curl -X POST http://localhost:3000/api/videos/VIDEO_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"content": "This is a reply!", "parentId": "PARENT_COMMENT_ID"}'
```

#### Like a comment:
```bash
curl -X POST http://localhost:3000/api/videos/comments/COMMENT_ID/like \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update a comment:
```bash
curl -X PUT http://localhost:3000/api/videos/comments/COMMENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"content": "Updated comment content"}'
```

#### Delete a comment:
```bash
curl -X DELETE http://localhost:3000/api/videos/comments/COMMENT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Method 3: Using Postman
1. Import the API collection (create one from the endpoints above)
2. Set up environment variables for `BASE_URL` and `JWT_TOKEN`
3. Test each endpoint sequentially

## 🔧 Development Tips

### 1. Database Setup
Make sure MongoDB is running:
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# https://docs.mongodb.com/manual/installation/
```

### 2. JWT Token Generation
For testing, you can generate a JWT token using your user service or create a simple script:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 'user_id_here', email: 'user@example.com' },
  'your-jwt-secret',
  { expiresIn: '7d' }
);

console.log('JWT Token:', token);
```

### 3. Sample Data
Create some sample videos and users in your database to test the comments system effectively.

### 4. Error Handling
The API includes comprehensive error handling:
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (permission denied)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

### 5. Performance Monitoring
Monitor the following metrics:
- Comment creation rate
- Database query performance
- Memory usage
- Response times

## 📝 Code Structure

```
src/videos/
├── controllers/
├── dto/
│   └── video-comment.dto.ts
├── interfaces/
│   ├── video.interface.ts
│   └── comment.interface.ts
├── schemas/
│   ├── video-comment.schema.ts
│   └── video-comment-like.schema.ts
├── videos.controller.ts
├── videos.service.ts
└── videos.module.ts
```

## 🔍 Debugging

### Enable Debug Logging
```bash
DEBUG=* npm run start:dev
```

### Common Issues
1. **MongoDB connection failed**: Check `MONGODB_URI` in `.env`
2. **JWT verification failed**: Verify `JWT_SECRET` matches
3. **Comment not found**: Ensure the comment ID exists and is valid
4. **Permission denied**: Check if user owns the comment

## 🌟 Features Implemented

- ✅ Threaded comments (replies)
- ✅ CRUD operations
- ✅ Like/unlike functionality
- ✅ Pagination
- ✅ User authentication
- ✅ Soft delete
- ✅ Input validation
- ✅ Error handling
- ✅ API documentation
- ✅ Test coverage

## 📚 Next Steps

1. **Add real-time updates** with WebSockets
2. **Implement comment moderation** tools
3. **Add comment reactions** (beyond likes)
4. **Create comment notifications**
5. **Add comment search** functionality
6. **Implement rate limiting**
7. **Add comment analytics**

## 💡 Pro Tips

1. **Use pagination** to avoid loading large comment datasets
2. **Implement caching** for frequently accessed comments
3. **Add content moderation** for inappropriate comments
4. **Monitor performance** with database indexing
5. **Use soft deletes** to maintain thread structure
6. **Implement rate limiting** to prevent spam

Enjoy building with the Video Comments System! 🎉
