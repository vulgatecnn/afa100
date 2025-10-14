/**
 * 工具库类型定义
 * 解决其他工具库相关的类型问题
 */

// Joi 验证库类型扩展
declare module 'joi' {
  interface Root {
    // 基础类型
    any(): AnySchema;
    array(): ArraySchema;
    boolean(): BooleanSchema;
    date(): DateSchema;
    function(): FunctionSchema;
    number(): NumberSchema;
    object(schema?: SchemaMap): ObjectSchema;
    string(): StringSchema;
    symbol(): SymbolSchema;
    alternatives(...schemas: SchemaLike[]): AlternativesSchema;
    alt(...schemas: SchemaLike[]): AlternativesSchema;
    when(condition: string | Reference, options: WhenOptions): AlternativesSchema;
    
    // 引用和链接
    ref(key: string, options?: ReferenceOptions): Reference;
    link(ref?: string): LinkSchema;
    
    // 验证方法
    validate(value: any, schema?: SchemaLike, options?: ValidationOptions): ValidationResult;
    validateAsync(value: any, schema?: SchemaLike, options?: AsyncValidationOptions): Promise<any>;
    compile(schema: SchemaLike): Schema;
    
    // 工具方法
    assert(value: any, schema: SchemaLike, message?: string | Error): void;
    attempt(value: any, schema: SchemaLike, message?: string | Error): any;
    
    // 扩展
    extend(...extensions: Extension[]): Root;
    
    // 默认值
    defaults(fn: (schema: Schema) => Schema): Root;
    
    // 表达式
    expression(template: string): Template;
    
    // 版本
    version: string;
  }

  interface Schema {
    // 通用方法
    allow(...values: any[]): this;
    valid(...values: any[]): this;
    invalid(...values: any[]): this;
    required(): this;
    optional(): this;
    forbidden(): this;
    strip(): this;
    description(desc: string): this;
    notes(notes: string | string[]): this;
    tags(tags: string | string[]): this;
    meta(meta: object): this;
    example(value: any): this;
    unit(name: string): this;
    options(options: ValidationOptions): this;
    strict(isStrict?: boolean): this;
    label(name: string): this;
    raw(isRaw?: boolean): this;
    empty(schema?: SchemaLike): this;
    default(value?: any, description?: string): this;
    concat(schema: this): this;
    when(condition: string | Reference, options: WhenOptions): this;
    validate(value: any, options?: ValidationOptions): ValidationResult;
    validateAsync(value: any, options?: AsyncValidationOptions): Promise<any>;
    
    // 错误处理
    error(err: Error | string | ErrorReport): this;
    message(messages: LanguageMessages): this;
    messages(messages: LanguageMessages): this;
    
    // 预处理
    prefs(options: ValidationOptions): this;
    preferences(options: ValidationOptions): this;
    
    // 缓存
    cache(cache?: object): this;
    
    // 类型检查
    type: string;
    
    // 提取
    extract(path: string | string[]): Schema;
    fork(paths: string | string[], adjuster: (schema: Schema) => Schema): this;
    
    // 编译
    compile(): this;
    
    // 描述
    describe(): Description;
    
    // 标志
    flags: object;
    
    // 规则
    rules: object[];
  }

  interface AnySchema extends Schema {
    // Any 特定方法
    unknown(allow?: boolean): this;
  }

  interface ArraySchema extends Schema {
    // Array 特定方法
    items(...schemas: SchemaLike[]): this;
    ordered(...schemas: SchemaLike[]): this;
    min(limit: number): this;
    max(limit: number): this;
    length(limit: number): this;
    unique(comparator?: string | ((a: any, b: any) => boolean), options?: { ignoreUndefined?: boolean }): this;
    sparse(enabled?: boolean): this;
    single(enabled?: boolean): this;
    has(schema: SchemaLike): this;
    sort(options?: { by?: string | Reference; order?: 'ascending' | 'descending' }): this;
  }

  interface BooleanSchema extends Schema {
    // Boolean 特定方法
    truthy(...values: any[]): this;
    falsy(...values: any[]): this;
    insensitive(enabled?: boolean): this;
  }

  interface DateSchema extends Schema {
    // Date 特定方法
    min(date: Date | string | Reference): this;
    max(date: Date | string | Reference): this;
    greater(date: Date | string | Reference): this;
    less(date: Date | string | Reference): this;
    iso(): this;
    timestamp(type?: 'javascript' | 'unix'): this;
  }

  interface FunctionSchema extends Schema {
    // Function 特定方法
    arity(n: number): this;
    minArity(n: number): this;
    maxArity(n: number): this;
    ref(): this;
  }

