import { describe } from "vitest";
import vercelKVDriver from "../../src/drivers/vercel-kv";
import { testDriver } from "./utils";

// --- 检查环境变量 ---
// Vercel KV 驱动需要知道 Vercel KV 服务的 API 地址 (URL) 和访问令牌 (Token) 才能工作。
// 这些信息通常存储在环境变量中，这里检查这两个变量是否存在。
const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// --- 条件跳过测试 ---
// 如果必要的环境变量缺失 (hasEnv 为 false)，则跳过这个测试套件。
// 因为没有连接信息，测试无法进行。
describe.skipIf(!hasEnv)("drivers: vercel-kv", async () => {
  // --- 运行通用测试 ---
  testDriver({
    // driver 函数返回一个 Vercel KV 驱动实例。
    // 这里调用 vercelKVDriver({}) 时没有传递任何配置参数。
    // 这通常意味着驱动会尝试使用默认行为，即自动从环境变量 
    // `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 读取连接信息。
    driver: () => vercelKVDriver({}),
  });
});
