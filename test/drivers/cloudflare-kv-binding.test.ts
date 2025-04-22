/**
 * 这个文件包含了针对 Cloudflare KV Binding 驱动的测试。
 * Cloudflare KV (Key-Value) 是一种分布式键值存储，通常在 Cloudflare Workers 中使用。
 * "Binding" 模式意味着 KV 命名空间直接绑定到 Worker 的全局运行环境/变量中。
 * 这个测试利用 Wrangler（Cloudflare 的 CLI 工具）的本地代理来模拟这个环境。
 */
 
 // TypeScript 的三斜线指令，用于引用 Cloudflare Workers 的类型定义。
 // 这有助于在编写与 Workers API 交互的代码时获得类型检查和自动补全。
 /// <reference types="@cloudflare/workers-types" />
 
 import { describe, expect, test, afterAll } from "vitest"; // 导入 Vitest 测试框架的功能
 import { createStorage, snapshot } from "../../src"; // 导入 unstorage 核心功能
 import CloudflareKVBinding from "../../src/drivers/cloudflare-kv-binding"; // 导入 Cloudflare KV Binding 驱动
 import { testDriver } from "./utils"; // 导入通用测试运行器
 import { getPlatformProxy } from "wrangler"; // 导入 Wrangler 用于获取本地开发环境代理的函数
 
 // 定义测试套件，使用 async 因为 getPlatformProxy 是异步的
 describe("drivers: cloudflare-kv", async () => {
   // 获取 Wrangler 平台代理。这将启动一个本地开发服务器，
   // 模拟 Cloudflare Workers 环境，包括配置的 KV 命名空间绑定。
   // 这需要本地正确安装和配置 Wrangler。
   const cfProxy = await getPlatformProxy();
 
   // 将 Wrangler 代理提供的环境对象（包含 KV 绑定）赋值给全局 `__env__` 变量。
   // CloudflareKVBinding 驱动会查找这个全局变量来访问绑定的 KV 命名空间。
   // 这是模拟真实 Worker 环境中绑定工作方式的关键步骤。
   (globalThis as any).__env__ = cfProxy.env;
 
   // 在所有测试结束后执行清理操作
   afterAll(async () => {
     // 清除全局环境中的模拟绑定，避免污染其他测试。
     (globalThis as any).__env__ = undefined;
     // 关闭 Wrangler 代理和本地开发服务器。
     await cfProxy.dispose();
   });
 
   // 使用通用测试运行器执行标准驱动测试
   testDriver({
     // 实例化 Cloudflare KV Binding 驱动
     // 设置 `base: "base"`，表示所有通过此实例操作的键都会自动添加 "base:" 前缀。
     driver: CloudflareKVBinding({ base: "base" }),
 
     // 添加额外的、特定于此驱动的测试用例
     async additionalTests(ctx) {
       // 测试 snapshot 功能，特别是与 `base` 选项结合时
       test("snapshot", async () => {
         // 使用带有 `base: "base"` 的驱动实例 (ctx.storage) 设置一些键值对。
         // 实际存储到 KV 中的键会是 "base:s1:a", "base:s2:a", "base:s3:a"。
         await ctx.storage.setItem("s1:a", "test_data");
         await ctx.storage.setItem("s2:a", "test_data");
         await ctx.storage.setItem("s3:a", "test_data");
 
         // 创建一个新的 unstorage 实例，使用 CloudflareKVBinding 驱动，
         // 但这次 *不* 提供 `base` 选项。这意味着这个实例将直接访问 KV 命名空间的根级别。
         const storage = createStorage({
           driver: CloudflareKVBinding({}), // 注意：没有 base
         });
 
         // 对没有 `base` 的存储实例进行快照。
         // 这应该能获取到 KV 命名空间中的所有内容。
         // 我们期望看到之前通过带 `base` 的实例写入的、包含完整前缀的键。
         expect(await snapshot(storage, "")).toMatchInlineSnapshot(`
           {
             "base:s1:a": "test_data",
             "base:s2:a": "test_data",
             "base:s3:a": "test_data",
           }
         `);
       });
     },
   });
 });