  interface NumberSchema extends Schema {
    // Number 特定方法
    min(limit: number | Reference): this;
    max(limit: number | Reference): this;
    greater(limit: number | Reference): this;
    less(limit: number | Reference): this;
    integer(): this;
    precision(limit: number): this;
    multiple(base: number): this;
    positive(): this;
    negative(): this;
    port(): this;
    unsafe(enabled?: boolean): this;
  }

  interface ObjectSchema extends Schema {
    // Object 特定方法
    keys(schema?: SchemaMap): this;
    append(schema?: SchemaMap): this;
    min(limit: number): this;
    max(limit: number): this;
    length(limit: number): this;
    pattern(pattern: RegExp | SchemaLike, schema: SchemaLike): this;
    and(...peers: string[]): this;
    nand(...peers: string[]): this;
    or(...peers: string[]): this;
    xor(...peers: string[]): this;
    oxor(...peers: string[]): this;
    with(key: string, peers: string | string[]): this;
    without(key: string, peers: string | string[]): this;
    rename(from: string, to: string, options?: RenameOptions): this;
    assert(ref: string | Reference, schema: SchemaLike, message?: string): this;
    unknown(allow?: boolean): this;
    id(id?: string): this;
  }

  interface StringSchema extends Schema {
    // String 特定方法
    insensitive(): this;
    min(limit: number | Reference, encoding?: string): this;
    max(limit: number | Reference, encoding?: string): this;
    truncate(enabled?: boolean): this;
    creditCard(): this;
    regex(pattern: RegExp, options?: string | { name?: string; invert?: boolean }): this;
    pattern(pattern: RegExp, options?: string | { name?: string; invert?: boolean }): this;
    replace(pattern: RegExp | string, replacement: string): this;
    alphanum(): this;
    token(): this;
    email(options?: EmailOptions): this;
    ip(options?: IpOptions): this;
    uri(options?: UriOptions): this;
    dataUri(options?: DataUriOptions): this;
    domain(options?: DomainOptions): this;
    hostname(): this;
    normalize(form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): this;
    lowercase(): this;
    uppercase(): this;
    trim(enabled?: boolean): this;
    hex(options?: { byteAligned?: boolean }): this;
    base64(options?: { paddingRequired?: boolean; urlSafe?: boolean }): this;
    length(limit: number | Reference, encoding?: string): this;
    guid(options?: GuidOptions): this;
    uuid(options?: GuidOptions): this;
    isoDate(): this;
    isoDuration(): this;
  }

  interface SymbolSchema extends Schema {
    // Symbol 特定方法
    map(iterable: Iterable<[string | number | boolean | symbol, symbol]> | { [key: string]: symbol }): this;
  }

  interface AlternativesSchema extends Schema {
    // Alternatives 特定方法
    try(...schemas: SchemaLike[]): this;
    conditional(condition: string | Reference, options: ConditionalOptions): this;
    match(mode: 'any' | 'one' | 'all'): this;
  }

  interface LinkSchema extends Schema {
    // Link 特定方法
    ref(ref: string): this;
    concat(schema: Schema): Schema;
  }

  // 接口定义
  interface ValidationOptions {
    abortEarly?: boolean;
    allowUnknown?: boolean;
    cache?: boolean;
    context?: object;
    convert?: boolean;
    dateFormat?: 'date' | 'iso' | 'string' | 'time' | 'utc';
    debug?: boolean;
    errors?: {
      escapeHtml?: boolean;
      label?: 'path' | 'key' | false;
      language?: string;
      render?: boolean;
      stack?: boolean;
      wrap?: {
        label?: string | false;
        array?: string | false;
      };
    };
    externals?: boolean;
    noDefaults?: boolean;
    nonEnumerables?: boolean;
    presence?: 'required' | 'optional' | 'forbidden';
    skipFunctions?: boolean;
    stripUnknown?: boolean | { arrays?: boolean; objects?: boolean };
    warnings?: boolean;
  }

  interface AsyncValidationOptions extends ValidationOptions {
    warnings?: boolean;
  }

  interface ValidationResult {
    error?: ValidationError;
    value: any;
    warning?: ValidationError;
  }

  interface ValidationError extends Error {
    name: 'ValidationError';
    isJoi: true;
    details: ValidationErrorItem[];
    annotate(stripColors?: boolean): string;
    _original: any;
  }

  interface ValidationErrorItem {
    message: string;
    path: (string | number)[];
    type: string;
    context?: Context;
  }

  interface Context {
    key?: string;
    label?: string;
    value?: any;
    [key: string]: any;
  }

  interface SchemaMap {
    [key: string]: SchemaLike;
  }

  interface ReferenceOptions {
    separator?: string;
    contextPrefix?: string;
    default?: any;
    strict?: boolean;
    functions?: boolean;
  }

  interface Reference {
    isContext: boolean;
    key: string;
    path: string[];
    depth: number;
    root: string;
    toString(): string;
  }

