/**
 * @file src/drivers/overlay.ts
 * @description unstorage 的叠加 (Overlay) 驱动程序。
 *
 * 这个驱动程序允许你将多个存储驱动组合成一个层级结构。
 * 它提供了一种机制，可以优先从顶层驱动读取数据，并将写入和删除操作定向到顶层驱动。
 * 当顶层没有数据时，会逐层向下查找。
 *
 * 主要特点：
 * - **分层读取**: `getItem` 和 `hasItem` 会按照 `layers` 数组的顺序依次查找，找到即返回。
 * - **写入顶层**: `setItem` 操作只写入 `layers` 数组的第一个驱动 (索引为 0)。
 * - **标记删除**: `removeItem` 操作实际上是在顶层驱动中设置一个特殊的标记值 (`OVERLAY_REMOVED`)，而不是物理删除。这表示该键在整个叠加存储中应被视为已删除，即使底层驱动仍然存在该键。
 * - **合并键**: `getKeys` 会获取所有层级的所有键，去重后，再根据顶层的是否有删除标记来过滤，最终返回有效的键列表。
 * - **传递操作**: 大部分操作会尝试调用所有层级驱动的相应方法 (例如 `dispose`)。
 *
 * 使用场景：
 * - **缓存**: 将快速的内存存储放在顶层，较慢的持久化存储放在底层。
 * - **默认值**: 在底层放置一个包含默认配置的只读存储。
 * - **环境覆盖**: 根据不同环境加载不同的配置层。
 */

// 导入驱动定义工具和类型
import { defineDriver } from "./utils";
import type { Driver } from ".."; // 导入 Driver 类型定义
import { normalizeKey } from "./utils"; // 导入用于规范化键名的工具函数

/**
 * @interface OverlayStorageOptions
 * @description 叠加存储驱动的配置选项接口。
 */
export interface OverlayStorageOptions {
  /**
   * @property {Driver[]} layers
   * @description 一个驱动实例数组，定义了存储的层级。
   * 数组的第一个元素 (索引 0) 是顶层驱动，具有最高优先级。
   * 写入和（标记）删除操作只影响顶层驱动。
   * 读取操作会按顺序查询这些驱动。
   * 必需的配置项。
   */
  layers: Driver[];
}

// 特殊的标记值，用于在顶层驱动中标记某个键已被删除。
// 当 getItem 或 hasItem 在顶层遇到这个值时，会认为该键不存在。
const OVERLAY_REMOVED = "__OVERLAY_REMOVED__";

// 驱动名称
const DRIVER_NAME = "overlay";

/**
 * @function defineDriver
 * @description 定义并导出叠加驱动。
 * @param {OverlayStorageOptions} options - 用户提供的驱动配置选项，主要是 `layers` 数组。
 * @returns {Driver} 返回一个符合 unstorage 驱动接口的对象。
 */
