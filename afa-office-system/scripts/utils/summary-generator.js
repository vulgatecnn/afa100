/**
 * 摘要生成器
 * 负责生成各种测试结果摘要和报告
 */

/**
 * 摘要生成器类
 */
export class SummaryGenerator {
  constructor(logManager) {
    this.logManager = logManager;
  }

  /**
   * 生成项目级别的总体摘要
   */
  async generateOverallSummary(allResults, projectModules, options = {}) {
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    let totalSkipped = 0;
    let hasAnyErrors = false;
    let executionTime = 0;
    
    // 计算总体统计
    const moduleResults = [];
    
    allResults.forEach(result => {
      if (result.skipped) {
        moduleResults.push({
          moduleKey: result.moduleKey,
          moduleName: projectModules[result.moduleKey].name,
          status: 'skipped',
          reason: result.reason,
          passed: 0,
          failed: 0,
          total: 0,
          duration: '0s'
        });
        return;
      }
      
      const moduleName = projectModules[result.moduleKey].name;
      
      moduleResults.push({
        moduleKey: result.moduleKey,
        moduleName,
        status: result.hasErrors ? 'failed' : 'passed',
        passed: result.passed || 0,
        failed: result.failed || 0,
        total: result.totalTests || 0,
        duration: result.duration || '0s',
        hasErrors: result.hasErrors
      });
      
      totalPassed += result.passed || 0;
      totalFailed += result.failed || 0;
      totalTests += result.totalTests || 0;
      totalSkipped += result.skipped || 0;
      
      if (result.hasErrors) {
        hasAnyErrors = true;
      }
    });
    
    // 生成摘要内容
    let summary = `AFA办公系统测试总体摘要\n`;
    summary += '='.repeat(70) + '\n';
    summary += `生成时间: ${timestamp}\n`;
    summary += `测试模式: ${options.coverage ? '覆盖率测试' : '标准测试'}\n`;
    summary += `运行模式: ${options.parallel ? '并行执行' : '串行执行'}\n\n`;
    
    // 模块结果详情
    summary += '模块测试结果:\n';
    summary += '-'.repeat(50) + '\n';
    
    moduleResults.forEach(result => {
      if (result.status === 'skipped') {
        summary += `⚠️  ${result.moduleName}: 已跳过 (${result.reason})\n`;
      } else if (result.status === 'failed') {
        summary += `❌ ${result.moduleName}: ${result.failed} 个测试失败\n`;
        summary += `   📈 ${result.passed} 通过, ${result.failed} 失败, ${result.total} 总计 (${result.duration})\n`;
      } else {
        summary += `✅ ${result.moduleName}: 所有测试通过\n`;
        summary += `   📈 ${result.passed} 通过, ${result.total} 总计 (${result.duration})\n`;
      }
      summary += '\n';
    });
    
    // 总体统计
    summary += '='.repeat(70) + '\n';
    summary += '📊 项目总体统计:\n';
    summary += `-`.repeat(30) + '\n';
    summary += `总测试数: ${totalTests}\n`;
    summary += `通过数量: ${totalPassed}\n`;
    summary += `失败数量: ${totalFailed}\n`;
    summary += `跳过数量: ${totalSkipped}\n`;
    summary += `成功率: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0}%\n\n`;
    
    // 结果判断
    if (hasAnyErrors) {
      summary += `❌ 项目测试状态: 失败\n`;
      summary += `📁 详细日志目录: ${this.logManager.baseLogDir}\n`;
      summary += `📋 各模块错误摘要请查看对应的 errors-summary.txt 文件\n`;
    } else {
      summary += `✅ 项目测试状态: 成功\n`;
      summary += `🎉 所有模块测试均通过！\n`;
    }
    
    summary += '='.repeat(70) + '\n';
    
    // 保存摘要文件
    const summaryPath = await this.logManager.writeLogFile('summary', 'overall-summary.txt', summary);
    
    return {
      summary,
      summaryPath,
      statistics: {
        totalPassed,
        totalFailed,
        totalTests,
        totalSkipped,
        hasAnyErrors,
        successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0
      },
      moduleResults
    };
  }

