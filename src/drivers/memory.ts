/**
 * memory.ts - 内存驱动实现
 * 
 * 这个文件实现了unstorage的内存驱动，它是最简单的一种驱动类型。
 * 内存驱动将所有数据存储在JavaScript的Map对象中，这意味着数据只在当前运行的进程中有效。
 * 当应用重启或页面刷新时，所有数据都会丢失。
 * 
 * 这个驱动是unstorage的默认驱动，当用户没有指定其他驱动时会使用它。
 * 它非常适合用于测试、原型开发或临时缓存。
 */

// 导入defineDriver函数，用于创建驱动
import { defineDriver } from "./utils";

// 驱动名称常量
const DRIVER_NAME = "memory";

/**
 * 内存驱动实现
 * 
 * 这个驱动不需要配置选项（void），并使用Map<string, any>作为实例类型。
 * 所有的键值对都存储在这个Map实例中。
 */
export default defineDriver<void, Map<string, any>>(() => {
  // 创建一个新的Map实例来存储数据
  const data = new Map<string, any>();

  // 返回驱动实现，包含所有必要的方法
  return {
    // 驱动名称
    name: DRIVER_NAME,
    
    // 获取内部Map实例，允许直接访问存储数据
    getInstance: () => data,
    
    /**
     * 检查指定键是否存在
     * @param key - 要检查的键名
     * @returns 如果键存在返回true，否则返回false
     */
    hasItem(key) {
      return data.has(key);
    },
    
    /**
     * 获取指定键的值（已处理的值，会自动反序列化JSON）
     * @param key - 要获取的键名
     * @returns 键对应的值，如果不存在则返回null
     */
    getItem(key) {
      return data.get(key) ?? null;
    },
    
    /**
     * 获取指定键的原始值（不进行处理）
     * @param key - 要获取的键名
     * @returns 键对应的原始值，如果不存在则返回null
     * 
     * 注意：在内存驱动中，getItem和getItemRaw的实现相同，
     * 因为内存中已经是原生对象，不需要额外的序列化/反序列化处理。
     */
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    
    /**
     * 设置指定键的值（会自动序列化）
     * @param key - 要设置的键名
     * @param value - 要存储的值
     */
    setItem(key, value) {
      data.set(key, value);
    },
    
    /**
     * 设置指定键的原始值（不进行处理）
     * @param key - 要设置的键名
     * @param value - 要存储的原始值
     * 
     * 注意：在内存驱动中，setItem和setItemRaw的实现相同。
     */
    setItemRaw(key, value) {
      data.set(key, value);
    },
    
    /**
     * 删除指定键及其值
     * @param key - 要删除的键名
     */
    removeItem(key) {
      data.delete(key);
    },
    
    /**
     * 获取所有键的列表
     * @returns 存储中所有键的数组
     */
    getKeys() {
      return [...data.keys()];
    },
    
    /**
     * 清空存储，删除所有键值对
     */
    clear() {
      data.clear();
    },
    
    /**
     * 释放资源，在驱动不再使用时调用
     * 对于内存驱动，只需要清空数据即可
     */
    dispose() {
      data.clear();
    },
  };
});
