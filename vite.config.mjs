/**
 * @file vite.config.mjs
 * @description Vitest 测试框架的配置文件。
 *
 * 这个文件定义了 Vitest 在运行测试时的行为。
 * Vitest 会读取这个配置来确定测试超时时间、重试次数、类型检查设置以及代码覆盖率报告的规则。
 */

// 从 vitest/config 导入配置定义函数和默认配置
import { defineConfig, configDefaults } from "vitest/config";

// 导出 Vitest 配置对象
export default defineConfig({
  // 'test' 字段包含了所有与测试执行相关的配置
  test: {
    // testTimeout: 设置单个测试的最长允许执行时间 (毫秒)
    // 这里设置为 10000 毫秒 (10 秒)。如果测试超过这个时间，会被标记为失败。
    testTimeout: 10_000,

    // retry: 设置测试失败时的重试次数
    // process.env.CI ? 2 : undefined 表示：
    // - 如果在 CI (持续集成) 环境中运行 (通过检查环境变量 CI 是否存在)，则失败的测试会重试 2 次。
    // - 如果不在 CI 环境中，则不进行重试 (undefined)。
    // 这有助于处理 CI 环境中可能出现的偶发性失败。
    retry: process.env.CI ? 2 : undefined,

    // typecheck: 配置测试运行期间的 TypeScript 类型检查
    typecheck: {
      // enabled: true 表示在运行测试前启用类型检查。
      // 这有助于确保代码在测试前是类型安全的。
      enabled: true,
    },

    // coverage: 配置代码覆盖率报告
    coverage: {
      // exclude: 指定在计算代码覆盖率时要排除的文件或目录模式
      exclude: [
        // ...configDefaults.coverage.exclude: 包含 Vitest 默认排除的模式
        // (通常是 node_modules, dist, 测试文件本身等)
        ...configDefaults.coverage.exclude,
        // "./drivers/**": 排除 drivers 目录下的所有文件。
        // 这可能是因为驱动的测试比较特殊，或者暂时不计入整体覆盖率。
        "./drivers/**",
        // "./scripts/**": 排除 scripts 目录下的所有文件。
        // 构建脚本通常不需要计算代码覆盖率。
        "./scripts/**",
      ],
    },
  },
});
