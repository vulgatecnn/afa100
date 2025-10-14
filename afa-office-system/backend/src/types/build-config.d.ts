/**
 * 构建和部署配置类型定义
 * 为构建工具、测试框架和部署配置提供完整的类型支持
 */

// TypeScript编译器配置类型
export interface TypeScriptConfig {
  compilerOptions: {
    // 基本选项
    target?: 'ES3' | 'ES5' | 'ES6' | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ESNext';
    module?: 'None' | 'CommonJS' | 'AMD' | 'System' | 'UMD' | 'ES6' | 'ES2015' | 'ES2020' | 'ESNext' | 'Node16' | 'NodeNext';
    lib?: string[];
    allowJs?: boolean;
    checkJs?: boolean;
    jsx?: 'preserve' | 'react' | 'react-jsx' | 'react-jsxdev' | 'react-native';
    declaration?: boolean;
    declarationMap?: boolean;
    emitDeclarationOnly?: boolean;
    sourceMap?: boolean;
    outFile?: string;
    outDir?: string;
    rootDir?: string;
    composite?: boolean;
    tsBuildInfoFile?: string;
    removeComments?: boolean;
    noEmit?: boolean;
    importHelpers?: boolean;
    importsNotUsedAsValues?: 'remove' | 'preserve' | 'error';
    downlevelIteration?: boolean;
    isolatedModules?: boolean;
    
    // 严格类型检查选项
    strict?: boolean;
    noImplicitAny?: boolean;
    strictNullChecks?: boolean;
    strictFunctionTypes?: boolean;
    strictBindCallApply?: boolean;
    strictPropertyInitialization?: boolean;
    noImplicitThis?: boolean;
    useUnknownInCatchVariables?: boolean;
    alwaysStrict?: boolean;
    
    // 额外检查
    noUnusedLocals?: boolean;
    noUnusedParameters?: boolean;
    exactOptionalPropertyTypes?: boolean;
    noImplicitReturns?: boolean;
    noFallthroughCasesInSwitch?: boolean;
    noUncheckedIndexedAccess?: boolean;
    noImplicitOverride?: boolean;
    noPropertyAccessFromIndexSignature?: boolean;
    
    // 模块解析选项
    moduleResolution?: 'node' | 'classic' | 'node16' | 'nodenext';
    baseUrl?: string;
    paths?: Record<string, string[]>;
    rootDirs?: string[];
    typeRoots?: string[];
    types?: string[];
    allowSyntheticDefaultImports?: boolean;
    esModuleInterop?: boolean;
    preserveSymlinks?: boolean;
    allowUmdGlobalAccess?: boolean;
    moduleSuffixes?: string[];
    resolveJsonModule?: boolean;
    
    // 源映射选项
    sourceRoot?: string;
    mapRoot?: string;
    inlineSourceMap?: boolean;
    inlineSources?: boolean;
    
    // 实验性选项
    experimentalDecorators?: boolean;
    emitDecoratorMetadata?: boolean;
    
    // 高级选项
    skipLibCheck?: boolean;
    forceConsistentCasingInFileNames?: boolean;
    
    // 监视选项
    preserveWatchOutput?: boolean;
    pretty?: boolean;
    
    // 编译器插件
    plugins?: Array<{
      name: string;
      [key: string]: any;
    }>;
  };
  
  // 文件包含和排除
  include?: string[];
  exclude?: string[];
  files?: string[];
  
  // 项目引用
  references?: Array<{
    path: string;
    prepend?: boolean;
  }>;
  
  // 扩展配置
  extends?: string | string[];
  
  // TypeScript Node配置
  'ts-node'?: {
    esm?: boolean;
    experimentalSpecifierResolution?: 'node' | 'explicit';
    transpileOnly?: boolean;
    files?: boolean;
    compiler?: string;
    compilerOptions?: any;
    require?: string[];
    preferTsExts?: boolean;
    logError?: boolean;
    project?: string;
    skipProject?: boolean;
    skipIgnore?: boolean;
    typeCheck?: boolean;
    transpiler?: string;
    swc?: boolean;
  };
  