  /**
   * 生成错误聚合摘要
   */
  async generateErrorAggregation(allResults, projectModules) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const failedModules = allResults.filter(result => result.hasErrors && !result.skipped);
    
    if (failedModules.length === 0) {
      return null; // 没有错误，不生成错误摘要
    }
    
    let errorSummary = `AFA办公系统测试错误聚合摘要\n`;
    errorSummary += '='.repeat(70) + '\n';
    errorSummary += `生成时间: ${timestamp}\n`;
    errorSummary += `失败模块数: ${failedModules.length}\n\n`;
    
    // 按模块列出错误
    for (const result of failedModules) {
      const moduleName = projectModules[result.moduleKey].name;
      
      errorSummary += `❌ ${moduleName} (${result.moduleKey})\n`;
      errorSummary += '-'.repeat(40) + '\n';
      errorSummary += `失败测试数: ${result.failed}\n`;
      errorSummary += `总测试数: ${result.totalTests}\n`;
      errorSummary += `失败率: ${((result.failed / result.totalTests) * 100).toFixed(2)}%\n`;
      
      // 尝试读取模块的错误摘要
      const moduleErrorSummary = await this.logManager.readLogFile(result.moduleKey, 'errors-summary.txt');
      if (moduleErrorSummary) {
        errorSummary += `\n详细错误信息:\n`;
        errorSummary += moduleErrorSummary.split('\n').slice(3).join('\n'); // 跳过标题行
      }
      
      errorSummary += `\n完整日志: ${this.logManager.getLogFilePath(result.moduleKey, 'test-execution.log')}\n`;
      errorSummary += '\n' + '='.repeat(50) + '\n\n';
    }
    
    // 错误统计
    const totalFailedTests = failedModules.reduce((sum, result) => sum + result.failed, 0);
    const totalTests = failedModules.reduce((sum, result) => sum + result.totalTests, 0);
    
    errorSummary += '📊 错误统计汇总:\n';
    errorSummary += '-'.repeat(30) + '\n';
    errorSummary += `失败模块: ${failedModules.length}\n`;
    errorSummary += `失败测试: ${totalFailedTests}\n`;
    errorSummary += `涉及总测试: ${totalTests}\n`;
    errorSummary += `整体失败率: ${((totalFailedTests / totalTests) * 100).toFixed(2)}%\n\n`;
    
    errorSummary += '🔧 建议操作:\n';
    errorSummary += '1. 查看各模块的详细错误日志\n';
    errorSummary += '2. 运行单个模块测试进行调试: node scripts/test-runner.js --module=<模块名>\n';
    errorSummary += '3. 使用详细模式查看完整输出: node scripts/test-runner.js --verbose\n';
    errorSummary += '='.repeat(70) + '\n';
    
    // 保存错误聚合摘要
    const errorSummaryPath = await this.logManager.writeLogFile('summary', 'all-errors-summary.txt', errorSummary);
    
