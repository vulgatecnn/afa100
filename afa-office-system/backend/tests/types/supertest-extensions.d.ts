/**
 * Supertest 类型扩展
 * 解决 Supertest 相关的类型问题
 */

import type { MockedFunction } from 'vitest';

// 扩展 Supertest 模块
declare module 'supertest' {
  interface SuperTest<T> {
    get: MockedFunction<(url: string) => T> & ((url: string) => T);
    post: MockedFunction<(url: string) => T> & ((url: string) => T);
    put: MockedFunction<(url: string) => T> & ((url: string) => T);
    delete: MockedFunction<(url: string) => T> & ((url: string) => T);
    patch: MockedFunction<(url: string) => T> & ((url: string) => T);
    head: MockedFunction<(url: string) => T> & ((url: string) => T);
    options: MockedFunction<(url: string) => T> & ((url: string) => T);
  }

  interface Test {
    // 扩展 Test 接口以支持链式调用
    send(data: any): this;
    query(data: any): this;
    set(field: string, value: string): this;
    set(fields: Record<string, string>): this;
    attach(field: string, file: string | Buffer, filename?: string): this;
    field(name: string, value: string): this;
    expect(status: number): this;
    expect(status: number, callback: (err: any, res: Response) => void): this;
    expect(body: any): this;
    expect(body: any, callback: (err: any, res: Response) => void): this;
    expect(field: string, value: string | RegExp): this;
    expect(field: string, value: string | RegExp, callback: (err: any, res: Response) => void): this;
    expect(callback: (res: Response) => void): this;
    timeout(ms: number): this;
    type(type: string): this;
    accept(type: string): this;
    auth(user: string, pass: string, options?: { type: 'basic' | 'auto' }): this;
    redirects(count?: number): this;
    ok(callback: (res: Response) => boolean): this;
    retry(count?: number, callback?: (err: any, res: Response) => boolean): this;
    buffer(enable?: boolean): this;
    parse(parser: (res: Response, callback: (err: Error | null, body: any) => void) => void): this;
    serialize(serializer: (obj: any) => string): this;
    trustLocalhost(enabled?: boolean): this;
    ca(cert: string | string[] | Buffer | Buffer[]): this;
    cert(cert: string | string[] | Buffer | Buffer[]): this;
    key(key: string | string[] | Buffer | Buffer[]): this;
    pfx(pfx: string | string[] | Buffer | Buffer[] | { pfx: string | Buffer; passphrase: string }[]): this;
    disableTLSCerts(): this;

    // 自定义扩展方法
    authenticate(token: string): this;
    expectSuccess(expectedData?: any): this;
    expectError(expectedCode?: number, expectedMessage?: string): this;
    expectStatus(status: number): this;
    expectJson(expectedData: any): this;
  }

  interface Response {
    status: number;
    body: any;
    text: string;
    type: string;
    charset: string;
    header: Record<string, string>;
    headers: Record<string, string>;
    get(field: string): string;
    error: Error | false;
    redirect: boolean;
    redirects: string[];
    links: Record<string, string>;
    ok: boolean;
    clientError: boolean;
    serverError: boolean;
    accepted: boolean;
    noContent: boolean;
    badRequest: boolean;
    unauthorized: boolean;
    notAcceptable: boolean;
    notFound: boolean;
    forbidden: boolean;
    unprocessableEntity: boolean;
  }

  // 主要的 supertest 函数类型
  interface SuperTestStatic {
    (app: any): SuperTest<Test>;
    agent(app?: any): SuperTest<Test>;
  }

  const supertest: SuperTestStatic;
  export = supertest;
}

// 为 vi.mock 提供 supertest 的类型支持
declare global {
  namespace Vi {
    interface MockedSupertest {
      (app: any): import('supertest').SuperTest<import('supertest').Test>;
      agent(app?: any): import('supertest').SuperTest<import('supertest').Test>;
    }
  }
}

// 扩展 Vitest 以支持 supertest mocking
declare module 'vitest' {
  interface MockedFunction<T extends (...args: any[]) => any> {
    // 为 supertest 特定的 mock 方法提供类型支持
    mockReturnValue(value: ReturnType<T>): this;
    mockResolvedValue(value: Awaited<ReturnType<T>>): this;
    mockImplementation(fn: T): this;
  }
}

export {};