  // 监视配置
  watchOptions?: {
    watchFile?: 'fixedPollingInterval' | 'priorityPollingInterval' | 'dynamicPriorityPolling' | 'useFsEvents' | 'useFsEventsOnParentDirectory';
    watchDirectory?: 'useFsEvents' | 'fixedPollingInterval' | 'dynamicPriorityPolling';
    fallbackPolling?: 'fixedInterval' | 'priorityInterval' | 'dynamicPriority' | 'fixedChunkSize';
    synchronousWatchDirectory?: boolean;
    excludeDirectories?: string[];
    excludeFiles?: string[];
  };
  
  // 类型获取配置
  typeAcquisition?: {
    enable?: boolean;
    include?: string[];
    exclude?: string[];
    disableFilenameBasedTypeAcquisition?: boolean;
  };
}

// Vitest测试配置类型
export interface VitestConfig {
  test?: {
    // 基本配置
    globals?: boolean;
    environment?: 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime' | string;
    environmentOptions?: Record<string, any>;
    
    // 文件匹配
    include?: string[];
    exclude?: string[];
    includeSource?: string[];
    
    // 超时配置
    testTimeout?: number;
    hookTimeout?: number;
    teardownTimeout?: number;
    
    // 并发配置
    threads?: boolean;
    maxThreads?: number;
    minThreads?: number;
    singleThread?: boolean;
    isolate?: boolean;
    
    // 池配置
    pool?: 'threads' | 'forks' | 'vmThreads';
    poolOptions?: {
      threads?: {
        maxThreads?: number;
        minThreads?: number;
        useAtomics?: boolean;
        isolate?: boolean;
      };
      forks?: {
        maxForks?: number;
        minForks?: number;
        isolate?: boolean;
      };
      vmThreads?: {
        maxThreads?: number;
        minThreads?: number;
        useAtomics?: boolean;
      };
    };
    
    // 设置文件
    setupFiles?: string | string[];
    globalSetup?: string | string[];
    
    // 覆盖率配置
    coverage?: {
      provider?: 'v8' | 'istanbul' | 'c8';
      enabled?: boolean;
      clean?: boolean;
      cleanOnRerun?: boolean;
      reportsDirectory?: string;
      reporter?: Array<'text' | 'text-summary' | 'html' | 'json' | 'json-summary' | 'lcov' | 'clover' | 'cobertura' | 'teamcity' | 'none' | string>;
      reportOnFailure?: boolean;
      skipFull?: boolean;
      perFile?: boolean;
      thresholds?: {
        global?: CoverageThresholds;
        perFile?: CoverageThresholds;
      };
      include?: string[];
      exclude?: string[];
      extension?: string[];
      all?: boolean;
      src?: string[];
      
      // V8特定选项
      ignoreEmptyLines?: boolean;
      
      // Istanbul特定选项
      watermarks?: {
        statements?: [number, number];
        functions?: [number, number];
        branches?: [number, number];
        lines?: [number, number];
      };
    };
    
    // 报告器配置
    reporter?: Array<'default' | 'verbose' | 'dot' | 'junit' | 'json' | 'html' | 'tap' | 'tap-flat' | 'hanging-process' | string>;
    outputFile?: string | Record<string, string>;
    
    // 监视模式
    watch?: boolean;
    watchExclude?: string[];
    forceRerunTriggers?: string[];
    
    // 用户界面
    ui?: boolean;
    uiBase?: string;
    open?: boolean;
    
    // 其他选项
    passWithNoTests?: boolean;
    logHeapUsage?: boolean;
    allowOnly?: boolean;
    dangerouslyIgnoreUnhandledErrors?: boolean;
    sequence?: {
      shuffle?: boolean;
      concurrent?: boolean;
      seed?: number;
      hooks?: 'stack' | 'list' | 'parallel';
    };
    
    // 类型检查
    typecheck?: {
      enabled?: boolean;
      only?: boolean;
      checker?: 'tsc' | 'vue-tsc';
      include?: string[];
      exclude?: string[];
    };
    
    // 快照
    snapshotFormat?: {
      printBasicPrototype?: boolean;
      escapeRegex?: boolean;
      escapeString?: boolean;
      highlight?: boolean;
      indent?: number;
      maxDepth?: number;
      maxWidth?: number;
      min?: boolean;
      printFunctionName?: boolean;
      theme?: any;
    };
    
    // 环境变量
    env?: Record<string, string>;
    
    // 依赖优化
    deps?: {
      external?: (string | RegExp)[];
      inline?: (string | RegExp)[];
      registerNodeLoader?: boolean;
      interopDefault?: boolean;
    };
    
    // 基准测试
    benchmark?: {
      include?: string[];
      exclude?: string[];
      includeSource?: string[];
      reporters?: string[];
      outputFile?: string;
    };
    
    // 工作区配置
    workspace?: string;
    
    // 实验性功能
    experimentalVmThreads?: boolean;
  };
  
