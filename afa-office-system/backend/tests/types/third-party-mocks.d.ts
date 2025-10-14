/**
 * 第三方库 Mock 类型定义
 * 解决第三方库的 Mock 类型问题
 */

import type { MockedFunction } from 'vitest';

// Axios Mock 类型
declare module 'axios' {
  interface AxiosStatic {
    get: MockedFunction<typeof import('axios').default.get>;
    post: MockedFunction<typeof import('axios').default.post>;
    put: MockedFunction<typeof import('axios').default.put>;
    delete: MockedFunction<typeof import('axios').default.delete>;
    patch: MockedFunction<typeof import('axios').default.patch>;
    create: MockedFunction<typeof import('axios').default.create>;
    isAxiosError: MockedFunction<typeof import('axios').default.isAxiosError>;
  }

  interface AxiosInstance {
    get: MockedFunction<AxiosInstance['get']>;
    post: MockedFunction<AxiosInstance['post']>;
    put: MockedFunction<AxiosInstance['put']>;
    delete: MockedFunction<AxiosInstance['delete']>;
    patch: MockedFunction<AxiosInstance['patch']>;
  }
}

// bcryptjs Mock 类型
declare module 'bcryptjs' {
  interface BcryptStatic {
    hash: MockedFunction<(data: string | Buffer, saltOrRounds: string | number) => Promise<string>>;
    compare: MockedFunction<(data: string | Buffer, encrypted: string) => Promise<boolean>>;
    hashSync: MockedFunction<(data: string | Buffer, saltOrRounds: string | number) => string>;
    compareSync: MockedFunction<(data: string | Buffer, encrypted: string) => boolean>;
    genSalt: MockedFunction<(rounds?: number) => Promise<string>>;
    genSaltSync: MockedFunction<(rounds?: number) => string>;
  }
}

// jsonwebtoken Mock 类型
declare module 'jsonwebtoken' {
  interface JsonWebTokenStatic {
    sign: MockedFunction<typeof import('jsonwebtoken').sign>;
    verify: MockedFunction<typeof import('jsonwebtoken').verify>;
    decode: MockedFunction<typeof import('jsonwebtoken').decode>;
  }
}

// qrcode Mock 类型
declare module 'qrcode' {
  interface QRCodeStatic {
    toDataURL: MockedFunction<typeof import('qrcode').toDataURL>;
    toString: MockedFunction<typeof import('qrcode').toString>;
    toCanvas: MockedFunction<typeof import('qrcode').toCanvas>;
    toFile: MockedFunction<typeof import('qrcode').toFile>;
    toFileStream: MockedFunction<typeof import('qrcode').toFileStream>;
  }
}

// mysql2 Mock 类型
declare module 'mysql2' {
  interface Connection {
    execute: MockedFunction<Connection['execute']>;
    query: MockedFunction<Connection['query']>;
    beginTransaction: MockedFunction<Connection['beginTransaction']>;
    commit: MockedFunction<Connection['commit']>;
    rollback: MockedFunction<Connection['rollback']>;
    end: MockedFunction<Connection['end']>;
    destroy: MockedFunction<Connection['destroy']>;
  }

  interface Pool {
    execute: MockedFunction<Pool['execute']>;
    query: MockedFunction<Pool['query']>;
    getConnection: MockedFunction<Pool['getConnection']>;
    end: MockedFunction<Pool['end']>;
  }

  interface PoolConnection extends Connection {
    release: MockedFunction<() => void>;
  }
}

// multer Mock 类型
declare module 'multer' {
  interface Multer {
    single: MockedFunction<Multer['single']>;
    array: MockedFunction<Multer['array']>;
    fields: MockedFunction<Multer['fields']>;
    none: MockedFunction<Multer['none']>;
    any: MockedFunction<Multer['any']>;
  }

  interface MulterStatic {
    (options?: multer.Options): Multer;
    diskStorage: MockedFunction<typeof import('multer').diskStorage>;
    memoryStorage: MockedFunction<typeof import('multer').memoryStorage>;
  }
}