  interface WhenOptions {
    is?: SchemaLike;
    then?: SchemaLike;
    otherwise?: SchemaLike;
    switch?: Array<{ is: SchemaLike; then: SchemaLike }>;
  }

  interface ConditionalOptions {
    is?: SchemaLike;
    then?: SchemaLike;
    otherwise?: SchemaLike;
  }

  interface RenameOptions {
    alias?: boolean;
    multiple?: boolean;
    override?: boolean;
    ignoreUndefined?: boolean;
  }

  interface EmailOptions {
    allowUnicode?: boolean;
    ignoreLength?: boolean;
    minDomainSegments?: number;
    multiple?: boolean;
    separator?: string | string[];
    tlds?: { allow?: Set<string> | string[] | boolean; deny?: Set<string> | string[] };
  }

  interface IpOptions {
    version?: string | string[];
    cidr?: 'required' | 'optional' | 'forbidden';
  }

  interface UriOptions {
    allowRelative?: boolean;
    allowQuerySquareBrackets?: boolean;
    domain?: DomainOptions;
    relativeOnly?: boolean;
    scheme?: string | RegExp | Array<string | RegExp>;
  }

  interface DataUriOptions {
    paddingRequired?: boolean;
  }

  interface DomainOptions {
    allowUnicode?: boolean;
    minDomainSegments?: number;
    tlds?: { allow?: Set<string> | string[] | boolean; deny?: Set<string> | string[] };
  }

  interface GuidOptions {
    version?: string | string[];
    separator?: string | boolean;
  }

  interface Description {
    type?: string;
    label?: string;
    description?: string;
    flags?: object;
    notes?: string[];
    tags?: string[];
    meta?: any[];
    example?: any[];
    valids?: any[];
    invalids?: any[];
    unit?: string;
    options?: ValidationOptions;
    [key: string]: any;
  }

  interface Extension {
    type?: string;
    base?: Schema;
    messages?: LanguageMessages;
    coerce?: (value: any, helpers: any) => any;
    pre?: (value: any, helpers: any) => any;
    language?: LanguageMessages;
    describe?: (description: Description) => Description;
    rules?: { [name: string]: RuleOptions };
    terms?: { [name: string]: any };
    args?: (schema: Schema, ...args: any[]) => Schema;
    cast?: { [type: string]: { from: (value: any) => boolean; to: (value: any, helpers: any) => any } };
    manifest?: {
      build?: (obj: any, helpers: any) => any;
    };
    rebuild?: (schema: Schema) => void;
  }

  interface RuleOptions {
    alias?: string;
    method?: (...args: any[]) => any;
    validate?: (value: any, helpers: any, args: any, options: any) => any;
    args?: Array<{
      name: string;
      ref?: boolean;
      assert?: SchemaLike | ((value: any) => boolean);
      normalize?: (value: any) => any;
      message?: string;
    }>;
    multi?: boolean;
    convert?: boolean;
    priority?: boolean;
    manifest?: boolean;
  }

  interface LanguageMessages {
    [key: string]: string;
  }

  interface ErrorReport {
    code: string;
    message: string;
    path?: (string | number)[];
    local?: object;
  }

  interface Template {
    render(context: object, options?: object): string;
  }

  type SchemaLike = Schema | SchemaMap | string | number | boolean | null | object;

  const Joi: Root;
  export = Joi;
}

// QRCode 库类型扩展
declare module 'qrcode' {
  interface QRCodeOptions {
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    width?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    version?: number;
    maskPattern?: number;
    toSJISFunc?: (codePoint: string) => number;
  }

  interface QRCodeToDataURLOptions extends QRCodeOptions {
    rendererOpts?: {
      quality?: number;
    };
  }

  interface QRCodeToStringOptions extends QRCodeOptions {
    type?: 'svg' | 'terminal' | 'utf8';
  }

  interface QRCodeToFileOptions extends QRCodeOptions {
    rendererOpts?: {
      quality?: number;
    };
  }

  interface QRCodeSegment {
    data: string | Buffer | Uint8ClampedArray;
    mode?: 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
  }

  function toDataURL(text: string | QRCodeSegment[], options?: QRCodeToDataURLOptions): Promise<string>;
  function toDataURL(text: string | QRCodeSegment[], callback: (error: Error | null, url: string) => void): void;
  function toDataURL(text: string | QRCodeSegment[], options: QRCodeToDataURLOptions, callback: (error: Error | null, url: string) => void): void;

  function toString(text: string | QRCodeSegment[], options?: QRCodeToStringOptions): Promise<string>;
  function toString(text: string | QRCodeSegment[], callback: (error: Error | null, string: string) => void): void;
  function toString(text: string | QRCodeSegment[], options: QRCodeToStringOptions, callback: (error: Error | null, string: string) => void): void;

