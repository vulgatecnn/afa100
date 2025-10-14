/**
 * JWT 和认证库类型定义
 * 解决 JWT 和认证相关的类型问题
 */

// JWT 类型扩展
declare module 'jsonwebtoken' {
  interface JwtPayload {
    userId?: number;
    userType?: string;
    merchantId?: number;
    permissions?: string[];
    roleDescription?: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
    sub?: string;
    jti?: string;
    nbf?: number;
  }

  interface SignOptions {
    algorithm?: Algorithm;
    keyid?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    subject?: string;
    issuer?: string;
    jwtid?: string;
    mutatePayload?: boolean;
    noTimestamp?: boolean;
    header?: Record<string, any>;
    encoding?: string;
  }

  interface VerifyOptions {
    algorithms?: Algorithm[];
    audience?: string | RegExp | Array<string | RegExp>;
    clockTimestamp?: number;
    clockTolerance?: number;
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    nonce?: string;
    subject?: string;
    maxAge?: string | number;
  }

  interface DecodeOptions {
    complete?: boolean;
    json?: boolean;
  }

  type Algorithm =
    | 'HS256' | 'HS384' | 'HS512'
    | 'RS256' | 'RS384' | 'RS512'
    | 'ES256' | 'ES384' | 'ES512'
    | 'PS256' | 'PS384' | 'PS512'
    | 'none';

  interface Jwt {
    header: JwtHeader;
    payload: JwtPayload | string;
    signature: string;
  }

  interface JwtHeader {
    alg: Algorithm;
    typ?: string;
    cty?: string;
    crit?: Array<string | Exclude<keyof JwtHeader, 'crit'>>;
    kid?: string;
    jku?: string;
    x5u?: string | string[];
    'x5t#S256'?: string;
    x5t?: string;
    x5c?: string | string[];
  }

  class JsonWebTokenError extends Error {
    name: 'JsonWebTokenError';
    message: string;
  }

  class TokenExpiredError extends JsonWebTokenError {
    name: 'TokenExpiredError';
    message: string;
    expiredAt: Date;
  }

  class NotBeforeError extends JsonWebTokenError {
    name: 'NotBeforeError';
    message: string;
    date: Date;
  }

  function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer | { key: string | Buffer; passphrase: string },
    options?: SignOptions
  ): string;

  function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer | { key: string | Buffer; passphrase: string },
    callback: (error: Error | null, encoded: string | undefined) => void
  ): void;

  function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer | { key: string | Buffer; passphrase: string },
    options: SignOptions,
    callback: (error: Error | null, encoded: string | undefined) => void
  ): void;

  function verify(
    token: string,
    secretOrPublicKey: string | Buffer | { key: string | Buffer; passphrase?: string },
    options?: VerifyOptions & { complete?: false }
  ): JwtPayload | string;

  function verify(
    token: string,
    secretOrPublicKey: string | Buffer | { key: string | Buffer; passphrase?: string },
    options: VerifyOptions & { complete: true }
  ): Jwt;

  function verify(
    token: string,
    secretOrPublicKey: string | Buffer | { key: string | Buffer; passphrase?: string },
    callback: (error: JsonWebTokenError | NotBeforeError | TokenExpiredError | null, decoded: JwtPayload | undefined) => void
  ): void;

  function verify(
    token: string,
    secretOrPublicKey: string | Buffer | { key: string | Buffer; passphrase?: string },
    options: VerifyOptions & { complete?: false },
    callback: (error: JsonWebTokenError | NotBeforeError | TokenExpiredError | null, decoded: JwtPayload | string | undefined) => void
  ): void;

  function verify(
    token: string,
    secretOrPublicKey: string | Buffer | { key: string | Buffer; passphrase?: string },
    options: VerifyOptions & { complete: true },
    callback: (error: JsonWebTokenError | NotBeforeError | TokenExpiredError | null, decoded: Jwt | undefined) => void
  ): void;

  function decode(token: string, options?: DecodeOptions & { complete?: false }): JwtPayload | string | null;
  function decode(token: string, options: DecodeOptions & { complete: true }): Jwt | null;
  function decode(token: string, options?: DecodeOptions): JwtPayload | string | Jwt | null;
}

// bcryptjs 类型扩展
declare module 'bcryptjs' {
  interface HashOptions {
    rounds?: number;
    salt?: string;
  }

  interface CompareOptions {
    // 目前 bcryptjs 的 compare 方法没有特殊选项
  }

