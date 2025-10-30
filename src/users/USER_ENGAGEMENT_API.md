# User Engagement System

This document describes the User Engagement System APIs implemented in the LNK API, including follow/unfollow functionality, rating system, profile view tracking, and user statistics.

## Features

- **Follow/Unfollow System**: Users can follow and unfollow each other
- **Rating System**: Users can rate each other (1-5 stars) with optional comments
- **Profile View Tracking**: Track and count profile views
- **User Statistics**: Comprehensive stats including posts, views, likes, followers, and ranking

## API Endpoints

### Follow/Unfollow System

#### POST /users/:id/follow
Follow a user.

**Authentication**: Required (JWT)

**Parameters**:
- `id` (string): User ID to follow

**Response**:
```json
{
  "message": "User followed successfully"
}
```

**Errors**:
- `400`: Cannot follow yourself or already following
- `401`: Unauthorized
- `404`: User not found

#### DELETE /users/:id/follow
Unfollow a user.

**Authentication**: Required (JWT)

**Parameters**:
- `id` (string): User ID to unfollow

**Response**:
```json
{
  "message": "User unfollowed successfully"
}
```

#### GET /users/:id/followers
Get user's followers list.

**Authentication**: None (Public)

**Parameters**:
- `id` (string): User ID
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Response**:
```json
{
  "followers": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "avatar": "avatar_url",
      "isVerified": true,
      "isPremium": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### GET /users/:id/following
Get users being followed.

**Authentication**: None (Public)

**Parameters**:
- `id` (string): User ID
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Response**:
```json
{
  "following": [
    {
      "_id": "user_id",
      "name": "Jane Smith",
      "avatar": "avatar_url",
      "isVerified": false,
      "isPremium": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### Rating System

#### POST /users/:id/rate
Rate a user.

**Authentication**: Required (JWT)

**Parameters**:
- `id` (string): User ID to rate

**Request Body**:
```json
{
  "rating": 4,
  "comment": "Great service and professional attitude"
}
```

**Response**:
```json
{
  "rating": {
    "_id": "rating_id",
    "ratedUserId": "user_id",
    "raterUserId": "rater_id",
    "rating": 4,
    "comment": "Great service and professional attitude",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation**:
- `rating`: Required, number between 1-5
- `comment`: Optional, string

**Errors**:
- `400`: Invalid rating value, cannot rate yourself, or already rated
- `401`: Unauthorized
- `404`: User not found

#### GET /users/:id/ratings
Get user's ratings.

**Authentication**: None (Public)

**Parameters**:
- `id` (string): User ID
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Response**:
```json
{
  "ratings": [
    {
      "_id": "rating_id",
      "rating": 5,
      "comment": "Excellent service!",
      "raterUserId": {
        "_id": "rater_id",
        "name": "John Doe",
        "avatar": "avatar_url"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

### Profile View Tracking

#### POST /users/:id/view
Track a profile view.

**Authentication**: None (Public)

**Parameters**:
- `id` (string): User ID whose profile was viewed

**Response**:
```json
{
  "message": "Profile view tracked"
}
```

**Note**: This endpoint increments the user's profile view counter.

### User Statistics

#### GET /users/:id/stats
Get comprehensive user statistics.

**Authentication**: None (Public)

**Parameters**:
- `id` (string): User ID

**Response**:
```json
{
  "posts": 12,
  "views": 1450,
  "likes": 89,
  "followers": 45,
  "rank": 15,
  "rankHistory": {
    "week": 18,
    "month": 22,
    "year": 35
  }
}
```

**Response Fields**:
- `posts`: Number of posts created by the user
- `views`: Total profile views
- `likes`: Total likes received on posts
- `followers`: Number of followers
- `rank`: Current ranking position
- `rankHistory`: Historical ranking data

#### GET /users/:id/posts
Get user's posts with pagination.

**Authentication**: None (Public)

**Parameters**:
- `id` (string): User ID
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `sortBy` (string, optional): Sort field (default: 'createdAt')
- `sortOrder` (string, optional): Sort order 'asc' or 'desc' (default: 'desc')

**Response**:
```json
{
  "items": [
    {
      "id": "post_id",
      "title": "Post Title",
      "description": "Post description...",
      "city": "Paris",
      "clientType": "tous",
      "price": 100,
      "views": 150,
      "likesCount": 25,
      "isActive": true,
      "isFeatured": false,
      "mainPhoto": {
        "id": "file_id",
        "url": "/upload/photo.jpg",
        "originalName": "photo.jpg"
      },
      "user": {
        "id": "user_id",
        "name": "User Name",
        "avatar": "/upload/avatar.jpg"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "totalItems": 45,
    "itemsPerPage": 10,
    "totalPages": 5,
    "currentPage": 1
  }
}
```

## Database Schema Changes

### User Schema Additions

```typescript
// Engagement fields
followers?: Types.ObjectId[];        // Array of user IDs following this user
following?: Types.ObjectId[];        // Array of user IDs this user follows
profileViews?: number;               // Total profile views
averageRating?: number;              // Average rating (1-5)
totalRatings?: number;               // Sum of all ratings
ratingCount?: number;                // Number of ratings received
currentRank?: number;                // Current ranking position
rankHistory?: {                      // Historical rankings
  week: number;
  month: number;
  year: number;
};
```

### UserRating Schema

```typescript
{
  ratedUserId: Types.ObjectId;       // User being rated
  raterUserId: Types.ObjectId;       // User giving the rating
  rating: number;                    // Rating value (1-5)
  comment?: string;                  // Optional comment
  createdAt: Date;
  updatedAt: Date;
}
```

## Database Indexes

The following indexes are created for optimal performance:

### User Collection
- `{ followers: 1 }` - For follower queries
- `{ following: 1 }` - For following queries
- `{ currentRank: 1 }` - For ranking queries
- `{ averageRating: -1 }` - For rating-based sorting
- `{ profileViews: -1 }` - For view-based sorting

### UserRating Collection
- `{ ratedUserId: 1, raterUserId: 1 }` - Unique compound index (prevents duplicate ratings)
- `{ ratedUserId: 1 }` - For getting user's ratings
- `{ raterUserId: 1 }` - For getting ratings by a specific user

## Business Logic

### Rating System
- Users cannot rate themselves
- Each user can only rate another user once (enforced by unique compound index)
- Average rating is automatically recalculated when new ratings are added
- Ratings are rounded to 1 decimal place

### Follow System
- Users cannot follow themselves
- Attempting to follow an already-followed user returns an error
- Both follower and following lists are maintained for bidirectional queries

### Ranking System
- Rankings are calculated based on engagement score:
  - Profile views × 1
  - Followers × 10
  - Average rating × 20
  - Rating count × 5
- Rankings should be updated periodically via cron job
- Historical rankings track weekly, monthly, and yearly positions

### Profile Views
- Simple counter increment on each view
- No user authentication required
- Can be extended to track unique views with viewer identification

## Integration Notes

### Posts Integration
The stats endpoint now returns real data for posts and likes through integration with the posts module:

```typescript
// In UserEngagementService
constructor(
  @InjectModel(User.name) private userModel: Model<UserDocument>,
  @InjectModel(UserRating.name) private userRatingModel: Model<UserRatingDocument>,
  @Inject(forwardRef(() => PostsService)) private postsService: PostsService,
) {}

// Updated getUserStats method
async getUserStats(userId: string) {
  const user = await this.userModel.findById(userId);
  if (!user) {
    throw new NotFoundException('User not found');
  }

  const [postsCount, likesCount] = await Promise.all([
    this.postsService.getUserPostsCount(userId),
    this.postsService.getUserLikesCount(userId),
  ]);

  return {
    posts: postsCount,
    views: user.profileViews || 0,
    likes: likesCount,
    followers: user.followers?.length || 0,
    rank: user.currentRank || 0,
    rankHistory: user.rankHistory || { week: 0, month: 0, year: 0 },
  };
}
```

### Posts Like System
New endpoints have been added to the posts module:

- `POST /posts/:id/like` - Like a post
- `DELETE /posts/:id/like` - Unlike a post  
- `GET /posts/:id/like-status` - Check if post is liked by current user

The PostsService now includes methods:
- `likePost(postId, userId)` - Add like to post
- `unlikePost(postId, userId)` - Remove like from post
- `getUserPostsCount(userId)` - Count user's posts
- `getUserLikesCount(userId)` - Count total likes on user's posts
- `isPostLikedByUser(postId, userId)` - Check like status

### Frontend Integration
The stats endpoint response format exactly matches the expected frontend structure, making integration seamless.

## Error Handling

All endpoints include proper error handling with appropriate HTTP status codes:
- `400 Bad Request`: Invalid input or business logic violations
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Unexpected server errors

## Security Considerations

- Follow/unfollow and rating endpoints require JWT authentication
- Profile views and stats are public for discoverability
- User ownership validation prevents unauthorized actions
- Input validation on all endpoints
- No sensitive data exposure in public endpoints