  function toCanvas(canvas: HTMLCanvasElement, text: string | QRCodeSegment[], options?: QRCodeOptions): Promise<void>;
  function toCanvas(canvas: HTMLCanvasElement, text: string | QRCodeSegment[], callback: (error: Error | null) => void): void;
  function toCanvas(canvas: HTMLCanvasElement, text: string | QRCodeSegment[], options: QRCodeOptions, callback: (error: Error | null) => void): void;
  function toCanvas(text: string | QRCodeSegment[], options?: QRCodeOptions): Promise<HTMLCanvasElement>;
  function toCanvas(text: string | QRCodeSegment[], callback: (error: Error | null, canvas: HTMLCanvasElement) => void): void;
  function toCanvas(text: string | QRCodeSegment[], options: QRCodeOptions, callback: (error: Error | null, canvas: HTMLCanvasElement) => void): void;

  function toFile(path: string, text: string | QRCodeSegment[], options?: QRCodeToFileOptions): Promise<void>;
  function toFile(path: string, text: string | QRCodeSegment[], callback: (error: Error | null) => void): void;
  function toFile(path: string, text: string | QRCodeSegment[], options: QRCodeToFileOptions, callback: (error: Error | null) => void): void;

  function toFileStream(stream: NodeJS.WritableStream, text: string | QRCodeSegment[], options?: QRCodeOptions): void;

  // 创建函数
  function create(text: string | QRCodeSegment[], options?: QRCodeOptions): QRCode;

  interface QRCode {
    version: number;
    errorCorrectionLevel: number;
    modules: QRCodeModule;
    segments: QRCodeSegment[];
  }

  interface QRCodeModule {
    size: number;
    data: Uint8Array;
    reservedBit: Uint8Array;
  }
}

// Axios 类型扩展
declare module 'axios' {
  interface AxiosRequestConfig {
    url?: string;
    method?: Method;
    baseURL?: string;
    transformRequest?: AxiosTransformer | AxiosTransformer[];
    transformResponse?: AxiosTransformer | AxiosTransformer[];
    headers?: any;
    params?: any;
    paramsSerializer?: (params: any) => string;
    data?: any;
    timeout?: number;
    timeoutErrorMessage?: string;
    withCredentials?: boolean;
    adapter?: AxiosAdapter;
    auth?: AxiosBasicCredentials;
    responseType?: ResponseType;
    responseEncoding?: responseEncoding | string;
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
    onUploadProgress?: (progressEvent: any) => void;
    onDownloadProgress?: (progressEvent: any) => void;
    maxContentLength?: number;
    maxBodyLength?: number;
    validateStatus?: ((status: number) => boolean) | null;
    maxRedirects?: number;
    socketPath?: string | null;
    httpAgent?: any;
    httpsAgent?: any;
    proxy?: AxiosProxyConfig | false;
    cancelToken?: CancelToken;
    signal?: AbortSignal;
    decompress?: boolean;
    transitional?: TransitionalOptions;
    env?: {
      FormData?: new (...args: any[]) => object;
    };
    formSerializer?: FormSerializerOptions;
    insecureHTTPParser?: boolean;
    [key: string]: any;
  }

