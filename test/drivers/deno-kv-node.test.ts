// 从 'vitest' 导入 describe 函数，用于组织测试。
import { describe } from "vitest";
// 导入我们要测试的 Deno KV Node.js 驱动。
// Deno KV 是 Deno 原生提供的键值存储系统。
// 这个驱动允许在 Node.js 环境下使用 Deno KV 的功能（通常是通过模拟或连接到 Deno 服务）。
import denoKvNodeDriver from "../../src/drivers/deno-kv-node.ts";
// 导入通用的驱动测试工具函数。
import { testDriver } from "./utils.ts";

// 定义一个测试组，专门测试 deno-kv-node 驱动。
// 使用 async，虽然在这个简单的例子里可能不是必须的，但保持一致性。
describe("drivers: deno-kv-node", async () => {
  // 调用通用的 testDriver 函数来运行标准测试。
  testDriver({
    // 提供驱动实例的创建函数。
    driver: denoKvNodeDriver({
      // 配置驱动选项：
      // path: ":memory:" 表示使用内存模式。
      // Deno KV 本身可以持久化到文件，但在测试中，内存模式更快、更干净。
      // 这意味着所有数据只存在于测试运行期间，结束后就消失了。
      path: ":memory:",
      // base: 设置一个随机的基础路径（前缀）。
      // 和之前的例子一样，这有助于隔离每次测试运行的数据，防止互相干扰。
      // 生成一个 0 到 100 万之间的随机数，并转换为十六进制字符串。
      base: Math.round(Math.random() * 1_000_000).toString(16),
    }),
    // 这个测试没有定义 additionalTests，意味着只运行 testDriver 内部包含的标准测试套件。
  });
});
