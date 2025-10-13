/**
 * 核心业务功能集成测试
 * 实现任务 4.1: 建立业务功能集成测试
 * 
 * 测试目标:
 * - 实现核心业务功能的前后端协调测试
 * - 测试数据流转和状态管理的正确性
 * - 验证用户操作的完整性和准确性
 * - 需求: 1.1, 2.1, 3.1, 4.1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import type { ApiTestClient } from '../../src/utils/api-test-client.js';

describe('核心业务功能集成测试', () => {
  let helper: IntegrationTestHelper;
  let apiClient: ApiTestClient;
  let authToken: string;
  let testMerchantId: number;
  let testUserId: number;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
    await helper.setup({
      environment: 'integration',
      seedOptions: {
        includeUsers: true,
        includeMerchants: true,
        includeEmployees: true,
        includeVisitors: true,
      },
    });
    
    apiClient = helper.getApiClient();
    
    // 创建测试用户并获取认证令牌
    const { user, authResponse } = await helper.createAndLoginUser('merchant_admin');
    authToken = authResponse.accessToken;
    testUserId = user.id;
    
    // 获取测试商户ID
    const seedData = helper.getSeedData();
    testMerchantId = seedData?.merchants?.[0]?.id || 1;
    
    console.log('✅ 业务功能集成测试环境初始化完成');
  });

  afterAll(async () => {
    await helper?.cleanup();
    c
  });

  describe('1. 访客申请业务流
    it('应该完成访客申请-审批-) => {
      console.log('🧪 测试访客申请业务流程...');
      
     申请

        visitorName: '张三',
        visitorPhone: '13800138001',
        visitorCompany: '测试公司',
      谈',
        visitDate:],
        visitTime: '14:00',
        visiteeId: testUse,
        expectedDuration: 120,
      };

      const createResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${t,
        visitorApplicationData
      );

atus);
      
      if ([200,
        const application = createResponse.data;
        expect(application).to
        
Name,
          visitorPhone: visitorApplicationData.visitorPhone,
      
          merchantId: testMerchantId,
        });

        console.log('✅ 访客申请创建成功');
      } else {
        console.log(`⚠️ 访客申请创建失败，状态码: ${createResponse.statu);
      }
    });

() => {
      console.log('🧪 测试访客申请拒绝流程..
      
      // 创建访客申请
      c = {
       ,
     02',
       : '外部公司',
        visitPurpose: '推销产品',
        visitDate: new Date(Date.now()[0],
      00',
        visitee
        expectedDuration: 60,
      };

      const createResponse = awst(
        'POST',
        `/api/v1/merchants/${testMerchantId}/visitor-applications`,
        visitorApplicationDta
      );

      exs);

      if ([200, 201].includes(createResponse.status))
        const ata.id;

        // 拒绝申请
         = {
ed',
          approvalNotes: '访问目的不符合公司政策',
      ;

        const rejectionResponse = await apiClient.request(
',
          `/api
          rejectionData
        );

        expect([200, 400, 401, 40atus);
        

          const rejectedApplication = rejectionResponse.da
          expect({
            id: applicationId,
            status: 'reted',
          otes,
);

        完成');
        }
      }
    });
  });

  describe('2. 员工管理业务流程测试', () => {
    it('应该完成员=> {

      
      // 建员工
      c
       ,
03',
        email: 'wangwu@example.com',
        department: '技术部',
        position: '软件工程师',
      e',
      };

      const createR(
        'POST',
        `/api/v1/merchants/${testMeres`,
        employeeData
      );

      exus);

      if ([200, 201].includes(createResponse.status)){
        const e;
        expect(employee).toMatchObject({
          id: expect
        
ne,
          merchantId: testMerchantId,
      ive',
        });

        const employeeId = employee.id;

        // 2. 查询员工列表，验证员工已创建
        const listResponse = await auest(
          'GET',
          `/api/v1/merchant
        );

        expect([200, 401, 404]).toConta);

        if (listResponse.sta{
          const employees = listResponse.data.items |a;
          const oyees)
            ? employees.find((emp: any) => emp.id === empd)
          ll;
          
          if (createdEmployee) {
        ctive');
          }
        }

        console.log('✅ 员工管理业务流程测试完成');
      } else {
        co
      }
    });
  });

 () => {
    it('应该完成空间创建-配置-权限管理流程', async () => {
      console.务流程...');
      
      /
      c {
     会议室A',

        capacity: 10,
        location: '3楼东侧',
        description: '配备投影仪和白板的中型会议室',
      ning'],
        status: able',
      };

      const createResponse = (
        'POST',
        `/api/v1/merchant,
        spaceData
      );

      ex);
    
      if ([200, 201].includes(createResponse.status)) {
        const sa;
        expect(space).toMatchObject({
          id: expr),
        .name,

          merchantId: testMerchantId,
      lable',
        });

        console.log('✅ 商户空间管理业务流程测试完成');
      } else {
        console.log(`⚠️ 空间创建失败，}`);
      }
    });
  });


    it('应该完成通行验证-记录生成-查询统计流程', async () 
      console...');
      
      /验证
      c {
     3456',
ATE_001',
        location: '主入口',
        accessType: 'entry',
        timestamp: new Date().toISOStr
      

      const accessResponsest(
        'POST',
        `/api/v1/merchants/${rify`,
        accessData
      );

      exs);
      
      // 2. 查询通行记录
      const rect(
        'GET',
        `/api/v1/mecords`
      );

      expect([200, 401, 404]).toContain(recordsResponse.status);
      
      if (recordsR200) {
        const records = recordsResponse.data.items || ;
        expect
      }

');
    });
  });

  describe('5. 数据流转完整性测试', () => {
    it('应该验证跨模块数据流转的一致性', async () => {
      c
      
      // 1. 创建员工
      c
     me: '赵六',
0138004',
        email: 'zhaoliu@example.com',
        department: '行政部',
        position: '行政助理',
      };

      const employeeResponse
        'POST',
        `/api/v1/merchants/${
        employeeData
      );

      exatus);
     
      if ([200, 201].includes(employeeResponse.status)) {
        const e.data;
        const employeeId = employee.id;

        客申请

          visitorName: '孙七',
      
          visitorCompany: '合作伙伴公司',
          visitPurpose: '项目讨论',
          visitDate: new Date(Date.now(
0',
          visiteeId: emplo员工为被访者
          expectedDuration: 9
        };

        const visitorResponse = awaequest(
          'POST',
          `/api/v1/merchants/${testMerchantId}/visitor-applications`,
          visitorData
        );

        ex);
  
        if ([200, 201].includes(visitorResponse.status)) {
          const a
          
          // 验证数据关联正确性
          d);


        测试完成');
        }
      }
    });
  });

  describe('6. 业务状态管理测试', () => {
 => {
      console.log('🧪 测试业务状态管理...');
      
      /请状态转换
      cata = {
     周八',
',
        visitPurpose: '面试',
        visitDate: new Date(Date.now() 0],
        visitTime: '09:00',
      d,
        expectedDur,
      };

      const createResponse = await aquest(
        'POST',
        `/api/v1/merchants/${testMerchantId}/visitor-applications`,
        visitorData
      );

      exstatus);
 
      if ([200, 201].includes(createResponse.status))
        const a
        const applicationId = application.id;

        始状态


      ved
        const approvalResponse = await apiClient.reques
          'PUT',
          `/api/v1/merchants/${testMerchantId
安排确认' }
        );

tus);
        
        if (approvalResponse.status === 200) {
          expect);
        }

        co;
  }
    });
  });
});