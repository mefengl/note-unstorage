import { describe } from "vitest";
import driver from "../../src/drivers/uploadthing";
import { testDriver } from "./utils";

// 从环境变量中读取 UploadThing 的 API 密钥
// 这个密钥通常在 `.env` 文件中配置，或者在持续集成 (CI) 环境中设置
const utfsToken = process.env.VITE_UPLOADTHING_TOKEN;

// describe.skipIf 是 Vitest 测试框架提供的一个功能
// 它允许我们在特定条件（这里是 utfsToken 不存在）下跳过整个测试套件
// 这是因为如果没有 API 密钥，测试就无法连接到 UploadThing 服务，运行会失败
describe.skipIf(!utfsToken)("drivers: uploadthing", { timeout: 30e3 }, () => {
  // { timeout: 30e3 } 设置这个测试套件的超时时间为 30000 毫秒 (30秒)
  // 因为涉及到网络请求，可能需要更长的时间来完成

  // 将从 VITE_UPLOADTHING_TOKEN 读取到的 token 设置到 process.env.UPLOADTHING_TOKEN
  // 这可能是因为 uploadthing 驱动或其内部依赖库会直接从 process.env 读取这个变量
  process.env.UPLOADTHING_TOKEN = utfsToken;

  testDriver({
    driver: driver({
      // 设置一个基础路径 (base)
      // 这里使用随机生成的字符串作为基础路径，例如 "test:ae4f" 或 "test:1b9d"
      // 目的是隔离每次测试运行产生的数据，避免不同测试之间相互干扰或与之前测试留下的数据冲突
      base: `test:${Math.round(Math.random() * 1_000_000).toString(16)}`,
    }),
  });
});