  // Vite配置
  resolve?: {
    alias?: Record<string, string>;
    dedupe?: string[];
    conditions?: string[];
    mainFields?: string[];
    extensions?: string[];
    preserveSymlinks?: boolean;
  };
  
  // 定义全局变量
  define?: Record<string, any>;
  
  // 插件
  plugins?: any[];
  
  // 服务器配置
  server?: {
    host?: string | boolean;
    port?: number;
    strictPort?: boolean;
    https?: boolean | any;
    open?: boolean | string;
    proxy?: Record<string, any>;
    cors?: boolean | any;
    headers?: Record<string, string>;
  };
  
  // 构建配置
  build?: {
    target?: string | string[];
    outDir?: string;
    assetsDir?: string;
    assetsInlineLimit?: number;
    cssCodeSplit?: boolean;
    cssTarget?: string | string[];
    sourcemap?: boolean | 'inline' | 'hidden';
    rollupOptions?: any;
    lib?: any;
    manifest?: boolean | string;
    ssrManifest?: boolean | string;
    ssr?: boolean | string;
    minify?: boolean | 'terser' | 'esbuild';
    terserOptions?: any;
    write?: boolean;
    emptyOutDir?: boolean;
    copyPublicDir?: boolean;
    reportCompressedSize?: boolean;
    chunkSizeWarningLimit?: number;
    watch?: any;
  };
}

// 覆盖率阈值类型
export interface CoverageThresholds {
  statements?: number;
  functions?: number;
  branches?: number;
  lines?: number;
}

// ESLint配置类型
export interface ESLintConfig {
  root?: boolean;
  env?: Record<string, boolean>;
  extends?: string | string[];
  parser?: string;
  parserOptions?: {
    ecmaVersion?: number | 'latest';
    sourceType?: 'script' | 'module';
    ecmaFeatures?: {
      globalReturn?: boolean;
      impliedStrict?: boolean;
      jsx?: boolean;
    };
    project?: string | string[];
    tsconfigRootDir?: string;
    extraFileExtensions?: string[];
  };
  plugins?: string[];
  rules?: Record<string, any>;
  settings?: Record<string, any>;
  overrides?: Array<{
    files?: string | string[];
    excludedFiles?: string | string[];
    env?: Record<string, boolean>;
    extends?: string | string[];
    parser?: string;
    parserOptions?: any;
    plugins?: string[];
    rules?: Record<string, any>;
    settings?: Record<string, any>;
  }>;
  ignorePatterns?: string[];
  noInlineConfig?: boolean;
  reportUnusedDisableDirectives?: boolean;
}

// Prettier配置类型
export interface PrettierConfig {
  // 基本格式化选项
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  quoteProps?: 'as-needed' | 'consistent' | 'preserve';
  jsxSingleQuote?: boolean;
  trailingComma?: 'none' | 'es5' | 'all';
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
  arrowParens?: 'avoid' | 'always';
  rangeStart?: number;
  rangeEnd?: number;
  requirePragma?: boolean;
  insertPragma?: boolean;
  proseWrap?: 'always' | 'never' | 'preserve';
  htmlWhitespaceSensitivity?: 'css' | 'strict' | 'ignore';
  vueIndentScriptAndStyle?: boolean;
  endOfLine?: 'lf' | 'crlf' | 'cr' | 'auto';
  embeddedLanguageFormatting?: 'auto' | 'off';
  singleAttributePerLine?: boolean;
  
  // 插件配置
  plugins?: string[];
  
  // 覆盖配置
  overrides?: Array<{
    files?: string | string[];
    excludeFiles?: string | string[];
    options?: Partial<PrettierConfig>;
  }>;
}

