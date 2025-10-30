# Video Comments System Documentation

## Overview

This document provides comprehensive documentation for the video comments system implemented in the TikTok-like video feed application. The system supports threaded comments, CRUD operations, likes, and pagination.

## Features

### Core Features
- ✅ Create comments on videos
- ✅ Reply to comments (nested/threaded comments)
- ✅ Update comments (by author only)
- ✅ Delete comments (soft delete by author)
- ✅ Like/unlike comments
- ✅ Pagination for comments and replies
- ✅ User authentication and authorization
- ✅ User information in responses (name, avatar, verified status)

### Business Rules
- Comments are limited to 500 characters
- Users can only edit/delete their own comments
- Soft delete maintains thread structure
- Comments show user ownership status
- Nested replies are supported (parent-child relationships)

## API Endpoints

### 1. Get Video Comments
```http
GET /videos/:videoId/comments
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Response:**
```json
{
  "comments": [
    {
      "id": "comment_id",
      "content": "This is a great video!",
      "likes": 5,
      "replies": 2,
      "isDeleted": false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "isVerified": true
      },
      "isOwner": true,
      "replies": [
        {
          "id": "reply_id",
          "content": "I agree!",
          "likes": 1,
          "replies": 0,
          "isDeleted": false,
          "createdAt": "2023-01-01T01:00:00.000Z",
          "updatedAt": "2023-01-01T01:00:00.000Z",
          "user": {
            "id": "user_id_2",
            "name": "Jane Smith",
            "avatar": "https://example.com/avatar2.jpg",
            "isVerified": false
          },
          "isOwner": false
        }
      ],
      "hasMoreReplies": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "totalCount": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 2. Create Comment
```http
POST /videos/:videoId/comments
```

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "content": "This is a comment",
  "parentId": "parent_comment_id" // Optional, for replies
}
```

**Response:**
```json
{
  "id": "comment_id",
  "content": "This is a comment",
  "likes": 0,
  "replies": 0,
  "isDeleted": false,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "isVerified": true
  },
  "isOwner": true
}
```

### 3. Get Comment Replies
```http
GET /videos/comments/:commentId/replies
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Response:**
```json
{
  "replies": [
    {
      "id": "reply_id",
      "content": "This is a reply",
      "likes": 0,
      "replies": 0,
      "isDeleted": false,
      "createdAt": "2023-01-01T01:00:00.000Z",
      "updatedAt": "2023-01-01T01:00:00.000Z",
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "isVerified": true
      },
      "isOwner": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "totalCount": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 4. Update Comment
```http
PUT /videos/comments/:commentId
```

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

**Response:**
```json
{
  "id": "comment_id",
  "content": "Updated comment content",
  "likes": 5,
  "replies": 2,
  "isDeleted": false,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T02:00:00.000Z",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "isVerified": true
  },
  "isOwner": true
}
```

### 5. Delete Comment
```http
DELETE /videos/comments/:commentId
```

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "message": "Comment deleted successfully"
}
```

### 6. Like/Unlike Comment
```http
POST /videos/comments/:commentId/like
```

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "message": "Comment liked successfully",
  "liked": true
}
```

or

```json
{
  "message": "Comment unliked successfully",
  "liked": false
}
```

## Database Schema

### VideoComment Collection
```javascript
{
  _id: ObjectId,
  videoId: ObjectId, // Reference to Video
  userId: ObjectId,  // Reference to User
  content: String,   // Max 500 characters
  parentId: ObjectId | null, // Reference to parent comment (for replies)
  likes: Number,     // Count of likes
  replies: Number,   // Count of replies
  isDeleted: Boolean, // Soft delete flag
  isActive: Boolean,  // Active status
  createdAt: Date,
  updatedAt: Date
}
```

### VideoCommentLike Collection
```javascript
{
  _id: ObjectId,
  commentId: ObjectId, // Reference to VideoComment
  userId: ObjectId,    // Reference to User
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ videoId: 1, parentId: 1, createdAt: -1 }` - For efficient comment retrieval
- `{ parentId: 1, createdAt: -1 }` - For replies
- `{ userId: 1, createdAt: -1 }` - For user's comments
- `{ commentId: 1, userId: 1 }` - Unique compound index for likes

## Authentication

All endpoints except `GET /videos/:videoId/comments` and `GET /videos/comments/:commentId/replies` require authentication.

The system uses JWT tokens passed in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

For public endpoints (GET requests), authentication is optional but recommended to provide personalized responses (e.g., showing if the current user liked a comment).

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Comment cannot exceed 500 characters",
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You can only edit your own comments",
  "error": "Forbidden"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Comment not found",
  "error": "Not Found"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Failed to create comment",
  "error": "Internal Server Error"
}
```