  function genSaltSync(rounds?: number): string;
  function genSalt(rounds?: number): Promise<string>;
  function genSalt(rounds: number, callback: (error: Error | null, salt: string) => void): void;
  function genSalt(callback: (error: Error | null, salt: string) => void): void;

  function hashSync(data: string | Buffer, saltOrRounds: string | number): string;
  function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  function hash(data: string | Buffer, saltOrRounds: string | number, callback: (error: Error | null, hash: string) => void): void;

  function compareSync(data: string | Buffer, encrypted: string): boolean;
  function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  function compare(data: string | Buffer, encrypted: string, callback: (error: Error | null, result: boolean) => void): void;

  function getRounds(encrypted: string): number;
  function getSalt(encrypted: string): string;
}

// 认证相关类型定义
export interface AuthenticationResult {
  success: boolean;
  user?: any; // 使用具体的 User 类型
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
  code?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  permissions?: string[];
  reason?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: any; // 使用具体的 JwtPayload 类型
  error?: string;
  expired?: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number;
  suggestions: string[];
}

export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  };
  bcrypt: {
    saltRounds: number;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  rateLimit: {
    windowMs: number;
    maxAttempts: number;
    blockDuration: number;
  };
}

export interface AuthProvider {
  name: string;
  authenticate(credentials: any): Promise<AuthenticationResult>;
  authorize(user: any, resource: string, action: string): Promise<AuthorizationResult>;
  validateToken(token: string): Promise<TokenValidationResult>;
  refreshToken(refreshToken: string): Promise<AuthenticationResult>;
  logout(token: string): Promise<void>;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  forbiddenPatterns: RegExp[];
  historyCount: number; // 不能重复使用的历史密码数量
}

export interface LoginAttempt {
  userId?: number;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'password_change' | 'token_refresh' | 'unauthorized_access' | 'suspicious_activity';
  userId?: number;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthSession {
  id: string;
  userId: number;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  active: boolean;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface TwoFactorAuth {
  enabled: boolean;
  method: 'sms' | 'email' | 'totp' | 'backup_codes';
  secret?: string;
  backupCodes?: string[];
  lastUsed?: Date;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
  skipPaths?: string[];
  customValidator?: (req: any) => Promise<boolean>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any, res: any) => void;
}

export interface AuthAuditLog {
  id: string;
  userId?: number;
  action: string;
  resource?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  details: Record<string, any>;
  risk_score?: number;
}

// 认证错误类型
export class AuthenticationError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code: string, statusCode: number = 401, details?: any) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthorizationError extends Error {
  code: string;
  statusCode: number;
  requiredPermissions?: string[];

  constructor(message: string, code: string, statusCode: number = 403, requiredPermissions?: string[]) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.statusCode = statusCode;
    this.requiredPermissions = requiredPermissions;
  }
}

export class TokenError extends Error {
  code: string;
  statusCode: number;
  tokenType?: 'access' | 'refresh';

  constructor(message: string, code: string, statusCode: number = 401, tokenType?: 'access' | 'refresh') {
    super(message);
    this.name = 'TokenError';
    this.code = code;
    this.statusCode = statusCode;
    this.tokenType = tokenType;
  }
}

// 认证服务接口
export interface AuthService {
  // 用户认证
  authenticate(credentials: LoginCredentials): Promise<AuthenticationResult>;
  register(userData: RegisterData): Promise<AuthenticationResult>;
  
  // Token 管理
  generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>;
  validateAccessToken(token: string): Promise<TokenValidationResult>;
  validateRefreshToken(token: string): Promise<TokenValidationResult>;
  refreshAccessToken(refreshToken: string): Promise<AuthenticationResult>;
  revokeToken(token: string): Promise<void>;
  
  // 密码管理
  changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  validatePassword(password: string): PasswordValidationResult;
  
  // 会话管理
  createSession(user: any, ip: string, userAgent: string): Promise<AuthSession>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  updateSession(sessionId: string, data: Partial<AuthSession>): Promise<void>;
  destroySession(sessionId: string): Promise<void>;
  
  // 权限管理
  checkPermission(userId: number, resource: string, action: string): Promise<boolean>;
  getUserPermissions(userId: number): Promise<string[]>;
  
  // 安全功能
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean>;
  detectSuspiciousActivity(userId: number, ip: string): Promise<boolean>;
}

export interface LoginCredentials {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
  name: string;
  userType?: string;
  merchantId?: number;
}

// OAuth 相关类型
export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  provider: string;
}

// 微信认证相关类型
export interface WechatAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface WechatTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
}

export {};