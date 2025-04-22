/**
 * @file src/drivers/fs.ts
 * @description 基于 Node.js 文件系统的 unstorage 驱动。
 * 将键值对存储在本地文件系统中。
 */

// Node.js 模块
import { existsSync, promises as fsp, Stats } from "node:fs";
import { resolve, relative, join } from "node:path";
// 第三方库
import { FSWatcher, type ChokidarOptions, watch } from "chokidar"; // 文件监听
import anymatch from "anymatch"; // 路径匹配
// 内部工具
import { createError, createRequiredError, defineDriver } from "./utils";
import {
  readFile,
  writeFile,
  readdirRecursive,
  rmRecursive,
  unlink,
} from "./utils/node-fs"; // 封装的文件系统操作

/**
 * @interface FSStorageOptions
 * @description 文件系统驱动配置选项。
 */
export interface FSStorageOptions {
  /** @property {string} base - 存储根目录 (必需)。 */
  base?: string;
  /** @property {string[]} ignore - 忽略的文件/目录 glob 模式。 */
  ignore?: string[];
  /** @property {boolean} readOnly - 只读模式。 */
  readOnly?: boolean;
  /** @property {boolean} noClear - 禁止 clear 操作。 */
  noClear?: boolean;
  /** @property {ChokidarOptions} watchOptions - Chokidar 监听选项。 */
  watchOptions?: ChokidarOptions;
}

// 防止路径遍历的正则表达式
const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
// 驱动名称
const DRIVER_NAME = "fs";

/**
 * @function defineDriver
 * @description 定义文件系统驱动。
 * @param {FSStorageOptions} userOptions - 用户配置。
 * @returns {object} unstorage 驱动对象。
 */
export default defineDriver((userOptions: FSStorageOptions = {}) => {
  // 检查并解析 base 路径
  if (!userOptions.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  const base = resolve(userOptions.base);

  // 初始化忽略规则函数
  const ignore = anymatch(
    userOptions.ignore || ["**/node_modules/**", "**/.git/**"]
  );

  /**
   * @function r (resolve)
   * @description 将 unstorage 键转换为绝对文件路径，防止路径遍历。
   * @param {string} key - unstorage 键。
   * @returns {string} 绝对文件路径。
   */
  const r = (key: string): string => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    // 将 ':' 替换为 '/' 并与 base 目录连接
    const resolved = join(base, key.replace(/:/g, "/"));
    return resolved;
  };

  // 文件监听器实例
  let _watcher: FSWatcher | undefined;

  /**
   * @function _unwatch
   * @description 停止文件监听。
   */
  const _unwatch = async () => {
    if (_watcher) {
      await _watcher.close();
      _watcher = undefined;
    }
  };

  // 返回驱动对象
  return {
    name: DRIVER_NAME,
    options: userOptions,
    flags: {
      maxDepth: true, // getKeys 支持 maxDepth
    },

    /** @method hasItem - 检查文件是否存在 */
    hasItem(key) {
      return existsSync(r(key));
    },

    /** @method getItem - 读取文件内容 (UTF-8) */
    getItem(key) {
      return readFile(r(key), "utf8");
    },

    /** @method getItemRaw - 读取文件原始 Buffer */
    getItemRaw(key) {
      return readFile(r(key));
    },

    /** @method getMeta - 获取文件元数据 */
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await fsp
        .stat(r(key))
        .catch(() => ({}) as Stats); // 处理文件不存在的情况
      return { atime, mtime, size, birthtime, ctime };
    },

    /** @method setItem - 写入文件内容 (UTF-8) */
    setItem(key, value) {
      if (userOptions.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },

    /** @method setItemRaw - 写入原始 Buffer */
    setItemRaw(key, value) {
      if (userOptions.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },

    /** @method removeItem - 删除文件 */
    removeItem(key) {
      if (userOptions.readOnly) {
        return;
      }
      return unlink(r(key));
    },

    /** @method getKeys - 递归获取目录下的键 (文件名) */
    getKeys(_base = "", topts) {
      // 使用封装的 readdirRecursive，传入 ignore 规则和 maxDepth
      return readdirRecursive(r(_base), ignore, topts?.maxDepth);
    },

    /** @method clear - 清空存储目录 (递归删除) */
    async clear() {
      if (userOptions.readOnly || userOptions.noClear) {
        return;
      }
      await rmRecursive(r("."));
    },

    /** @method dispose - 清理资源 (关闭监听器) */
    async dispose() {
      if (_watcher) {
        await _watcher.close();
      }
    },

    /**
     * @method watch - 监听文件变化
     * @param {Function} callback - 变化回调 (event, key)
     * @returns {Promise<Function>} 返回停止监听的函数
     */
    async watch(callback) {
      if (_watcher) {
        await _unwatch(); // 如果已有监听器，先停止
      }

      await new Promise<void>((resolve, reject) => {
        // 配置 Chokidar
        const watchOptions: ChokidarOptions = {
          ignoreInitial: true,
          ...userOptions.watchOptions,
          ignored: [], // 确保 ignored 是数组
        };
        if (Array.isArray(userOptions.watchOptions?.ignored)) {
          watchOptions.ignored = [...userOptions.watchOptions.ignored];
        } else if (userOptions.watchOptions?.ignored) {
          watchOptions.ignored = [userOptions.watchOptions.ignored];
        }
        watchOptions.ignored.push(ignore); // 添加驱动的 ignore 规则

        // 启动监听
        _watcher = watch(base, watchOptions)
          .on("ready", resolve) // 监听器就绪
          .on("error", reject) // 监听错误
          .on("all", (eventName, path) => {
            // 处理所有事件
            path = relative(base, path); // 获取相对路径
            if (eventName === "change" || eventName === "add") {
              callback("update", path); // 映射为 update 事件
            } else if (eventName === "unlink") {
              callback("remove", path); // 映射为 remove 事件
            }
          });
      });

      return _unwatch; // 返回停止函数
    },
  };
});
