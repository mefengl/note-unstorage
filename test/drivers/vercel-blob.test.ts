import { describe } from "vitest";
import { testDriver } from "./utils";
import vercelBlobDriver from "../../src/drivers/vercel-blob";

// --- Vercel Blob Token ---
// 从环境变量中读取连接 Vercel Blob 服务所需的读写 Token
const token = process.env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN;

// --- 条件跳过测试 ---
// 如果没有提供 Token，则跳过这个测试套件
describe.skipIf(!token)("drivers: vercel-blob", async () => {
  // --- 设置带前缀的环境变量 ---
  // Vercel Blob 驱动允许通过 `envPrefix` 选项指定读取环境变量的前缀。
  // 在下面的 `vercelBlobDriver` 配置中，我们设置了 `envPrefix: "VERCEL_TEST"`。
  // 这意味着驱动会查找 `VERCEL_TEST_READ_WRITE_TOKEN` 这个环境变量。
  // 因此，我们需要将从 `VITE_VERCEL_BLOB_READ_WRITE_TOKEN` 读取到的值赋给它。
  process.env.VERCEL_TEST_READ_WRITE_TOKEN = token;

  // --- 运行通用测试 ---
  testDriver({
    // 这里使用函数形式传递 driver，确保每次测试都创建一个新的驱动实例
    driver: () =>
      vercelBlobDriver({
        access: "public", // 设置 Blob 访问权限为公开 (示例设置)
        // 使用随机生成的 base 路径来隔离测试数据
        base: `test:${Math.round(Math.random() * 1_000_000).toString(16)}`,
        // 指定驱动从环境变量读取配置时使用的前缀。
        // 驱动会查找 `VERCEL_TEST_READ_WRITE_TOKEN` 而不是默认的 `BLOB_READ_WRITE_TOKEN`。
        envPrefix: "VERCEL_TEST",
      }),
  });
});
