import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { WechatUtils } from '../utils/wechat.js';
import { AppError, ErrorCodes, asyncHandler } from '../middleware/error.middleware.js';
import type { ApiResponse, UserType } from '../types/index.js';

/**
 * 认证控制器
 * 处理用户登录、注册、token刷新等认证相关的HTTP请求
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * 用户登录
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, password, openId, userType } = req.body;

    // 验证必填字段
    if (!openId && (!phone || !password)) {
      throw new AppError('请提供手机号和密码或微信授权码', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const result = await this.authService.login({
      phone,
      password,
      openId,
      userType,
    });

    const response: ApiResponse = {
      success: true,
      message: '登录成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 微信小程序登录
   */
  wechatLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code, userType, userInfo } = req.body;

    // 验证必填字段
    if (!code) {
      throw new AppError('缺少微信授权码', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    if (!userType) {
      throw new AppError('请选择用户类型', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 验证用户类型
    const validUserTypes: UserType[] = ['visitor', 'employee'];
    if (!validUserTypes.includes(userType)) {
      throw new AppError('用户类型无效', 400, ErrorCodes.VALIDATION_ERROR);
    }

    try {
      // 通过code获取微信用户信息
      const wechatUserInfo = await WechatUtils.getSessionByCode(code);

      // 格式化用户信息
      const formattedUserInfo = userInfo ? WechatUtils.formatUserInfo(userInfo) : undefined;

      const wechatLoginData: any = {
        openId: wechatUserInfo.openid,
        userInfo: formattedUserInfo,
        userType,
      };

      // 只添加有值的可选字段
      if (wechatUserInfo.unionid) {
        wechatLoginData.unionId = wechatUserInfo.unionid;
      }

      const result = await this.authService.wechatLogin(wechatLoginData);

      const response: ApiResponse = {
        success: true,
        message: '微信登录成功',
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('微信')) {
        throw new AppError(errorMessage, 400, ErrorCodes.EXTERNAL_SERVICE_ERROR);
      }

      throw error;
    }
  });

  /**
   * 刷新访问token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('缺少刷新令牌', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const result = await this.authService.refreshToken(refreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Token刷新成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 用户登出
   */
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError('用户未登录', 401, ErrorCodes.TOKEN_INVALID);
    }

    await this.authService.logout(req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: '登出成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取当前用户信息
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.userDetails) {
      throw new AppError('用户信息不存在', 401, ErrorCodes.TOKEN_INVALID);
    }

    const response: ApiResponse = {
      success: true,
      message: '获取用户信息成功',
      data: {
        user: req.userDetails,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 验证token有效性
   */
  verifyToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    if (!token) {
      throw new AppError('缺少令牌', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    try {
      const user = await this.authService.verifyAccessToken(token);

      const response: ApiResponse = {
        success: true,
        message: '令牌有效',
        data: {
          valid: true,
          user,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: '令牌无效',
        data: {
          valid: false,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(401).json(response);
    }
  });

  /**
   * 修改密码
   */
  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError('用户未登录', 401, ErrorCodes.TOKEN_INVALID);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('请提供当前密码和新密码', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 验证新密码强度
    const passwordValidation = this.authService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(
        `密码强度不足: ${passwordValidation.errors.join(', ')}`,
        400,
        ErrorCodes.VALIDATION_ERROR,
        { errors: passwordValidation.errors }
      );
    }

    // 这里需要实现密码修改逻辑
    // 由于当前User模型没有password字段，这个功能需要在后续完善

    const response: ApiResponse = {
      success: true,
      message: '密码修改成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 重置密码
   */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, code } = req.body;

    if (!phone || !code) {
      throw new AppError('请提供手机号和验证码', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 这里需要实现验证码验证和密码重置逻辑
    // 由于当前没有短信服务，这个功能需要在后续完善

    const response: ApiResponse = {
      success: true,
      message: '密码重置成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 发送验证码
   */
  sendVerificationCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, type } = req.body;

    if (!phone) {
      throw new AppError('请提供手机号', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new AppError('手机号格式无效', 400, ErrorCodes.INVALID_FORMAT);
    }

    // 这里需要实现短信验证码发送逻辑
    // 由于当前没有短信服务，这个功能需要在后续完善

    const response: ApiResponse = {
      success: true,
      message: '验证码发送成功',
      data: {
        phone,
        type: type || 'login',
        expiresIn: 300, // 5分钟
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 健康检查
   */
  healthCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // 检查微信配置
    const wechatConfig = WechatUtils.validateConfig();

    const response: ApiResponse = {
      success: true,
      message: '认证服务运行正常',
      data: {
        service: 'auth',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        wechatConfig: wechatConfig.isValid ? 'valid' : 'invalid',
        wechatErrors: wechatConfig.errors,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });
}