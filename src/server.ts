/**
 * @file src/server.ts
 * @description 创建一个基于 HTTP 的 unstorage 服务器。
 *
 * 这个模块允许你将任何 unstorage 实例包装成一个 HTTP 服务器。
 * 这使得可以通过标准的 HTTP 请求 (GET, PUT, HEAD, DELETE) 来访问和操作存储中的数据。
 * 它使用了 unjs 开发的 h3 框架来处理 HTTP 请求和响应。
 *
 * 主要功能：
 * - **HTTP 接口**: 提供标准的 RESTful 风格接口来操作键值存储。
 *   - `GET /key`: 获取键 `key` 的值。
 *   - `GET /base:` 或 `GET /base/`: 获取以 `base` 为前缀的所有键。
 *   - `HEAD /key`: 检查键 `key` 是否存在，并获取元数据 (mtime, ttl)。
 *   - `PUT /key`: 设置键 `key` 的值 (请求体为值)。
 *   - `DELETE /key`: 删除键 `key`。
 *   - `DELETE /base:` 或 `DELETE /base/`: 清除以 `base` 为前缀的所有键。
 * - **h3 集成**: 使用 h3 框架创建事件处理器，易于集成到 Nitro 或其他基于 h3 的应用中。
 * - **原始/二进制数据**: 支持通过 `Accept` 和 `Content-Type` 头指定 `application/octet-stream` 来处理原始二进制数据 (Buffer)。
 * - **元数据**: 支持通过 `HEAD` 请求获取元数据 (mtime, ttl)，并在响应头中返回 (`Last-Modified`, `X-TTL`, `Cache-Control`)。
 * - **TTL 支持**: 支持通过 `PUT` 请求的 `X-TTL` 头设置键的生存时间。
 * - **授权**: 提供可选的 `authorize` 钩子，用于在处理请求前进行权限验证。
 * - **路径解析**: 提供可选的 `resolvePath` 钩子，用于自定义如何从 HTTP 事件中解析出存储的键。
 * - **Node.js 兼容**: 提供 `createStorageServer` 函数，将 h3 处理器包装成标准的 Node.js `RequestListener`。
 */

// 导入 Node.js http 模块的类型
import type { RequestListener } from "node:http";
// 导入 h3 框架的核心功能
import {
  createApp, // 创建 h3 应用实例
  createError, // 创建标准的 HTTP 错误对象
  isError, // 检查对象是否为 h3 错误
  eventHandler, // 创建 h3 事件处理器
  toNodeListener, // 将 h3 应用转换为 Node.js 的 RequestListener
  getRequestHeader, // 获取请求头
  setResponseHeader, // 设置响应头
  readRawBody, // 读取原始请求体 (Buffer 或 string)
  type EventHandler, // h3 事件处理器的类型
  H3Event, // h3 事件对象的类型
} from "h3";
// 导入 unstorage 的核心类型
import type { Storage, TransactionOptions, StorageMeta } from "./types";
// 导入内部字符串化工具
import { stringify } from "./_utils";
// 导入键名规范化工具
import { normalizeKey, normalizeBaseKey } from "./utils";

/**
 * @type StorageServerRequest
 * @description 传递给 `authorize` 钩子的请求信息对象类型。
 */
export type StorageServerRequest = {
  /** @property {H3Event} event - 当前的 h3 事件对象。 */
  event: H3Event;
  /** @property {string} key - 从请求路径解析出来的规范化存储键。 */
  key: string;
  /** @property {"read" | "write"} type - 请求的操作类型 ("read" 或 "write")。 */
  type: "read" | "write";
};

// 将 HTTP 方法映射到操作类型 ("read" 或 "write")
const MethodToTypeMap = {
  GET: "read",
  HEAD: "read",
  PUT: "write",
  DELETE: "write",
} as const; // 使用 const 断言确保类型是字面量类型

/**
 * @interface StorageServerOptions
 * @description 存储服务器的配置选项接口。
 */
