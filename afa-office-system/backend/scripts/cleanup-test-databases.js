#!/usr/bin/env node

/**
 * MySQL测试数据库清理工具
 * 
 * 用于清理残留的测试数据库，避免磁盘空间浪费
 * 
 * 使用方法:
 *   node scripts/cleanup-test-databases.js
 *   node scripts/cleanup-test-databases.js --auto  # 自动清理过期数据库
 *   node scripts/cleanup-test-databases.js --all   # 清理所有测试数据库
 */

const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

class TestDatabaseCleaner {
  constructor() {
    this.config = {
      host: process.env.TEST_DB_HOST || process.env.MYSQL_ADMIN_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || process.env.MYSQL_ADMIN_PORT || '3306'),
      user: process.env.TEST_DB_USER || process.env.MYSQL_ADMIN_USER || 'root',
      password: process.env.TEST_DB_PASSWORD || process.env.MYSQL_ADMIN_PASSWORD || ''
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log(`✅ 已连接到MySQL: ${this.config.host}:${this.config.port}`);
    } catch (error) {
      console.error(`❌ 连接MySQL失败: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ 已断开MySQL连接');
    }
    this.rl.close();
  }

  async findTestDatabases() {
    console.log('🔍 查找测试数据库...');
    
    const [databases] = await this.connection.execute(`
      SELECT 
        SCHEMA_NAME,
        SUBSTRING(SCHEMA_NAME, 6) as timestamp_part
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME LIKE 'test_%'
      ORDER BY SCHEMA_NAME
    `);

    return databases.map(db => ({
      name: db.SCHEMA_NAME,
      timestampPart: db.timestamp_part,
      createdAt: this.parseTimestamp(db.timestamp_part)
    }));
  }

  parseTimestamp(timestampPart) {
    // 尝试解析时间戳格式: test_1234567890123_xxx
    const match = timestampPart.match(/^(\d{13})/);
    if (match) {
      return new Date(parseInt(match[1]));
    }
    return null;
  }

  async getExpiredDatabases(databases, maxAgeHours = 1) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    return databases.filter(db => {
      if (!db.createdAt) return false;
      return db.createdAt < cutoffTime;
    });
  }

  async getDatabaseSize(databaseName) {
    try {
      const [rows] = await this.connection.execute(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [databaseName]);
      
      return rows[0]?.size_mb || 0;
    } catch (error) {
      return 0;
    }
  }

  async showDatabaseInfo(databases) {
    console.log(`\n📊 找到 ${databases.length} 个测试数据库:\n`);
    
    let totalSize = 0;
    
    for (const db of databases) {
      const size = await this.getDatabaseSize(db.name);
      totalSize += size;
      
      const ageInfo = db.createdAt 
        ? `创建于: ${db.createdAt.toLocaleString()}`
        : '创建时间: 未知';
      
      console.log(`  📁 ${db.name}`);
      console.log(`     ${ageInfo}`);
      console.log(`     大小: ${size} MB`);
      console.log('');
    }
    
    console.log(`💾 总大小: ${totalSize.toFixed(2)} MB\n`);
  }

  async askConfirmation(message) {
    return new Promise((resolve) => {
      this.rl.question(`${message} (y/N): `, (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async deleteDatabases(databases) {
    console.log('🗑️  开始删除数据库...\n');
    
    let deletedCount = 0;
    let totalSizeFreed = 0;
    
    for (const db of databases) {
      try {
        const size = await this.getDatabaseSize(db.name);
        
        await this.connection.execute(`DROP DATABASE \`${db.name}\``);
        
        console.log(`✅ 已删除: ${db.name} (${size} MB)`);
        deletedCount++;
        totalSizeFreed += size;
        
      } catch (error) {
        console.log(`❌ 删除失败: ${db.name} - ${error.message}`);
      }
    }
    
    console.log(`\n🎉 清理完成:`);
    console.log(`   删除数据库: ${deletedCount} 个`);
    console.log(`   释放空间: ${totalSizeFreed.toFixed(2)} MB`);
  }

  async cleanupAll() {
    console.log('🧹 MySQL测试数据库清理工具\n');
    
    const databases = await this.findTestDatabases();
    
    if (databases.length === 0) {
      console.log('✅ 没有找到测试数据库');
      return;
    }
    
    await this.showDatabaseInfo(databases);
    
    const confirmed = await this.askConfirmation('是否删除这些数据库？');
    
    if (!confirmed) {
      console.log('❌ 取消清理操作');
      return;
    }
    
    await this.deleteDatabases(databases);
  }

  async cleanupExpired(maxAgeHours = 1) {
    console.log(`🔄 自动清理超过 ${maxAgeHours} 小时的测试数据库\n`);
    
    const allDatabases = await this.findTestDatabases();
    const expiredDatabases = await this.getExpiredDatabases(allDatabases, maxAgeHours);
    
    if (expiredDatabases.length === 0) {
      console.log('✅ 没有找到过期的测试数据库');
      return;
    }
    
    console.log(`找到 ${expiredDatabases.length} 个过期数据库:`);
    expiredDatabases.forEach(db => {
      console.log(`  - ${db.name} (${db.createdAt?.toLocaleString() || '时间未知'})`);
    });
    
    console.log('');
    await this.deleteDatabases(expiredDatabases);
  }

  async showStats() {
    console.log('📈 MySQL测试数据库统计信息\n');
    
    const databases = await this.findTestDatabases();
    
    if (databases.length === 0) {
      console.log('✅ 没有找到测试数据库');
      return;
    }
    
    // 按时间分组统计
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let recentCount = 0;
    let oldCount = 0;
    let veryOldCount = 0;
    let unknownCount = 0;
    let totalSize = 0;
    
    for (const db of databases) {
      const size = await this.getDatabaseSize(db.name);
      totalSize += size;
      
      if (!db.createdAt) {
        unknownCount++;
      } else if (db.createdAt > oneHourAgo) {
        recentCount++;
      } else if (db.createdAt > oneDayAgo) {
        oldCount++;
      } else {
        veryOldCount++;
      }
    }
    
    console.log(`总数据库数量: ${databases.length}`);
    console.log(`最近1小时内: ${recentCount} 个`);
    console.log(`1小时-1天前: ${oldCount} 个`);
    console.log(`1天以上: ${veryOldCount} 个`);
    console.log(`时间未知: ${unknownCount} 个`);
    console.log(`总占用空间: ${totalSize.toFixed(2)} MB`);
    
    if (veryOldCount > 0) {
      console.log(`\n💡 建议清理 ${veryOldCount} 个超过1天的数据库`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cleaner = new TestDatabaseCleaner();
  
  try {
    await cleaner.connect();
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
MySQL测试数据库清理工具

使用方法:
  node scripts/cleanup-test-databases.js          # 交互式清理所有测试数据库
  node scripts/cleanup-test-databases.js --auto   # 自动清理过期数据库(1小时)
  node scripts/cleanup-test-databases.js --all    # 清理所有测试数据库(无确认)
  node scripts/cleanup-test-databases.js --stats  # 显示统计信息
  node scripts/cleanup-test-databases.js --expired-hours=24  # 清理超过24小时的数据库

环境变量:
  TEST_DB_HOST      MySQL主机地址 (默认: 127.0.0.1)
  TEST_DB_PORT      MySQL端口 (默认: 3306)
  TEST_DB_USER      MySQL用户名 (默认: root)
  TEST_DB_PASSWORD  MySQL密码
      `);
    } else if (args.includes('--stats')) {
      await cleaner.showStats();
    } else if (args.includes('--auto')) {
      const hoursArg = args.find(arg => arg.startsWith('--expired-hours='));
      const hours = hoursArg ? parseInt(hoursArg.split('=')[1]) : 1;
      await cleaner.cleanupExpired(hours);
    } else if (args.includes('--all')) {
      const databases = await cleaner.findTestDatabases();
      if (databases.length > 0) {
        await cleaner.deleteDatabases(databases);
      } else {
        console.log('✅ 没有找到测试数据库');
      }
    } else {
      await cleaner.cleanupAll();
    }
    
  } catch (error) {
    console.error(`❌ 清理工具执行失败: ${error.message}`);
    process.exit(1);
  } finally {
    await cleaner.disconnect();
  }
}

// 处理程序退出
process.on('SIGINT', async () => {
  console.log('\n\n👋 收到退出信号，正在清理...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n👋 收到终止信号，正在清理...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = TestDatabaseCleaner;