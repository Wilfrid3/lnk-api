export interface CommentUser {
  id: string;
  name: string;
  avatar: string;
  isVerified: boolean;
}

export interface CommentResponse {
  id: string;
  content: string;
  likes: number;
  repliesCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
  isOwner: boolean;
  replies?: CommentResponse[];
  hasMoreReplies?: boolean;
}

export interface CommentsPaginationResponse {
  comments: CommentResponse[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RepliesPaginationResponse {
  replies: CommentResponse[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CommentActionResponse {
  message: string;
  liked?: boolean;
}

export interface CommentCreateResponse extends CommentResponse {}

export interface CommentUpdateResponse extends CommentResponse {}

export interface CommentDeleteResponse {
  message: string;
}
