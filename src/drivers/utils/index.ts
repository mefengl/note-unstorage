/**
 * drivers/utils/index.ts - 驱动工具函数集合
 * 
 * 这个文件提供了一系列用于处理存储驱动的实用工具函数。
 * 这些函数帮助开发者创建自定义驱动、处理键名格式化以及生成标准化错误。
 * 无论是库的内部驱动还是用户自定义驱动，都依赖这些基础工具。
 */

// 导入Driver类型定义，这是所有存储驱动必须实现的接口
import type { Driver } from "../..";

/**
 * DriverFactory类型定义 - 驱动工厂函数类型
 * 
 * @template OptionsT - 驱动配置选项的类型
 * @template InstanceT - 驱动实例的类型（如果有的话）
 * 
 * 这个类型表示一个函数，它接收配置选项并返回一个符合Driver接口的驱动实例
 */
type DriverFactory<OptionsT, InstanceT> = (
  opts: OptionsT
) => Driver<OptionsT, InstanceT>;

/**
 * 错误选项接口 - 目前为空，为未来扩展预留
 */
interface ErrorOptions {}

/**
 * defineDriver - 定义存储驱动的工厂函数
 * 
 * 这个函数是一个身份函数(identity function)，它接收一个驱动工厂函数并原样返回。
 * 主要目的是提供类型安全和代码可读性，使驱动定义更加标准化。
 * 
 * @template OptionsT - 驱动配置选项的类型
 * @template InstanceT - 驱动实例的类型
 * @param factory - 创建驱动的工厂函数
 * @returns 原始的工厂函数，但带有类型信息
 * 
 * 使用示例：
 * ```ts
 * const myDriver = defineDriver((options) => {
 *   // 实现驱动逻辑
 *   return {
 *     // 驱动方法实现
 *   }
 * })
 * ```
 */
export function defineDriver<OptionsT = any, InstanceT = never>(
  factory: DriverFactory<OptionsT, InstanceT>
): DriverFactory<OptionsT, InstanceT> {
  return factory;
}

/**
 * normalizeKey - 标准化存储键名
 * 
 * 这个函数处理键名中的分隔符，确保键名格式一致。
 * 它会移除开头和结尾的分隔符，并将所有内部分隔符替换为指定的分隔符。
 * 
 * @param key - 要标准化的键名
 * @param sep - 分隔符，默认为冒号(:)
 * @returns 标准化后的键名
 * 
 * 例如：
 * normalizeKey('/foo/bar/') => 'foo:bar'
 * normalizeKey('foo:bar', '/') => 'foo/bar'
 */
export function normalizeKey(
  key: string | undefined,
  sep: ":" | "/" = ":"
): string {
  if (!key) {
    return "";
  }
  return key.replace(/[:\/\\]/g, sep).replace(/^[:\/\\]|[:\/\\]$/g, "");
}

/**
 * joinKeys - 连接多个键名片段
 * 
 * 将多个键名片段合并为一个完整的键名，使用冒号作为分隔符。
 * 会自动标准化每个片段并过滤掉空值。
 * 
 * @param keys - 要连接的键名片段数组
 * @returns 连接后的完整键名
 * 
 * 例如：
 * joinKeys('user', '123', 'profile') => 'user:123:profile'
 * joinKeys('', 'foo', undefined, 'bar') => 'foo:bar'
 */
export function joinKeys(...keys: string[]) {
  return keys
    .map((key) => normalizeKey(key))
    .filter(Boolean)
    .join(":");
}

/**
 * createError - 创建标准化的驱动错误
 * 
 * 生成一个带有统一格式前缀的错误对象，用于驱动出错时提供清晰的错误信息。
 * 
 * @param driver - 驱动名称
 * @param message - 错误消息
 * @param opts - 错误选项（可选）
 * @returns 格式化的Error对象
 * 
 * 错误消息格式：[unstorage] [驱动名] 具体错误信息
 */
export function createError(
  driver: string,
  message: string,
  opts?: ErrorOptions
) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  // 使用类型断言处理Node.js特有的captureStackTrace方法
  // 这个方法在Node.js环境中用于捕获和清理错误堆栈，使错误更易读
  if ((Error as any).captureStackTrace) {
    (Error as any).captureStackTrace(err, createError);
  }
  return err;
}

/**
 * createRequiredError - 创建缺少必需选项的错误
 * 
 * 这是一个特殊的错误创建函数，专门用于处理驱动缺少必需配置选项的情况。
 * 
 * @param driver - 驱动名称
 * @param name - 缺少的选项名称（可以是单个字符串或字符串数组）
 * @returns 格式化的Error对象
 * 
 * 例如：
 * createRequiredError('redis', 'url') => Error: [unstorage] [redis] Missing required option `url`.
 * createRequiredError('s3', ['bucket', 'region']) => Error: [unstorage] [s3] Missing some of the required options `bucket`, `region`
 */
export function createRequiredError(driver: string, name: string | string[]) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name
        .map((n) => "`" + n + "`")
        .join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}