export interface StorageServerOptions {
  /**
   * @property {Function} authorize
   * @description 可选的授权钩子函数。
   * 在处理每个请求之前调用。如果验证失败，应抛出错误 (最好是 h3 的 HTTPError)。
   * @param {StorageServerRequest} request - 包含事件、键和操作类型信息的对象。
   * @returns {void | Promise<void>}
   */
  authorize?: (request: StorageServerRequest) => void | Promise<void>;
  /**
   * @property {Function} resolvePath
   * @description 可选的路径解析钩子函数。
   * 用于从 h3 事件对象中自定义提取存储的键对应的路径字符串。
   * 默认使用 `event.path`。
   * @param {H3Event} event - 当前的 h3 事件对象。
   * @returns {string} 返回要用于解析存储键的路径字符串。
   */
  resolvePath?: (event: H3Event) => string;
}

/**
 * @function createH3StorageHandler
 * @description 创建一个基于 h3 的存储服务器事件处理器。
 * 可以直接用于 h3 应用或 Nitro 应用。
 * @param {Storage} storage - 要暴露的 unstorage 实例。
 * @param {StorageServerOptions} [opts={}] - 配置选项，如 `authorize` 和 `resolvePath`。
 * @returns {EventHandler} 返回一个 h3 事件处理器。
 * @see createStorageServer - 如果需要 Node.js 兼容的监听器。
 */
export function createH3StorageHandler(
  storage: Storage,
  opts: StorageServerOptions = {}
): EventHandler {
  // 返回一个 h3 事件处理器
  return eventHandler(async (event) => {
    // 解析请求路径以获取键名
    // 优先使用自定义的 resolvePath 函数，否则使用 event.path
    const _path = opts.resolvePath?.(event) ?? event.path;
    // 判断路径是否表示一个 base key (以 ':' 或 '/' 结尾)
    const lastChar = _path[_path.length - 1];
    const isBaseKey = lastChar === ":" || lastChar === "/";
    // 根据是否是 base key 调用不同的规范化函数
    const key = isBaseKey ? normalizeBaseKey(_path) : normalizeKey(_path);

    // --- 步骤 1: 授权检查 ---
    // 检查 HTTP 方法是否支持
    if (!(event.method in MethodToTypeMap)) {
      throw createError({
        statusCode: 405,
        statusMessage: `Method Not Allowed: ${event.method}`,
      });
    }
    // 调用可选的 authorize 钩子
    try {
      await opts.authorize?.({
        type: MethodToTypeMap[event.method as keyof typeof MethodToTypeMap], // 获取操作类型
        event,
        key,
      });
    } catch (error: any) {
      // 如果 authorize 抛出错误，将其转换为标准的 h3 HTTPError 并抛出
      const _httpError = isError(error) // 检查是否已经是 h3 错误
        ? error
        : createError({ // 否则创建一个新的 h3 错误
            statusMessage: error?.message,
            statusCode: 401, // 默认 401 Unauthorized
            ...error, // 将原始错误信息附加
          });
      throw _httpError;
    }

    // --- 步骤 2: 处理不同的 HTTP 方法 ---

    // 处理 GET 请求 (获取值 或 获取键列表)
    if (event.method === "GET") {
      // 如果是 base key (获取键列表)
      if (isBaseKey) {
        const keys = await storage.getKeys(key);
        // 将规范化的键 (例如 'user:1') 转换回路径风格 ('user/1') 返回给客户端
        return keys.map((k) => k.replace(/:/g, "/"));
      }
      // 如果是普通 key (获取单个值)
      // 检查 Accept 头是否要求原始二进制数据
      const isRaw =
        getRequestHeader(event, "accept") === "application/octet-stream";
      // 调用对应的 storage 方法获取值
      const driverValue = await (isRaw
        ? storage.getItemRaw(key)
        : storage.getItem(key));
      // 如果值不存在 (null)，返回 404
      if (driverValue === null) {
        throw createError({
          statusCode: 404,
          statusMessage: "KV value not found",
        });
      }
      // 获取并设置元数据相关的响应头 (Last-Modified, Cache-Control)
      setMetaHeaders(event, await storage.getMeta(key));
      // 返回值 (如果是 raw 则直接返回 Buffer/Blob，否则字符串化)
      return isRaw ? driverValue : stringify(driverValue);
    }

    // 处理 HEAD 请求 (检查存在性 + 获取元数据)
    if (event.method === "HEAD") {
      // 检查键是否存在
      if (!(await storage.hasItem(key))) {
        throw createError({
          statusCode: 404,
          statusMessage: "KV value not found",
        });
      }
      // 获取并设置元数据相关的响应头
      setMetaHeaders(event, await storage.getMeta(key));
      // HEAD 请求不需要响应体，返回空字符串
      return "";
    }

    // 处理 PUT 请求 (设置值)
    if (event.method === "PUT") {
      // 检查 Content-Type 头是否表示原始二进制数据
      const isRaw =
        getRequestHeader(event, "content-type") === "application/octet-stream";
      // 从请求头获取 TTL (生存时间) 选项
      const topts: TransactionOptions = {
        ttl: Number(getRequestHeader(event, "x-ttl")) || undefined,
      };
      // 根据是否是 raw 调用不同的 storage 方法
      if (isRaw) {
        // 读取原始请求体 (不指定编码，返回 Buffer)
        const value = await readRawBody(event, false);
        await storage.setItemRaw(key, value, topts);
      } else {
        // 读取 UTF-8 编码的请求体
        const value = await readRawBody(event, "utf8");
        // 确保读取到了值 (避免空请求体)
        if (value !== undefined) {
          await storage.setItem(key, value, topts);
        }
      }
      // 返回成功状态
      return "OK";
    }

    // 处理 DELETE 请求 (删除值 或 清除 base)
    if (event.method === "DELETE") {
      // 根据是否是 base key 调用不同的 storage 方法
      await (isBaseKey ? storage.clear(key) : storage.removeItem(key));
      // 返回成功状态
      return "OK";
    }

    // 如果是其他不支持的方法，返回 405
    throw createError({
      statusCode: 405,
      statusMessage: `Method Not Allowed: ${event.method}`,
    });
  });
}