## Usage Examples

### JavaScript/Node.js Example

```javascript
// Create a comment
const createComment = async (videoId, content, token) => {
  const response = await fetch(`/api/videos/${videoId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  });
  return response.json();
};

// Get comments with pagination
const getComments = async (videoId, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/videos/${videoId}/comments?page=${page}&limit=${limit}`
  );
  return response.json();
};

// Reply to a comment
const replyToComment = async (videoId, parentId, content, token) => {
  const response = await fetch(`/api/videos/${videoId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content, parentId })
  });
  return response.json();
};

// Like a comment
const likeComment = async (commentId, token) => {
  const response = await fetch(`/api/videos/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

### React Example

```jsx
import React, { useState, useEffect } from 'react';

const VideoComments = ({ videoId, userToken }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/comments`);
      const data = await response.json();
      setComments(data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([comment, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await fetch(`/api/videos/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        fetchComments(); // Refresh comments
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  return (
    <div className="video-comments">
      <div className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          maxLength={500}
        />
        <button onClick={handleCreateComment}>Post Comment</button>
      </div>

      <div className="comments-list">
        {loading ? (
          <div>Loading comments...</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <img src={comment.user.avatar} alt={comment.user.name} />
                <span>{comment.user.name}</span>
                {comment.user.isVerified && <span>✓</span>}
              </div>
              <div className="comment-content">{comment.content}</div>
              <div className="comment-actions">
                <button onClick={() => handleLikeComment(comment.id)}>
                  ❤️ {comment.likes}
                </button>
                <button>Reply</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VideoComments;
```

## Testing

Use the provided test script `test_video_comments_system.js` to test all endpoints:

```bash
node test_video_comments_system.js
```

Make sure to update the configuration variables in the test file:
- `BASE_URL`: Your API base URL
- `VIDEO_ID`: A valid video ID
- `ACCESS_TOKEN`: A valid JWT token

## Performance Considerations

1. **Pagination**: Always use pagination for comments to avoid loading large datasets
2. **Indexing**: Database indexes are optimized for common query patterns
3. **Soft Delete**: Comments are soft-deleted to maintain thread structure
4. **Lazy Loading**: Replies are loaded separately to improve initial load performance
5. **Caching**: Consider implementing caching for frequently accessed comments

## Security Considerations

1. **Authentication**: All write operations require authentication
2. **Authorization**: Users can only modify their own comments
3. **Input Validation**: Content length and format are validated
4. **Rate Limiting**: Consider implementing rate limiting for comment creation
5. **Content Moderation**: Implement content moderation for inappropriate comments

## Future Enhancements

1. **Real-time Updates**: WebSocket support for real-time comment updates
2. **Comment Reactions**: Additional reaction types beyond likes
3. **Comment Moderation**: Admin tools for content moderation
4. **Comment Notifications**: Notify users when someone replies to their comments
5. **Comment Analytics**: Track comment engagement metrics
6. **Rich Text Support**: Support for formatted text, mentions, and hashtags
7. **Comment Search**: Search functionality within comments
8. **Comment Reporting**: Allow users to report inappropriate comments

## Troubleshooting

### Common Issues

1. **Comments not loading**: Check if the video ID is valid and the video exists
2. **Authentication errors**: Ensure the JWT token is valid and not expired
3. **Permission errors**: Verify user has permission to modify the comment
4. **Validation errors**: Check content length and format requirements
5. **Database errors**: Verify database connection and schema

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=video-comments:*
```

This will provide detailed logging for troubleshooting issues.
