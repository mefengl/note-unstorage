import { describe } from "vitest";
import { testDriver } from "./utils";
import upstashDriver from "../../src/drivers/upstash";

// --- Upstash 连接信息 ---
// 从环境变量中读取连接 Upstash Redis 需要的 URL 和 Token
// 这些信息通常在 .env 文件或 CI/CD 平台中配置，不应直接写在代码里
const url = process.env.VITE_UPSTASH_REDIS_REST_URL;
const token = process.env.VITE_UPSTASH_REDIS_REST_TOKEN;

// --- 条件跳过测试 ---
// describe.skipIf 是 Vitest 提供的功能，如果括号里的条件为 true (这里是 url 或 token 不存在)，
// 那么整个 'drivers: upstash' 测试套件就会被跳过。
// 因为没有 URL 或 Token，测试代码无法连接到 Upstash 服务，运行也没意义。
describe.skipIf(!url || !token)("drivers: upstash", async () => {
  // --- 设置环境变量 (可能驱动内部需要) ---
  // 有些库或驱动内部可能直接从 process.env 读取特定的环境变量。
  // 这里我们将从 VITE_ 开头的变量读取到的值，再赋给没有 VITE_ 前缀的变量，以确保驱动能找到它们。
  process.env.UPSTASH_REDIS_REST_URL = url;
  process.env.UPSTASH_REDIS_REST_TOKEN = token;

  // --- 运行通用测试 ---
  testDriver({
    driver: upstashDriver({
      // 使用随机生成的 base 路径 (例如：'a3f7') 来隔离本次测试产生的数据，
      // 避免跟其他测试或历史数据冲突。
      base: `test:${Math.round(Math.random() * 1_000_000).toString(16)}`,
    }),
  });
});