// Package.json脚本配置类型
export interface PackageScripts {
  // 构建脚本
  build?: string;
  'build:dev'?: string;
  'build:prod'?: string;
  'build:watch'?: string;
  
  // 开发脚本
  dev?: string;
  start?: string;
  'start:dev'?: string;
  'start:prod'?: string;
  
  // 测试脚本
  test?: string;
  'test:watch'?: string;
  'test:coverage'?: string;
  'test:unit'?: string;
  'test:integration'?: string;
  'test:e2e'?: string;
  
  // 代码质量脚本
  lint?: string;
  'lint:fix'?: string;
  format?: string;
  'type-check'?: string;
  
  // 数据库脚本
  'db:init'?: string;
  'db:migrate'?: string;
  'db:seed'?: string;
  'db:reset'?: string;
  
  // 部署脚本
  deploy?: string;
  'deploy:dev'?: string;
  'deploy:staging'?: string;
  'deploy:prod'?: string;
  
  // 其他脚本
  clean?: string;
  prepare?: string;
  postinstall?: string;
  precommit?: string;
  prepush?: string;
  
  // 自定义脚本
  [key: string]: string | undefined;
}

// 部署配置类型
export interface DeploymentConfig {
  // 环境配置
  environment: 'development' | 'staging' | 'production';
  
  // 服务器配置
  server: {
    host: string;
    port: number;
    protocol: 'http' | 'https';
    domain?: string;
    ssl?: {
      cert: string;
      key: string;
      ca?: string;
    };
  };
  
  // 数据库配置
  database: {
    type: 'mysql' | 'postgresql' | 'sqlite';
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl?: boolean;
    pool?: {
      min: number;
      max: number;
    };
  };
  
  // 缓存配置
  cache?: {
    type: 'redis' | 'memcached' | 'memory';
    host?: string;
    port?: number;
    password?: string;
    ttl?: number;
  };
  
  // 日志配置
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    file?: string;
    maxSize?: string;
    maxFiles?: number;
    compress?: boolean;
  };
  
  // 监控配置
  monitoring?: {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    sampleRate?: number;
  };
  
  // 安全配置
  security: {
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    helmet: boolean;
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  
  // 文件存储配置
  storage?: {
    type: 'local' | 's3' | 'gcs' | 'azure';
    bucket?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
    endpoint?: string;
  };
  
  // 邮件配置
  email?: {
    provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    apiKey?: string;
    from: string;
  };
  
  // 第三方服务配置
  services?: {
    wechat?: {
      appId: string;
      appSecret: string;
    };
    payment?: {
      provider: string;
      merchantId: string;
      apiKey: string;
    };
  };
}

// Docker配置类型
export interface DockerConfig {
  // Dockerfile配置
  dockerfile?: {
    baseImage: string;
    workdir: string;
    nodeVersion?: string;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    buildArgs?: Record<string, string>;
    env?: Record<string, string>;
    expose?: number[];
    healthcheck?: {
      test: string[];
      interval?: string;
      timeout?: string;
      retries?: number;
      startPeriod?: string;
    };
  };
  
  // Docker Compose配置
  compose?: {
    version: string;
    services: Record<string, DockerService>;
    networks?: Record<string, any>;
    volumes?: Record<string, any>;
  };
}

// Docker服务配置类型
export interface DockerService {
  image?: string;
  build?: {
    context: string;
    dockerfile?: string;
    args?: Record<string, string>;
  };
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
  networks?: string[];
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  healthcheck?: {
    test: string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
  };
  deploy?: {
    replicas?: number;
    resources?: {
      limits?: {
        cpus?: string;
        memory?: string;
      };
      reservations?: {
        cpus?: string;
        memory?: string;
      };
    };
  };
}

// CI/CD配置类型
export interface CICDConfig {
  // GitHub Actions配置
  github?: {
    workflows: Record<string, GitHubWorkflow>;
  };
  
  // GitLab CI配置
  gitlab?: {
    stages: string[];
    jobs: Record<string, GitLabJob>;
    variables?: Record<string, string>;
    cache?: any;
    artifacts?: any;
  };
  
