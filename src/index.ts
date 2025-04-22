/**
 * index.ts - 项目的主入口文件
 * 
 * 这个文件是整个unstorage库的主入口点，负责将所有公共API导出给使用者。
 * unstorage是一个通用的键值存储系统，支持多种存储驱动和统一的API接口。
 * 
 * 通过这个文件，用户可以访问：
 * 1. 核心存储类和创建函数
 * 2. 类型定义
 * 3. 工具函数
 * 4. 驱动定义工具
 * 5. 内置驱动列表
 */

// 导出核心存储类和创建函数，包括createStorage、Storage类等
// 这是库的核心功能，允许用户创建和管理存储实例
export * from "./storage";

// 导出所有类型定义，如Driver接口、StorageOptions等
// 这些类型对于TypeScript用户和库的类型安全至关重要
export * from "./types";

// 导出工具函数，如序列化、反序列化、路径处理等
// 这些工具函数简化了常见操作，提高了开发效率
export * from "./utils";

// 导出defineDriver函数，用于创建自定义存储驱动
// 这使开发者能够实现自己的存储后端，扩展库的功能
export { defineDriver } from "./drivers/utils";

// 导出内置驱动列表及其类型
// builtinDrivers是一个包含所有预定义驱动的对象
// BuiltinDriverName是所有内置驱动名称的联合类型
// BuiltinDriverOptions是所有内置驱动选项的类型
export {
  builtinDrivers,
  type BuiltinDriverName,
  type BuiltinDriverOptions,
} from "./_drivers";