  interface AxiosResponse<T = any, D = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: AxiosRequestConfig<D>;
    request?: any;
  }

  interface AxiosError<T = unknown, D = any> extends Error {
    config: AxiosRequestConfig<D>;
    code?: string;
    request?: any;
    response?: AxiosResponse<T, D>;
    isAxiosError: boolean;
    toJSON: () => object;
  }

  interface AxiosPromise<T = any> extends Promise<AxiosResponse<T>> {}

  interface CancelStatic {
    new (message?: string): Cancel;
  }

  interface Cancel {
    message: string;
  }

  interface Canceler {
    (message?: string): void;
  }

  interface CancelTokenStatic {
    new (executor: (cancel: Canceler) => void): CancelToken;
    source(): CancelTokenSource;
  }

  interface CancelToken {
    promise: Promise<Cancel>;
    reason?: Cancel;
    throwIfRequested(): void;
  }

  interface CancelTokenSource {
    token: CancelToken;
    cancel: Canceler;
  }

  interface AxiosInterceptorManager<V> {
    use<T = V>(onFulfilled?: (value: V) => T | Promise<T>, onRejected?: (error: any) => any): number;
    eject(id: number): void;
  }

  interface AxiosInstance {
    defaults: AxiosRequestConfig;
    interceptors: {
      request: AxiosInterceptorManager<AxiosRequestConfig>;
      response: AxiosInterceptorManager<AxiosResponse>;
    };
    getUri(config?: AxiosRequestConfig): string;
    request<T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
    get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    head<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    options<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  }

  interface AxiosStatic extends AxiosInstance {
    create(config?: AxiosRequestConfig): AxiosInstance;
    Cancel: CancelStatic;
    CancelToken: CancelTokenStatic;
    isCancel(value: any): boolean;
    all<T>(values: Array<T | Promise<T>>): Promise<T[]>;
    spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
    isAxiosError(payload: any): payload is AxiosError;
  }

  type Method = 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH' | 'purge' | 'PURGE' | 'link' | 'LINK' | 'unlink' | 'UNLINK';
  type ResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
  type responseEncoding = 'ascii' | 'ASCII' | 'ansi' | 'ANSI' | 'binary' | 'BINARY' | 'base64' | 'BASE64' | 'base64url' | 'BASE64URL' | 'hex' | 'HEX' | 'latin1' | 'LATIN1' | 'ucs-2' | 'UCS-2' | 'ucs2' | 'UCS2' | 'utf-8' | 'UTF-8' | 'utf8' | 'UTF8' | 'utf16le' | 'UTF16LE';

  interface TransitionalOptions {
    silentJSONParsing?: boolean;
    forcedJSONParsing?: boolean;
    clarifyTimeoutError?: boolean;
  }

  interface FormSerializerOptions {
    visitor?: (this: GenericFormData, value: any, key: string | number, path: null | Array<string | number>, helpers: FormDataVisitorHelpers) => boolean;
    metaTokens?: boolean;
    dots?: boolean;
    indexes?: boolean | null;
  }

  interface GenericFormData {
    append(name: string, value: any, options?: any): any;
  }

  interface FormDataVisitorHelpers {
    defaultVisitor: SerializerVisitor;
    convertValue: (value: any) => any;
    isVisitable: (value: any) => boolean;
  }

  interface SerializerVisitor {
    (this: GenericFormData, value: any, key: string | number, path: null | Array<string | number>, helpers: FormDataVisitorHelpers): boolean;
  }

  interface AxiosBasicCredentials {
    username: string;
    password: string;
  }

  interface AxiosProxyConfig {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
    protocol?: string;
  }

  type AxiosAdapter = (config: AxiosRequestConfig) => AxiosPromise<any>;
  type AxiosTransformer = (data: any, headers?: any) => any;

  const axios: AxiosStatic;
  export default axios;
}

// Lodash 类型扩展（部分常用方法）
declare module 'lodash' {
  interface LoDashStatic {
    // 数组方法
    chunk<T>(array: List<T> | null | undefined, size?: number): T[][];
    compact<T>(array: List<T | null | undefined | false | '' | 0> | null | undefined): T[];
    concat<T>(array: Many<T>, ...values: Array<Many<T>>): T[];
    difference<T>(array: List<T> | null | undefined, ...values: Array<List<T>>): T[];
    drop<T>(array: List<T> | null | undefined, n?: number): T[];
    dropRight<T>(array: List<T> | null | undefined, n?: number): T[];
    fill<T>(array: any[] | null | undefined, value: T, start?: number, end?: number): T[];
    findIndex<T>(array: List<T> | null | undefined, predicate?: ListIterateeCustom<T, boolean>, fromIndex?: number): number;
    first<T>(array: List<T> | null | undefined): T | undefined;
    flatten<T>(array: List<Many<T>> | null | undefined): T[];
    flattenDeep<T>(array: ListOfRecursiveArraysOrValues<T> | null | undefined): T[];
    head<T>(array: List<T> | null | undefined): T | undefined;
    indexOf<T>(array: List<T> | null | undefined, value: T, fromIndex?: number): number;
    initial<T>(array: List<T> | null | undefined): T[];
    intersection<T>(...arrays: Array<List<T> | null | undefined>): T[];
    join<T>(array: List<T> | null | undefined, separator?: string): string;
    last<T>(array: List<T> | null | undefined): T | undefined;
    lastIndexOf<T>(array: List<T> | null | undefined, value: T, fromIndex?: number): number;
    nth<T>(array: List<T> | null | undefined, n?: number): T | undefined;
    pull<T>(array: T[], ...values: T[]): T[];
    pullAll<T>(array: T[], values?: List<T>): T[];
    remove<T>(array: List<T>, predicate?: ListIteratee<T>): T[];
    reverse<T>(array: T[]): T[];
    slice<T>(array: List<T> | null | undefined, start?: number, end?: number): T[];
    sortedIndex<T>(array: List<T> | null | undefined, value: T): number;
    sortedUniq<T>(array: List<T> | null | undefined): T[];
    tail<T>(array: List<T> | null | undefined): T[];
    take<T>(array: List<T> | null | undefined, n?: number): T[];
    takeRight<T>(array: List<T> | null | undefined, n?: number): T[];
    union<T>(...arrays: Array<List<T> | null | undefined>): T[];
    uniq<T>(array: List<T> | null | undefined): T[];
    uniqBy<T>(array: List<T> | null | undefined, iteratee?: ValueIteratee<T>): T[];
    unzip<T>(array: T[][] | List<List<T>> | null | undefined): T[][];
    without<T>(array: List<T> | null | undefined, ...values: T[]): T[];
    xor<T>(...arrays: Array<List<T> | null | undefined>): T[];
    zip<T1, T2>(arrays1: List<T1>, arrays2: List<T2>): Array<[T1 | undefined, T2 | undefined]>;

