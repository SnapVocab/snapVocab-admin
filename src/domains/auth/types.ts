export interface UserDTO {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  nativeLanguage?: string | null;
  learningLanguage?: string | null;
  exp?: number;
  coin?: number;
  streakDays?: number;
  lastStudiedAt?: string | null;
  bio?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  user: UserDTO;
}

export interface DecodedJwtPayload {
  sub?: string;
  auth?: string;
  userId?: number;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
  authorities: string[];
}

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';
