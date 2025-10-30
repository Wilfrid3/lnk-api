export interface JwtPayload {
  sub: string;
  userType?: string;
  phoneNumber?: string;
  originalUserId?: string;
  isSpoofing?: boolean;
  iat?: number;
  exp?: number;
}

export interface SpoofingStatus {
  isSpoofing: boolean;
  originalAdminId?: string;
  targetUserId?: string;
}