    // 对象方法
    assign<TObject, TSource>(object: TObject, source: TSource): TObject & TSource;
    assignIn<TObject, TSource>(object: TObject, source: TSource): TObject & TSource;
    at<T>(object: Dictionary<T> | NumericDictionary<T> | null | undefined, ...paths: Array<Many<PropertyPath>>): Array<T | undefined>;
    create<T extends object>(prototype: T): T;
    defaults<TObject, TSource>(object: TObject, source: TSource): NonNullable<TSource & TObject>;
    defaultsDeep<TObject, TSource>(object: TObject, source: TSource): NonNullable<TSource & TObject>;
    entries<T>(object?: Dictionary<T> | NumericDictionary<T>): Array<[string, T]>;
    entriesIn<T>(object?: Dictionary<T> | NumericDictionary<T>): Array<[string, T]>;
    extend<TObject, TSource>(object: TObject, source: TSource): TObject & TSource;
    extendWith<TObject, TSource>(object: TObject, source: TSource, customizer: AssignCustomizer): TObject & TSource;
    findKey<T>(object: T | null | undefined, predicate?: ObjectIteratee<T>): string | undefined;
    findLastKey<T>(object: T | null | undefined, predicate?: ObjectIteratee<T>): string | undefined;
    forIn<T>(object: T, iteratee?: ObjectIterator<T, any>): T;
    forInRight<T>(object: T, iteratee?: ObjectIterator<T, any>): T;
    forOwn<T>(object: T, iteratee?: ObjectIterator<T, any>): T;
    forOwnRight<T>(object: T, iteratee?: ObjectIterator<T, any>): T;
    functions<T extends object>(object: T): string[];
    functionsIn<T extends object>(object: T): string[];
    get<TObject extends object, TKey extends keyof TObject>(object: TObject, path: TKey | [TKey]): TObject[TKey];
    get<TObject extends object, TKey extends keyof TObject, TDefault>(object: TObject | null | undefined, path: TKey | [TKey], defaultValue: TDefault): Exclude<TObject[TKey], undefined> | TDefault;
    get<T>(object: NumericDictionary<T>, path: number): T;
    get<T>(object: NumericDictionary<T> | null | undefined, path: number): T | undefined;
    get<TDefault>(object: null | undefined, path: PropertyPath, defaultValue: TDefault): TDefault;
    get(object: null | undefined, path: PropertyPath): undefined;
    get<T>(object: any, path: PropertyPath, defaultValue?: T): T;
    has<T>(object: T, path: PropertyPath): boolean;
    hasIn<T>(object: T, path: PropertyPath): boolean;
    invert(object: Dictionary<string | number> | NumericDictionary<string | number>): Dictionary<string>;
    invertBy<T>(object: Dictionary<T> | NumericDictionary<T>, iteratee?: ValueIteratee<T>): Dictionary<string[]>;
    invoke(object: any, path: PropertyPath, ...args: any[]): any;
    keys(object?: any): string[];
    keysIn(object?: any): string[];
    mapKeys<T>(object: List<T> | Dictionary<T> | NumericDictionary<T> | null | undefined, iteratee?: ListIteratee<T>): Dictionary<T>;
    mapValues<T, TResult>(object: Dictionary<T> | NumericDictionary<T> | null | undefined, iteratee: ValueIteratee<T>): Dictionary<TResult>;
    merge<TObject, TSource>(object: TObject, source: TSource): TObject & TSource;
    mergeWith<TObject, TSource>(object: TObject, source: TSource, customizer: MergeWithCustomizer): TObject & TSource;
    omit<T extends AnyKindOfDictionary>(object: T | null | undefined, ...paths: Array<Many<PropertyName>>): T;
    omitBy<T>(object: Dictionary<T> | null | undefined, predicate?: ValueKeyIteratee<T>): Dictionary<T>;
    pick<T, U extends keyof T>(object: T, ...props: Array<Many<U>>): Pick<T, U>;
    pickBy<T, S extends T>(object: Dictionary<T> | NumericDictionary<T> | null | undefined, predicate: ValueKeyIterateeTypeGuard<T, S>): Dictionary<S>;
    result<TResult>(object: any, path: PropertyPath, defaultValue?: TResult | ((...args: any[]) => TResult)): TResult;
    set<T extends object>(object: T, path: PropertyPath, value: any): T;
    setWith<T extends object>(object: T, path: PropertyPath, value: any, customizer?: SetWithCustomizer): T;
    toPairs<T>(object?: Dictionary<T> | NumericDictionary<T>): Array<[string, T]>;
    toPairsIn<T>(object?: Dictionary<T> | NumericDictionary<T>): Array<[string, T]>;
    transform<T, TResult>(object: Dictionary<T>, iteratee: MemoVoidDictionaryIterator<T, TResult>, accumulator?: TResult): TResult;
    unset(object: any, path: PropertyPath): boolean;
    update(object: any, path: PropertyPath, updater: (value: any) => any): any;
    updateWith<T extends object>(object: T, path: PropertyPath, updater: (oldValue: any) => any, customizer?: SetWithCustomizer): T;
    values<T>(object?: Dictionary<T> | NumericDictionary<T> | List<T>): T[];
    valuesIn<T>(object?: Dictionary<T> | NumericDictionary<T> | List<T>): T[];