/**
 * @function setMetaHeaders
 * @description 内部辅助函数，根据存储元数据设置 HTTP 响应头。
 * @param {H3Event} event - 当前的 h3 事件对象。
 * @param {StorageMeta} meta - 从 storage.getMeta() 获取的元数据。
 */
function setMetaHeaders(event: H3Event, meta: StorageMeta) {
  // 如果有最后修改时间 (mtime)，设置 Last-Modified 头
  if (meta.mtime) {
    setResponseHeader(
      event,
      "last-modified",
      new Date(meta.mtime).toUTCString() // 转换为 GMT 格式
    );
  }
  // 如果有 TTL (生存时间)，设置 X-TTL 和 Cache-Control 头
  if (meta.ttl) {
    setResponseHeader(event, "x-ttl", `${meta.ttl}`); // 自定义头 X-TTL
    setResponseHeader(event, "cache-control", `max-age=${meta.ttl}`); // 标准 Cache-Control 头
  }
}

/**
 * @function createStorageServer
 * @description 创建一个 Node.js 兼容的 HTTP 存储服务器监听器。
 * 这是对 `createH3StorageHandler` 的封装，方便在纯 Node.js 环境中使用。
 *
 * 服务器处理 HEAD, GET, PUT, DELETE 请求：
 * - HEAD: 检查存在性 + 元数据头。
 * - GET: 获取值 (支持 raw) 或键列表。
 * - PUT: 设置值 (支持 raw, 支持 TTL)。
 * - DELETE: 删除值或清除 base (支持 raw)。
 *
 * 通过 `Accept` 和 `Content-Type` 头为 `application/octet-stream` 来处理原始数据。
 *
 * @param {Storage} storage - 要暴露的 unstorage 实例。
 * @param {StorageServerOptions} [options={}] - 配置选项，如 `authorize` 和 `resolvePath`。
 * @returns {{ handle: RequestListener }} 返回一个包含 `handle` 方法的对象，该方法是 Node.js 的 RequestListener。
 * @see createH3StorageHandler - 底层的 h3 事件处理器。
 */
export function createStorageServer(
  storage: Storage,
  options: StorageServerOptions = {}
): { handle: RequestListener } {
  // 创建一个 h3 应用实例 (开启 debug 模式)
  const app = createApp({ debug: true });
  // 创建 h3 存储处理器
  const handler = createH3StorageHandler(storage, options);
  // 将处理器挂载到 h3 应用上 (处理所有路径)
  app.use(handler);
  // 返回包含 Node.js 监听器 handle 的对象
  return {
    handle: toNodeListener(app), // 将 h3 应用转换为 Node.js 监听器
  };
}
