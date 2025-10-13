#!/bin/bash

# 端到端测试环境自动化部署脚本
# 用于CI/CD环境或本地测试环境的快速搭建

set -e  # 遇到错误立即退出

echo "🚀 开始设置端到端测试环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_prerequisites() {
    log_info "检查必要工具..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装，请先安装 pnpm 8+"
        exit 1
    fi
    
    # 检查Node.js版本
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 版本过低，需要 18+，当前版本: $(node --version)"
        exit 1
    fi
    
    log_info "✅ 必要工具检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 回到项目根目录
    cd "$(dirname "$0")/../../../../.."
    
    # 安装依赖
    pnpm install
    
    # 安装Playwright浏览器
    pnpm --filter tenant-admin exec playwright install
    
    log_info "✅ 依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    # 构建后端
    pnpm --filter backend build
    
    # 构建前端
    pnpm --filter tenant-admin build
    pnpm --filter merchant-admin build
    
    log_info "✅ 项目构建完成"
}

# 初始化测试数据库
init_test_database() {
    log_info "初始化测试数据库..."
    
    # 设置测试环境变量
    export NODE_ENV=test
    export E2E_DB_TYPE=sqlite
    export E2E_DB_PATH="./tests/e2e/fixtures/test.db"
    
    # 初始化数据库
    pnpm --filter backend db:init
    
    log_info "✅ 测试数据库初始化完成"
}

# 启动服务
start_services() {
    log_info "启动测试服务..."
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动后端服务（后台运行）
    log_info "启动后端服务..."
    pnpm --filter backend dev > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid
    
    # 等待后端服务启动
    sleep 5
    
    # 检查后端服务是否启动成功
    if ! curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        log_error "后端服务启动失败"
        cat logs/backend.log
        exit 1
    fi
    
    # 启动前端服务（后台运行）
    log_info "启动租务管理端..."
    pnpm --filter tenant-admin dev > logs/tenant-admin.log 2>&1 &
    TENANT_PID=$!
    echo $TENANT_PID > logs/tenant-admin.pid
    
    log_info "启动商户管理端..."
    pnpm --filter merchant-admin dev > logs/merchant-admin.log 2>&1 &
    MERCHANT_PID=$!
    echo $MERCHANT_PID > logs/merchant-admin.pid
    
    # 等待前端服务启动
    sleep 10
    
    log_info "✅ 所有服务启动完成"
    log_info "后端服务: http://localhost:3000"
    log_info "租务管理端: http://localhost:3001"
    log_info "商户管理端: http://localhost:3002"
}

# 验证服务状态
verify_services() {
    log_info "验证服务状态..."
    
    # 检查后端API
    if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        log_info "✅ 后端API正常"
    else
        log_error "❌ 后端API异常"
        return 1
    fi
    
    # 检查前端服务（可选）
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        log_info "✅ 租务管理端正常"
    else
        log_warn "⚠️ 租务管理端可能未完全启动"
    fi
    
    if curl -f http://localhost:3002 > /dev/null 2>&1; then
        log_info "✅ 商户管理端正常"
    else
        log_warn "⚠️ 商户管理端可能未完全启动"
    fi
    
    log_info "✅ 服务状态验证完成"
}

# 创建停止脚本
create_stop_script() {
    cat > stop-test-environment.sh << 'EOF'
#!/bin/bash

echo "🛑 停止端到端测试环境..."

# 停止服务
if [ -f logs/backend.pid ]; then
    kill $(cat logs/backend.pid) 2>/dev/null || true
    rm logs/backend.pid
    echo "✅ 后端服务已停止"
fi

if [ -f logs/tenant-admin.pid ]; then
    kill $(cat logs/tenant-admin.pid) 2>/dev/null || true
    rm logs/tenant-admin.pid
    echo "✅ 租务管理端已停止"
fi

if [ -f logs/merchant-admin.pid ]; then
    kill $(cat logs/merchant-admin.pid) 2>/dev/null || true
    rm logs/merchant-admin.pid
    echo "✅ 商户管理端已停止"
fi

# 清理日志文件
rm -f logs/*.log

echo "🎉 测试环境已完全停止"
EOF

    chmod +x stop-test-environment.sh
    log_info "✅ 停止脚本已创建: ./stop-test-environment.sh"
}

# 主函数
main() {
    log_info "端到端测试环境自动化部署开始"
    
    check_prerequisites
    install_dependencies
    build_project
    init_test_database
    start_services
    verify_services
    create_stop_script
    
    log_info "🎉 端到端测试环境设置完成！"
    log_info ""
    log_info "现在可以运行端到端测试:"
    log_info "  pnpm test:e2e"
    log_info ""
    log_info "停止测试环境:"
    log_info "  ./stop-test-environment.sh"
}

# 捕获中断信号，确保清理
trap 'log_error "脚本被中断"; exit 1' INT TERM

# 执行主函数
main "$@"