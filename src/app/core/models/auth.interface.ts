// ==============================
// Shared User
// ==============================

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

// ==============================
// Signup
// ==============================

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  rePassword: string;
  phone: string;
}

// ==============================
// Signin
// ==============================

export interface SigninRequest {
  email: string;
  password: string;
}

// ==============================
// Shared Auth Response
// Signup & Signin
// ==============================

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

// ==============================
// Forgot Password
// ==============================

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  statusMsg: string;
  message: string;
}

// ==============================
// Verify Reset Code
// ==============================

export interface VerifyResetCodeRequest {
  resetCode: string;
}

export interface VerifyResetCodeResponse {
  status?: string;
  statusMsg?: string;
  message?: string;
}

// ==============================
// Reset Password
// ==============================

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  token: string;
}

// ==============================
// Verify Token
// ==============================

export interface DecodedToken {
  id: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export interface VerifyTokenResponse {
  message: string;
  decoded: DecodedToken;
}

// ==============================
// Get All Users
// ==============================

export interface UserItem {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface UsersMetadata {
  currentPage: number;
  numberOfPages: number;
  limit: number;
  nextPage?: number;
}

export interface GetAllUsersResponse {
  totalUsers: number;
  metadata: UsersMetadata;
  users: UserItem[];
}

// ==============================
// Update Logged User Password
// ==============================

export interface UpdatePasswordRequest {
  currentPassword: string;
  password: string;
  rePassword: string;
}

export interface UpdatePasswordResponse {
  message: string;
  user: AuthUser;
  token: string;
}

// ==============================
// Update Logged User Data
// ==============================

export interface UpdateUserDataRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserDataSuccessResponse {
  message: 'success';
  user: AuthUser;
}

export interface UpdateUserDataErrorResponse {
  message: 'fail';
  errors: {
    value: string;
    msg: string;
    param: string;
    location: string;
  };
}

export type UpdateUserDataResponse = UpdateUserDataSuccessResponse | UpdateUserDataErrorResponse;
