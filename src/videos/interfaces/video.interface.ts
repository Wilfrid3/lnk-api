export interface VideoStats {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface VideoUser {
  id: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
}

export interface VideoResponse {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  user: VideoUser;
  stats: VideoStats;
  isLiked: boolean;
  duration: number;
  createdAt: string;
  tags: string[];
  location?: string;
  privacy: 'public' | 'private' | 'friends';
}

export interface VideosFeedResponse {
  videos: VideoResponse[];
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export interface VideoUploadResponse {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  isProcessing: boolean;
  message: string;
}

export interface VideoActionResponse {
  success: boolean;
  message: string;
  isLiked?: boolean;
  likesCount?: number;
  sharesCount?: number;
  viewsCount?: number;
}