  // Jenkins配置
  jenkins?: {
    pipeline: JenkinsPipeline;
  };
}

// GitHub Actions工作流配置
export interface GitHubWorkflow {
  name: string;
  on: {
    push?: {
      branches?: string[];
      tags?: string[];
      paths?: string[];
    };
    pull_request?: {
      branches?: string[];
      paths?: string[];
    };
    schedule?: Array<{
      cron: string;
    }>;
    workflow_dispatch?: any;
  };
  env?: Record<string, string>;
  jobs: Record<string, GitHubJob>;
}

// GitHub Actions作业配置
export interface GitHubJob {
  'runs-on': string;
  strategy?: {
    matrix?: Record<string, any>;
    'fail-fast'?: boolean;
    'max-parallel'?: number;
  };
  env?: Record<string, string>;
  steps: Array<{
    name?: string;
    uses?: string;
    run?: string;
    with?: Record<string, any>;
    env?: Record<string, string>;
    if?: string;
    'continue-on-error'?: boolean;
  }>;
  needs?: string | string[];
  if?: string;
  timeout?: number;
}

// GitLab CI作业配置
export interface GitLabJob {
  stage: string;
  image?: string;
  script: string[];
  before_script?: string[];
  after_script?: string[];
  variables?: Record<string, string>;
  cache?: any;
  artifacts?: any;
  only?: string[] | any;
  except?: string[] | any;
  when?: 'on_success' | 'on_failure' | 'always' | 'manual' | 'delayed';
  allow_failure?: boolean;
  retry?: number | any;
  timeout?: string;
  parallel?: number | any;
  dependencies?: string[];
  needs?: string[] | any;
}

// Jenkins管道配置
export interface JenkinsPipeline {
  agent: any;
  environment?: Record<string, string>;
  tools?: Record<string, string>;
  stages: Array<{
    name: string;
    steps: Array<{
      name?: string;
      script?: string;
      sh?: string;
      bat?: string;
      powershell?: string;
      when?: any;
    }>;
    when?: any;
    parallel?: Record<string, any>;
  }>;
  post?: {
    always?: any[];
    success?: any[];
    failure?: any[];
    unstable?: any[];
    changed?: any[];
  };
}

// 构建工具配置管理器接口
export interface BuildConfigManager {
  // TypeScript配置
  getTypeScriptConfig(): TypeScriptConfig;
  updateTypeScriptConfig(config: Partial<TypeScriptConfig>): void;
  validateTypeScriptConfig(config: TypeScriptConfig): ValidationResult;
  
  // 测试配置
  getVitestConfig(): VitestConfig;
  updateVitestConfig(config: Partial<VitestConfig>): void;
  validateVitestConfig(config: VitestConfig): ValidationResult;
  
  // 代码质量配置
  getESLintConfig(): ESLintConfig;
  updateESLintConfig(config: Partial<ESLintConfig>): void;
  getPrettierConfig(): PrettierConfig;
  updatePrettierConfig(config: Partial<PrettierConfig>): void;
  
  // 部署配置
  getDeploymentConfig(environment: string): DeploymentConfig;
  updateDeploymentConfig(environment: string, config: Partial<DeploymentConfig>): void;
  validateDeploymentConfig(config: DeploymentConfig): ValidationResult;
  
  // Docker配置
  getDockerConfig(): DockerConfig;
  updateDockerConfig(config: Partial<DockerConfig>): void;
  generateDockerfile(config: DockerConfig): string;
  generateDockerCompose(config: DockerConfig): string;
  
  // CI/CD配置
  getCICDConfig(): CICDConfig;
  updateCICDConfig(config: Partial<CICDConfig>): void;
  generateGitHubWorkflow(workflow: GitHubWorkflow): string;
  generateGitLabCI(config: any): string;
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// 导出所有类型
export {
  TypeScriptConfig,
  VitestConfig,
  CoverageThresholds,
  ESLintConfig,
  PrettierConfig,
  PackageScripts,
  DeploymentConfig,
  DockerConfig,
  DockerService,
  CICDConfig,
  GitHubWorkflow,
  GitHubJob,
  GitLabJob,
  JenkinsPipeline,
  BuildConfigManager,
  ValidationResult
};