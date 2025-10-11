// 简单的通行验证接口测试
const express = require('express');
const { AccessController } = require('./dist/src/controllers/access.controller.js');

const app = express();
app.use(express.json());

const accessController = new AccessController();

// 测试通行码验证接口
app.post('/test/validate', async (req, res) => {
  try {
    console.log('收到验证请求:', req.body);
    
    // 模拟请求对象
    const mockReq = {
      body: req.body,
      params: {},
      query: {},
      user: undefined
    };
    
    // 模拟响应对象
    const mockRes = {
      json: (data) => {
        console.log('响应数据:', data);
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          console.log('响应状态:', code, '数据:', data);
          res.status(code).json(data);
        }
      })
    };
    
    await accessController.validatePasscode(mockReq, mockRes);
  } catch (error) {
    console.error('测试错误:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`测试服务器运行在端口 ${PORT}`);
  console.log('测试URL: POST http://localhost:3001/test/validate');
  console.log('测试数据示例:');
  console.log(JSON.stringify({
    code: 'TEST123456',
    deviceId: 'device001',
    direction: 'in',
    deviceType: 'door_scanner'
  }, null, 2));
});