    return {
      errorSummary,
      errorSummaryPath,
      failedModules: failedModules.length,
      totalFailedTests,
      totalTests
    };
  }

  /**
   * 生成覆盖率摘要
   */
  async generateCoverageSummary(allResults, projectModules, options = {}) {
    if (!options.coverage) {
      return null; // 没有运行覆盖率测试
    }
    
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let coverageSummary = `AFA办公系统测试覆盖率摘要\n`;
    coverageSummary += '='.repeat(70) + '\n';
    coverageSummary += `生成时间: ${timestamp}\n\n`;
    
    // 尝试从各模块收集覆盖率信息
    const coverageResults = [];
    
    for (const result of allResults) {
      if (result.skipped) continue;
      
      const moduleName = projectModules[result.moduleKey].name;
      
      // 尝试读取覆盖率详细信息
      const coverageDetails = await this.logManager.readLogFile(result.moduleKey, 'coverage-detailed.txt');
      
      coverageResults.push({
        moduleKey: result.moduleKey,
        moduleName,
        hasCoverage: !!coverageDetails,
        coverageDetails
      });
    }
    
    // 生成覆盖率报告
    coverageResults.forEach(result => {
      coverageSummary += `📊 ${result.moduleName} (${result.moduleKey})\n`;
      coverageSummary += '-'.repeat(40) + '\n';
      
      if (result.hasCoverage) {
        coverageSummary += result.coverageDetails + '\n';
      } else {
        coverageSummary += '⚠️  覆盖率信息不可用\n';
        coverageSummary += `📄 详细日志: ${this.logManager.getLogFilePath(result.moduleKey, 'test-execution.log')}\n`;
      }
      
      coverageSummary += '\n' + '='.repeat(50) + '\n\n';
    });
    
    coverageSummary += '📋 覆盖率报告说明:\n';
    coverageSummary += '- 各模块的详细覆盖率报告请查看对应的 coverage-detailed.txt 文件\n';
    coverageSummary += '- HTML覆盖率报告通常生成在各模块的 coverage/ 目录下\n';
    coverageSummary += '='.repeat(70) + '\n';
    
    // 保存覆盖率摘要
    const coverageSummaryPath = await this.logManager.writeLogFile('summary', 'coverage-summary.txt', coverageSummary);
    
    return {
      coverageSummary,
      coverageSummaryPath,
      moduleCount: coverageResults.length,
      modulesWithCoverage: coverageResults.filter(r => r.hasCoverage).length
    };
  }

  /**
   * 生成控制台友好的摘要
   */
  generateConsoleSummary(overallResult, options = {}) {
    if (options.silent && !overallResult.statistics.hasAnyErrors) {
      return ''; // 静默模式下成功时不输出
    }
    
    const lines = [];
    
    lines.push('');
    lines.push('='.repeat(70));
    lines.push('📊 AFA办公系统测试结果摘要');
    lines.push('='.repeat(70));
    
    // 总体状态
    if (overallResult.statistics.hasAnyErrors) {
      lines.push(`❌ 项目测试失败: ${overallResult.statistics.totalFailed} 个测试未通过`);
    } else {
      lines.push('✅ 所有项目测试通过');
    }
    
    // 统计信息
    lines.push(`📈 总体统计: ${overallResult.statistics.totalPassed} 通过, ${overallResult.statistics.totalFailed} 失败, ${overallResult.statistics.totalTests} 总计`);
    lines.push(`📊 成功率: ${overallResult.statistics.successRate}%`);
    
    // 模块状态概览
    lines.push('');
    lines.push('模块状态:');
    overallResult.moduleResults.forEach(result => {
      if (result.status === 'skipped') {
        lines.push(`  ⚠️  ${result.moduleName}: 已跳过`);
      } else if (result.status === 'failed') {
        lines.push(`  ❌ ${result.moduleName}: ${result.failed} 失败`);
      } else {
        lines.push(`  ✅ ${result.moduleName}: 通过`);
      }
    });
    
    // 详细信息链接
    if (overallResult.statistics.hasAnyErrors) {
      lines.push('');
      lines.push(`📄 详细摘要: ${overallResult.summaryPath}`);
      lines.push(`📁 日志目录: ${this.logManager.baseLogDir}`);
    }
    
    lines.push('='.repeat(70));
    
    return lines.join('\n');
  }

  /**
   * 生成简化的JSON摘要（用于CI/CD集成）
   */
  generateJsonSummary(overallResult, errorResult = null, coverageResult = null) {
    return {
      timestamp: new Date().toISOString(),
      status: overallResult.statistics.hasAnyErrors ? 'failed' : 'passed',
      statistics: overallResult.statistics,
      modules: overallResult.moduleResults.map(result => ({
        key: result.moduleKey,
        name: result.moduleName,
        status: result.status,
        passed: result.passed || 0,
        failed: result.failed || 0,
        total: result.total || 0,
        duration: result.duration || '0s',
        reason: result.reason || null
      })),
      files: {
        overallSummary: overallResult.summaryPath,
        errorSummary: errorResult?.errorSummaryPath || null,
        coverageSummary: coverageResult?.coverageSummaryPath || null
      },
      logDirectory: this.logManager.baseLogDir
    };
  }
}