    // 字符串方法
    camelCase(string?: string): string;
    capitalize(string?: string): string;
    deburr(string?: string): string;
    endsWith(string?: string, target?: string, position?: number): boolean;
    escape(string?: string): string;
    escapeRegExp(string?: string): string;
    kebabCase(string?: string): string;
    lowerCase(string?: string): string;
    lowerFirst(string?: string): string;
    pad(string?: string, length?: number, chars?: string): string;
    padEnd(string?: string, length?: number, chars?: string): string;
    padStart(string?: string, length?: number, chars?: string): string;
    parseInt(string: string, radix?: number): number;
    repeat(string?: string, n?: number): string;
    replace(string: string, pattern: RegExp | string, replacement: ReplaceFunction | string): string;
    snakeCase(string?: string): string;
    split(string?: string, separator?: RegExp | string, limit?: number): string[];
    startCase(string?: string): string;
    startsWith(string?: string, target?: string, position?: number): boolean;
    template(string?: string, options?: TemplateOptions): TemplateExecutor;
    toLower(string?: string): string;
    toUpper(string?: string): string;
    trim(string?: string, chars?: string): string;
    trimEnd(string?: string, chars?: string): string;
    trimStart(string?: string, chars?: string): string;
    truncate(string?: string, options?: TruncateOptions): string;
    unescape(string?: string): string;
    upperCase(string?: string): string;
    upperFirst(string?: string): string;
    words(string?: string, pattern?: string | RegExp): string[];

    // 工具方法
    attempt<TResult>(func: (...args: any[]) => TResult, ...args: any[]): TResult | Error;
    bindAll<T>(object: T, ...methodNames: Array<Many<string>>): T;
    cond<T, R>(pairs: Array<CondPair<T, R>>): (Target: T) => R;
    conforms<T>(source: ConformsPredicateObject<T>): (value: T) => boolean;
    constant<T>(value: T): () => T;
    defaultTo<T>(value: T | null | undefined, defaultValue: T): T;
    flow<A extends ReadonlyArray<any>, R1, R2, R3, R4, R5, R6, R7>(f1: (...args: A) => R1, f2: (a: R1) => R2, f3: (a: R2) => R3, f4: (a: R3) => R4, f5: (a: R4) => R5, f6: (a: R5) => R6, f7: (a: R6) => R7): (...args: A) => R7;
    flowRight<A extends ReadonlyArray<any>, R1, R2, R3, R4, R5, R6, R7>(f7: (a: R6) => R7, f6: (a: R5) => R6, f5: (a: R4) => R5, f4: (a: R3) => R4, f3: (a: R2) => R3, f2: (a: R1) => R2, f1: (...args: A) => R1): (...args: A) => R7;
    identity<T>(value: T): T;
    iteratee<T>(func?: T): T extends (arg: infer A) => any ? (arg: A) => ReturnType<T> : T extends string | number ? (obj: any) => any : T extends object ? (obj: any) => boolean : (obj: any) => any;
    matches<T>(source: T): (value: any) => boolean;
    matchesProperty<T>(path: PropertyPath, srcValue: T): (value: any) => boolean;
    method(path: PropertyPath, ...args: any[]): (object: any) => any;
    methodOf(object: object, ...args: any[]): (path: PropertyPath) => any;
    mixin<T>(object?: T, source?: Dictionary<(...args: any[]) => any>, options?: MixinOptions): T;
    noConflict(): typeof _;
    noop(...args: any[]): void;
    nthArg(n?: number): (...args: any[]) => any;
    over<TResult>(...iteratees: Array<Many<(...args: any[]) => TResult>>): (...args: any[]) => TResult[];
    overEvery<TArgs extends any[]>(...predicates: Array<Many<(...args: TArgs) => boolean>>): (...args: TArgs) => boolean;
    overSome<TArgs extends any[]>(...predicates: Array<Many<(...args: TArgs) => boolean>>): (...args: TArgs) => boolean;
    property<T, K extends keyof T>(path: K | [K]): (obj: T) => T[K];
    property<T, K extends keyof T>(path: K | [K]): (obj: T | null | undefined) => T[K] | undefined;
    property<T>(path: PropertyPath): (obj: any) => T;
    propertyOf<T extends {}>(object: T): (path: PropertyPath) => any;
    range(start: number, end?: number, step?: number): number[];
    rangeRight(start: number, end?: number, step?: number): number[];
    runInContext(context?: object): LoDashStatic;
    stubArray(): any[];
    stubFalse(): false;
    stubObject(): any;
    stubString(): string;
    stubTrue(): true;
    times<TResult>(n: number, iteratee: (num: number) => TResult): TResult[];
    toPath(value: any): string[];
    uniqueId(prefix?: string): string;
  }

