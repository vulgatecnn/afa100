/**
 * CI/CD 测试结果通知系统
 * 支持多种通知渠道：Slack、钉钉、邮件、Webhook等
 */

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  templates: NotificationTemplates;
  retryAttempts: number;
  retryDelay: number;
}

export interface NotificationChannel {
  type: 'slack' | 'dingtalk' | 'email' | 'webhook' | 'github';
  name: string;
  config: any;
  enabled: boolean;
}

export interface NotificationTemplates {
  success: NotificationTemplate;
  failure: NotificationTemplate;
  warning: NotificationTemplate;
}

export interface NotificationTemplate {
  title: string;
  message: string;
  color?: string;
  emoji?: string;
}

export interface TestNotificationData {
  status: 'success' | 'failure' | 'warning';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    duration: number;
  };
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  environment: string;
  branch: string;
  commit: string;
  buildUrl?: string;
  reportUrl?: string;
  timestamp: string;
}

/**
 * CI测试通知管理器
 */
export class CITestNotificationManager {
  private config: NotificationConfig;

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: process.env.NOTIFICATION_ENABLED === 'true',
      channels: this.loadChannels(),
      templates: this.loadTemplates(),
      retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '2000'),
      ...config,
    };
  }

  /**
   * 发送测试结果通知
   */
  public async sendTestNotification(data: TestNotificationData): Promise<void> {
    if (!this.config.enabled) {
      console.log('通知功能已禁用');
      return;
    }

    console.log('📢 发送测试结果通知...');

    const enabledChannels = this.config.channels.filter(channel => channel.enabled);
    
    if (enabledChannels.length === 0) {
      console.log('⚠️ 没有启用的通知渠道');
      return;
    }

    const promises = enabledChannels.map(channel => 
      this.sendToChannel(channel, data)
    );

    const results = await Promise.allSettled(promises);
    
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      const channel = enabledChannels[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ 通知发送成功: ${channel.name} (${channel.type})`);
        successCount++;
      } else {
        console.error(`❌ 通知发送失败: ${channel.name} (${channel.type})`, result.reason);
        failureCount++;
      }
    });

    console.log(`📊 通知发送完成: 成功 ${successCount}, 失败 ${failureCount}`);
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(channel: NotificationChannel, data: TestNotificationData): Promise<void> {
    const template = this.config.templates[data.status];
    const message = this.formatMessage(template, data);

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        switch (channel.type) {
          case 'slack':
            await this.sendToSlack(channel, message, data);
            break;
          case 'dingtalk':
            await this.sendToDingTalk(channel, message, data);
            break;
          case 'email':
            await this.sendToEmail(channel, message, data);
            break;
          case 'webhook':
            await this.sendToWebhook(channel, message, data);
            break;
          case 'github':
            await this.sendToGitHub(channel, message, data);
            break;
          default:
            throw new Error(`不支持的通知渠道类型: ${channel.type}`);
        }
        return; // 成功发送，退出重试循环
      } catch (error) {
        console.error(`通知发送失败 (尝试 ${attempt}/${this.config.retryAttempts}):`, error.message);
        
        if (attempt === this.config.retryAttempts) {
          throw error; // 最后一次尝试失败，抛出错误
        }
        
        // 等待后重试
        await this.sleep(this.config.retryDelay * attempt);
      }
    }
  }

  /**
   * 发送到Slack
   */
  private async sendToSlack(channel: NotificationChannel, message: string, data: TestNotificationData): Promise<void> {
    const { webhookUrl } = channel.config;
    
    if (!webhookUrl) {
      throw new Error('Slack webhook URL未配置');
    }

    const template = this.config.templates[data.status];
    const payload = {
      text: message,
      attachments: [
        {
          color: this.getSlackColor(data.status),
          fields: [
            {
              title: '测试结果',
              value: `总计: ${data.summary.total}, 通过: ${data.summary.passed}, 失败: ${data.summary.failed}, 跳过: ${data.summary.skipped}`,
              short: false,
            },
            {
              title: '通过率',
              value: `${data.summary.passRate.toFixed(1)}%`,
              short: true,
            },
            {
              title: '执行时间',
              value: `${(data.summary.duration / 1000).toFixed(1)}秒`,
              short: true,
            },
            {
              title: '环境',
              value: data.environment,
              short: true,
            },
            {
              title: '分支',
              value: data.branch,
              short: true,
            },
          ],
          footer: 'AFA办公小程序CI/CD',
          ts: Math.floor(new Date(data.timestamp).getTime() / 1000),
        },
      ],
    };

    if (data.coverage) {
      payload.attachments[0].fields.push({
        title: '覆盖率',
        value: `行: ${data.coverage.lines.toFixed(1)}%, 函数: ${data.coverage.functions.toFixed(1)}%, 分支: ${data.coverage.branches.toFixed(1)}%`,
        short: false,
      });
    }

    if (data.reportUrl) {
      payload.attachments[0].fields.push({
        title: '测试报告',
        value: `<${data.reportUrl}|查看详细报告>`,
        short: false,
      });
    }

    await this.sendHttpRequest(webhookUrl, payload);
  }

  /**
   * 发送到钉钉
   */
  private async sendToDingTalk(channel: NotificationChannel, message: string, data: TestNotificationData): Promise<void> {
    const { webhookUrl, secret } = channel.config;
    
    if (!webhookUrl) {
      throw new Error('钉钉webhook URL未配置');
    }

    const template = this.config.templates[data.status];
    let url = webhookUrl;

    // 如果配置了密钥，生成签名
    if (secret) {
      const timestamp = Date.now();
      const crypto = await import('crypto');
      const sign = crypto.createHmac('sha256', secret)
        .update(`${timestamp}\n${secret}`)
        .digest('base64');
      url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }

    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: template.title,
        text: this.formatDingTalkMessage(message, data),
      },
    };

    await this.sendHttpRequest(url, payload);
  }

  /**
   * 发送到邮件
   */
  private async sendToEmail(channel: NotificationChannel, message: string, data: TestNotificationData): Promise<void> {
    const { smtpHost, smtpPort, username, password, from, to } = channel.config;
    
    if (!smtpHost || !username || !password || !from || !to) {
      throw new Error('邮件配置不完整');
    }

    // 这里可以集成邮件发送库，如nodemailer
    console.log('邮件通知功能需要集成邮件发送库');
    
    // 示例实现（需要安装nodemailer）
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: username,
        pass: password,
      },
    });

    const template = this.config.templates[data.status];
    
    await transporter.sendMail({
      from,
      to,
      subject: template.title,
      html: this.formatEmailMessage(message, data),
    });
    */
  }

  /**
   * 发送到Webhook
   */
  private async sendToWebhook(channel: NotificationChannel, message: string, data: TestNotificationData): Promise<void> {
    const { url, headers = {} } = channel.config;
    
    if (!url) {
      throw new Error('Webhook URL未配置');
    }

    const payload = {
      message,
      data,
      timestamp: data.timestamp,
    };

    await this.sendHttpRequest(url, payload, headers);
  }

  /**
   * 发送到GitHub
   */
  private async sendToGitHub(channel: NotificationChannel, message: string, data: TestNotificationData): Promise<void> {
    const { token, owner, repo, commitSha } = channel.config;
    
    if (!token || !owner || !repo) {
      throw new Error('GitHub配置不完整');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/statuses/${commitSha || data.commit}`;
    
    const payload = {
      state: data.status === 'success' ? 'success' : 'failure',
      description: `测试${data.status === 'success' ? '通过' : '失败'}: ${data.summary.passed}/${data.summary.total} (${data.summary.passRate.toFixed(1)}%)`,
      context: 'ci/integration-tests',
      target_url: data.reportUrl,
    };

    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    await this.sendHttpRequest(url, payload, headers);
  }

  /**
   * 发送HTTP请求
   */
  private async sendHttpRequest(url: string, payload: any, headers: Record<string, string> = {}): Promise<void> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(template: NotificationTemplate, data: TestNotificationData): string {
    const variables = {
      status: data.status === 'success' ? '成功' : data.status === 'failure' ? '失败' : '警告',
      emoji: template.emoji || this.getStatusEmoji(data.status),
      total: data.summary.total,
      passed: data.summary.passed,
      failed: data.summary.failed,
      skipped: data.summary.skipped,
      passRate: data.summary.passRate.toFixed(1),
      duration: (data.summary.duration / 1000).toFixed(1),
      environment: data.environment,
      branch: data.branch,
      commit: data.commit.substring(0, 8),
      timestamp: new Date(data.timestamp).toLocaleString('zh-CN'),
    };

    let message = template.message;
    
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });

    return message;
  }

  /**
   * 格式化钉钉消息
   */
  private formatDingTalkMessage(message: string, data: TestNotificationData): string {
    const template = this.config.templates[data.status];
    
    return `
# ${template.emoji} ${template.title}

${message}

## 📊 测试详情
- **总计**: ${data.summary.total}
- **通过**: ${data.summary.passed}
- **失败**: ${data.summary.failed}
- **跳过**: ${data.summary.skipped}
- **通过率**: ${data.summary.passRate.toFixed(1)}%
- **执行时间**: ${(data.summary.duration / 1000).toFixed(1)}秒

## 🔧 环境信息
- **环境**: ${data.environment}
- **分支**: ${data.branch}
- **提交**: ${data.commit.substring(0, 8)}
- **时间**: ${new Date(data.timestamp).toLocaleString('zh-CN')}

${data.coverage ? `
## 📈 覆盖率统计
- **行覆盖率**: ${data.coverage.lines.toFixed(1)}%
- **函数覆盖率**: ${data.coverage.functions.toFixed(1)}%
- **分支覆盖率**: ${data.coverage.branches.toFixed(1)}%
- **语句覆盖率**: ${data.coverage.statements.toFixed(1)}%
` : ''}

${data.reportUrl ? `[查看详细报告](${data.reportUrl})` : ''}
`;
  }

  /**
   * 加载通知渠道配置
   */
  private loadChannels(): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Slack配置
    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push({
        type: 'slack',
        name: 'Slack',
        enabled: process.env.SLACK_ENABLED !== 'false',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
        },
      });
    }

    // 钉钉配置
    if (process.env.DINGTALK_WEBHOOK_URL) {
      channels.push({
        type: 'dingtalk',
        name: '钉钉',
        enabled: process.env.DINGTALK_ENABLED !== 'false',
        config: {
          webhookUrl: process.env.DINGTALK_WEBHOOK_URL,
          secret: process.env.DINGTALK_SECRET,
        },
      });
    }

    // GitHub配置
    if (process.env.GITHUB_TOKEN) {
      channels.push({
        type: 'github',
        name: 'GitHub',
        enabled: process.env.GITHUB_ENABLED !== 'false',
        config: {
          token: process.env.GITHUB_TOKEN,
          owner: process.env.GITHUB_OWNER,
          repo: process.env.GITHUB_REPO,
          commitSha: process.env.GITHUB_SHA,
        },
      });
    }

    // 自定义Webhook配置
    if (process.env.WEBHOOK_URL) {
      channels.push({
        type: 'webhook',
        name: 'Webhook',
        enabled: process.env.WEBHOOK_ENABLED !== 'false',
        config: {
          url: process.env.WEBHOOK_URL,
          headers: process.env.WEBHOOK_HEADERS ? JSON.parse(process.env.WEBHOOK_HEADERS) : {},
        },
      });
    }

    return channels;
  }

  /**
   * 加载通知模板
   */
  private loadTemplates(): NotificationTemplates {
    return {
      success: {
        title: '✅ 前后端集成测试通过',
        message: '{{emoji}} 前后端集成测试{{status}}！所有 {{total}} 个测试用例均通过，通过率 {{passRate}}%，执行时间 {{duration}} 秒。',
        color: 'good',
        emoji: '✅',
      },
      failure: {
        title: '❌ 前后端集成测试失败',
        message: '{{emoji}} 前后端集成测试{{status}}！{{total}} 个测试用例中有 {{failed}} 个失败，通过率 {{passRate}}%，执行时间 {{duration}} 秒。请检查测试报告了解详细信息。',
        color: 'danger',
        emoji: '❌',
      },
      warning: {
        title: '⚠️ 前后端集成测试警告',
        message: '{{emoji}} 前后端集成测试完成，但存在 {{skipped}} 个跳过的测试。{{total}} 个测试用例中 {{passed}} 个通过，通过率 {{passRate}}%，执行时间 {{duration}} 秒。',
        color: 'warning',
        emoji: '⚠️',
      },
    };
  }

  /**
   * 获取状态对应的Slack颜色
   */
  private getSlackColor(status: string): string {
    const colorMap = {
      success: 'good',
      failure: 'danger',
      warning: 'warning',
    };
    return colorMap[status] || 'good';
  }

  /**
   * 获取状态对应的表情符号
   */
  private getStatusEmoji(status: string): string {
    const emojiMap = {
      success: '✅',
      failure: '❌',
      warning: '⚠️',
    };
    return emojiMap[status] || '📊';
  }

  /**
   * 延时工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 快速发送测试通知的工具函数
 */
export async function sendTestNotification(data: TestNotificationData): Promise<void> {
  const manager = new CITestNotificationManager();
  await manager.sendTestNotification(data);
}

/**
 * 从测试结果生成通知数据
 */
export function createNotificationData(
  testResults: any,
  environment: string = 'ci',
  branch: string = 'main',
  commit: string = 'unknown'
): TestNotificationData {
  const status = testResults.summary.failed > 0 ? 'failure' : 
                testResults.summary.skipped > 0 ? 'warning' : 'success';

  return {
    status,
    summary: testResults.summary,
    coverage: testResults.coverage,
    environment,
    branch,
    commit,
    buildUrl: process.env.BUILD_URL,
    reportUrl: process.env.REPORT_URL,
    timestamp: new Date().toISOString(),
  };
}