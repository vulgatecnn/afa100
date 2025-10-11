import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 导入中间件
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/not-found.middleware.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { securityHeaders } from './middleware/security.middleware.js';

// 导入路由
import routes from './routes/index.js';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: express.Application = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// 安全中间件
app.use(helmet());
app.use(securityHeaders);

// CORS配置
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 日志中间件
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(requestLogger);

// 请求体解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// 健康检查端点
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'AFA办公小程序后端服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API路由
app.use('/api', routes);

// 404处理
app.use(notFound);

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 AFA办公小程序后端服务启动成功`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;