// joi Mock 类型
declare module 'joi' {
  interface Root {
    object: MockedFunction<Root['object']>;
    string: MockedFunction<Root['string']>;
    number: MockedFunction<Root['number']>;
    boolean: MockedFunction<Root['boolean']>;
    array: MockedFunction<Root['array']>;
    date: MockedFunction<Root['date']>;
    any: MockedFunction<Root['any']>;
    validate: MockedFunction<Root['validate']>;
  }

  interface Schema {
    validate: MockedFunction<Schema['validate']>;
    validateAsync: MockedFunction<Schema['validateAsync']>;
  }
}

// Express Mock 类型增强
declare module 'express' {
  interface Application {
    listen: MockedFunction<Application['listen']>;
    use: MockedFunction<Application['use']>;
    get: MockedFunction<Application['get']>;
    post: MockedFunction<Application['post']>;
    put: MockedFunction<Application['put']>;
    delete: MockedFunction<Application['delete']>;
    patch: MockedFunction<Application['patch']>;
  }

  interface Router {
    use: MockedFunction<Router['use']>;
    get: MockedFunction<Router['get']>;
    post: MockedFunction<Router['post']>;
    put: MockedFunction<Router['put']>;
    delete: MockedFunction<Router['delete']>;
    patch: MockedFunction<Router['patch']>;
  }

  interface Request {
    body: any;
    params: any;
    query: any;
    headers: any;
    cookies: any;
    session?: any;
    user?: any;
    userDetails?: any;
    file?: any;
    files?: any;
  }

  interface Response {
    status: MockedFunction<(code: number) => Response>;
    json: MockedFunction<(obj: any) => Response>;
    send: MockedFunction<(body?: any) => Response>;
    cookie: MockedFunction<(name: string, val: any, options?: any) => Response>;
    clearCookie: MockedFunction<(name: string, options?: any) => Response>;
    redirect: MockedFunction<(url: string) => void>;
    render: MockedFunction<(view: string, locals?: any) => void>;
    end: MockedFunction<() => void>;
  }

  interface NextFunction extends MockedFunction<(err?: any) => void> {}
}

// Node.js 内置模块 Mock 类型
declare module 'fs' {
  const promises: {
    readFile: MockedFunction<typeof import('fs').promises.readFile>;
    writeFile: MockedFunction<typeof import('fs').promises.writeFile>;
    unlink: MockedFunction<typeof import('fs').promises.unlink>;
    mkdir: MockedFunction<typeof import('fs').promises.mkdir>;
    rmdir: MockedFunction<typeof import('fs').promises.rmdir>;
    stat: MockedFunction<typeof import('fs').promises.stat>;
    access: MockedFunction<typeof import('fs').promises.access>;
  };

  const readFileSync: MockedFunction<typeof import('fs').readFileSync>;
  const writeFileSync: MockedFunction<typeof import('fs').writeFileSync>;
  const existsSync: MockedFunction<typeof import('fs').existsSync>;
  const unlinkSync: MockedFunction<typeof import('fs').unlinkSync>;
  const mkdirSync: MockedFunction<typeof import('fs').mkdirSync>;
}

declare module 'path' {
  const join: MockedFunction<typeof import('path').join>;
  const resolve: MockedFunction<typeof import('path').resolve>;
  const dirname: MockedFunction<typeof import('path').dirname>;
  const basename: MockedFunction<typeof import('path').basename>;
  const extname: MockedFunction<typeof import('path').extname>;
}

// 全局 setTimeout/setInterval Mock 类型
declare global {
  var setTimeout: MockedFunction<typeof globalThis.setTimeout> & {
    __promisify__?: any;
  };
  var setInterval: MockedFunction<typeof globalThis.setInterval>;
  var clearTimeout: MockedFunction<typeof globalThis.clearTimeout>;
  var clearInterval: MockedFunction<typeof globalThis.clearInterval>;
}

export {};