  // 类型定义
  type Many<T> = T | ReadonlyArray<T>;
  type PropertyName = string | number | symbol;
  type PropertyPath = Many<PropertyName>;

  interface Dictionary<T> {
    [index: string]: T;
  }

  interface NumericDictionary<T> {
    [index: number]: T;
  }

  type AnyKindOfDictionary = Dictionary<any> | NumericDictionary<any>;

  interface List<T> {
    [index: number]: T;
    length: number;
  }

  interface ListOfRecursiveArraysOrValues<T> extends List<T | ListOfRecursiveArraysOrValues<T>> {}

  type ListIterator<T, TResult> = (value: T, index: number, collection: List<T>) => TResult;
  type ListIteratee<T> = ListIterator<T, NotVoid> | IterateeShorthand<T>;
  type ListIterateeCustom<T, TResult> = ListIterator<T, TResult> | IterateeShorthand<T>;

  type ObjectIterator<TObject, TResult> = (value: TObject[keyof TObject], key: string, collection: TObject) => TResult;
  type ObjectIteratee<TObject> = ObjectIterator<TObject, NotVoid> | IterateeShorthand<TObject[keyof TObject]>;

  type StringIterator<TResult> = (char: string, index: number, string: string) => TResult;

  type ValueIteratee<T> = ((value: T) => NotVoid) | IterateeShorthand<T>;
  type ValueKeyIteratee<T> = ((value: T, key: string) => NotVoid) | IterateeShorthand<T>;
  type ValueKeyIterateeTypeGuard<T, S extends T> = (value: T, key: string) => value is S;

  type Comparator<T> = (a: T, b: T) => boolean;
  type Comparator2<T1, T2> = (a: T1, b: T2) => boolean;

  type NotVoid = {} | null | undefined;

  type IterateeShorthand<T> = PropertyPath | [PropertyPath, any] | PartialShallow<T>;

  type PartialShallow<T> = {
    [P in keyof T]?: T[P] extends object ? object : T[P];
  };

  type AssignCustomizer = (objValue: any, srcValue: any, key?: string, object?: {}, source?: {}) => any;
  type MergeWithCustomizer = (objValue: any, srcValue: any, key?: string, object?: {}, source?: {}, stack?: any) => any;
  type SetWithCustomizer = (nsValue: any, key: string, nsObject: any) => any;

  type ReplaceFunction = (match: string, ...args: any[]) => string;

  interface TruncateOptions {
    length?: number;
    omission?: string;
    separator?: string | RegExp;
  }

  interface TemplateOptions {
    escape?: RegExp;
    evaluate?: RegExp;
    imports?: Dictionary<any>;
    interpolate?: RegExp;
    sourceURL?: string;
    variable?: string;
  }

  interface TemplateExecutor {
    (data?: object): string;
    source: string;
  }

  type CondPair<T, R> = [(val: T) => boolean, (val: T) => R];

  type ConformsPredicateObject<T> = {
    [K in keyof T]?: (val: T[K]) => boolean;
  };

  interface MixinOptions {
    chain?: boolean;
  }

  const _: LoDashStatic;
  export = _;
}

// 通用工具类型
export interface UtilityConfig {
  logger: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
  };
  validator: {
    abortEarly: boolean;
    stripUnknown: boolean;
    allowUnknown: boolean;
  };
  qrcode: {
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    type: 'image/png' | 'image/jpeg' | 'image/webp';
    width: number;
    margin: number;
  };
}

export interface UtilityError extends Error {
  code: string;
  details?: any;
  timestamp: string;
}

export {};