export default defineDriver((options: OverlayStorageOptions): Driver => {
  // 确保传入了 layers
  if (!options.layers || options.layers.length === 0) {
    console.warn("[unstorage] Overlay driver requires at least one layer.");
    // 这里可以考虑抛出错误，或者返回一个空驱动的行为
    // options.layers = []; // 保持 options.layers 可能是空数组
  }

  return {
    name: DRIVER_NAME,
    options: options, // 将原始选项存储起来

    /**
     * @method hasItem
     * @description 检查指定的键是否存在于任何一个层级中 (并且未被顶层标记为删除)。
     * @param {string} key - 要检查的键。
     * @param {object} [opts] - 传递给底层驱动的选项。
     * @returns {Promise<boolean>} 如果键存在且未被标记删除，则返回 true，否则返回 false。
     */
    async hasItem(key, opts) {
      // 遍历所有层级驱动
      for (const layer of options.layers) {
        // 检查当前层级是否有这个键
        if (await layer.hasItem(key, opts)) {
          // 如果是在顶层 (第一个 layer) 找到了
          if (layer === options.layers[0]) {
            // 需要额外检查顶层的值是否是 "删除标记"
            const topLayerValue = await options.layers[0]?.getItem(key);
            if (topLayerValue === OVERLAY_REMOVED) {
              // 如果是删除标记，则视为不存在，返回 false
              return false;
            }
          }
          // 如果在任何层级找到，并且不是顶层的删除标记，则视为存在，返回 true
          return true;
        }
      }
      // 遍历完所有层级都没找到，返回 false
      return false;
    },

    /**
     * @method getItem
     * @description 获取指定键的值。按层级顺序查找，找到第一个非 null 且非删除标记的值即返回。
     * @param {string} key - 要获取的键。
     * @returns {Promise<any | null>} 返回找到的值，如果所有层级都没有或被顶层标记为删除，则返回 null。
     */
    async getItem(key) {
      // 遍历所有层级驱动
      for (const layer of options.layers) {
        // 获取当前层级的值
        const value = await layer.getItem(key);
        // 检查是否是删除标记
        if (value === OVERLAY_REMOVED) {
          // 如果是删除标记，则视为 null，停止查找并返回 null
          return null;
        }
        // 如果值不是 null (也不是删除标记)
        if (value !== null) {
          // 直接返回找到的值
          return value;
        }
        // 如果是 null，继续查找下一层
      }
      // 遍历完所有层级都没找到有效值，返回 null
      return null;
    },

    // TODO: 支持获取元数据 (getMeta)
    // 获取元数据比较复杂，需要决定是从哪个层级获取，或者如何合并元数据。
    // 目前暂未实现。
    // async getMeta (key) {},

    /**
     * @method setItem
     * @description 设置指定键的值。该操作只写入顶层驱动 (layers[0])。
     * @param {string} key - 要设置的键。
     * @param {any} value - 要设置的值。
     * @param {object} [opts] - 传递给顶层驱动的选项。
     * @returns {Promise<void>}
     */
    async setItem(key, value, opts) {
      // 只在第一个层级 (顶层) 执行 setItem
      // 使用可选链 (?.) 防止 layers[0] 不存在或没有 setItem 方法
      await options.layers[0]?.setItem?.(key, value, opts);
    },

    /**
     * @method removeItem
     * @description 移除指定的键。实际上是在顶层驱动 (layers[0]) 中设置一个删除标记。
     * @param {string} key - 要移除的键。
     * @param {object} [opts] - 传递给顶层驱动的选项。
     * @returns {Promise<void>}
     */
    async removeItem(key, opts) {
      // 只在第一个层级 (顶层) 执行 setItem，并将值设置为删除标记
      // 使用可选链 (?.) 防止 layers[0] 不存在或没有 setItem 方法
      await options.layers[0]?.setItem?.(key, OVERLAY_REMOVED, opts);
    },

    /**
     * @method getKeys
     * @description 获取所有层级中有效的键列表。
     * 会合并所有层级的键，去重，并排除那些在顶层被标记为删除的键。
     * @param {string} [base] - (可选) 用于获取特定前缀下键的基础路径。
     * @param {object} [opts] - (可选) 传递给底层驱动的选项。
     * @returns {Promise<string[]>} 返回有效的键列表。
     */
    async getKeys(base, opts) {
      // 并行获取所有层级的键列表
      const allKeysNested = await Promise.all(
        options.layers.map(async (layer) => {
          // 调用每个层级的 getKeys 方法
          const keys = await layer.getKeys(base, opts);
          // 对获取到的键进行规范化处理 (例如移除开头的 './')
          return keys.map((key) => normalizeKey(key));
        })
      );
      // 将所有层级的键列表拍平 (flat) 并使用 Set 去重
      const uniqueKeys = [...new Set(allKeysNested.flat())];

      // 检查每个唯一键在顶层是否被标记为删除
      const existingKeys = await Promise.all(
        uniqueKeys.map(async (key) => {
          // 获取顶层的值
          const topLayerValue = await options.layers[0]?.getItem(key);
          // 如果顶层的值是删除标记，则返回 false (表示该键无效)
          if (topLayerValue === OVERLAY_REMOVED) {
            return false;
          }
          // 否则返回键本身 (表示该键有效)
          return key;
        })
      );
      // 过滤掉返回值为 false 的键，并进行类型断言确保是 string[]
      return existingKeys.filter(Boolean) as string[];
    },

    /**
     * @method dispose
     * @description 销毁驱动实例时调用的清理函数。
     * 会尝试调用所有层级驱动的 dispose 方法。
     * @returns {Promise<void>}
     */
    async dispose() {
      // TODO: 添加更优雅的错误处理机制，例如一个层级 dispose 失败不应阻止其他层级 dispose。
      // 并行调用所有层级的 dispose 方法 (如果存在)
      await Promise.all(
        options.layers.map(async (layer) => {
          if (layer.dispose) {
            await layer.dispose();
          }
        })
      );
    },
  };
});
