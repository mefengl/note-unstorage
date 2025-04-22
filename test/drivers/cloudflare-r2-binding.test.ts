/// <reference types="@cloudflare/workers-types" />
// 这行代码是一个“三斜杠指令”，它告诉 TypeScript 编译器：“嘿，请加载 Cloudflare Workers 的类型定义！”
// 这样做的好处是，当我们在代码中使用 Cloudflare Workers 特有的全局变量或类型时，TypeScript 能认出来，并提供智能提示和类型检查。
// 就像给 TypeScript 配了一副能看懂 Cloudflare 特殊语法的眼镜。
/// <reference types="@cloudflare/workers-types" />

// 从 'vitest' 测试库导入我们需要的功能。
// - describe: 用于将相关的测试用例分组，就像给测试分类打标签。
// - test: 用于定义一个单独的测试用例，说明我们要测什么。
// - expect: 用于断言（就是判断）测试结果是否符合预期。
// - afterAll: 用于注册一个在当前文件所有测试运行结束后执行的回调函数，通常用来做一些清理工作。
import { describe, test, expect, afterAll } from "vitest";
// 从我们自己的代码库导入。
// - createStorage: 创建一个 Unstorage 实例的工厂函数。
// - snapshot: 一个工具函数，能获取存储中所有内容的快照，就像给存储拍张照片。
import { createStorage, snapshot } from "../../src";
// 导入我们要测试的主角：Cloudflare R2 Binding 驱动。
// 这个驱动允许 Unstorage 直接与 Cloudflare R2 存储桶（可以理解为云上的一个大文件柜）进行交互，
// 但它依赖于 Cloudflare Workers 的运行环境，通过“绑定”的方式连接 R2 存储桶。
import CloudflareR2Binding from "../../src/drivers/cloudflare-r2-binding";
// 导入之前见过的测试小帮手函数，用于执行通用的驱动测试。
import { testDriver } from "./utils";
// 从 'wrangler' 包导入 getPlatformProxy 函数。
// Wrangler 是 Cloudflare 官方的开发工具。
// getPlatformProxy 可以模拟 Cloudflare Workers 的运行环境，包括 R2 绑定，这样我们就能在本地测试需要绑定资源的代码了。
// 相当于在我们的电脑上搭了一个小小的 Cloudflare 模拟器。
import { getPlatformProxy } from "wrangler";

// 开始定义一个测试组，专门测试 Cloudflare R2 Binding 驱动。
// 使用 async 关键字，因为获取模拟环境的操作是异步的。
describe("drivers: cloudflare-r2-binding", async () => {
  // 调用 getPlatformProxy() 获取 Cloudflare 平台的模拟代理对象。
  // 这个过程可能需要一点时间（比如下载模拟器代码），所以用 await 等待它完成。
  const cfProxy = await getPlatformProxy();

  // 把模拟环境中的 env 对象（包含了绑定的资源，比如 R2 桶）挂载到 Node.js 的全局对象 globalThis 上。
  // Cloudflare Workers 代码通常会直接访问全局的 env 变量来获取绑定的资源。
  // 我们在这里模拟这个行为，这样 R2 驱动就能找到它需要的 R2 存储桶绑定了。
  // (globalThis as any) 是告诉 TypeScript：“别管类型检查了，我就是要往全局对象上加东西。”
  (globalThis as any).__env__ = cfProxy.env;

  // 注册一个在所有测试结束后运行的清理函数。
  afterAll(async () => {
    // 清理之前挂载到全局对象上的模拟环境，恢复原状。
    (globalThis as any).__env__ = undefined;
    // 调用模拟代理对象的 dispose 方法，释放它占用的资源，比如关闭模拟器。
    await cfProxy.dispose();
  });

  // 使用通用的 testDriver 函数来运行标准的驱动测试。
  testDriver({
    // 告诉 testDriver 我们要测试哪个驱动。
    // 这里我们创建了一个 CloudflareR2Binding 驱动实例。
    // - base: "base" 给存储在这个驱动里的所有 key 加一个 "base:" 前缀。
    //   这样可以避免测试数据和 R2 桶里可能存在的其他数据混淆。
    driver: CloudflareR2Binding({ base: "base" }),

    // 除了标准的测试，我们还可以添加一些针对这个驱动的额外测试。
    async additionalTests(ctx) {
      // 定义一个名为 "snapshot" 的额外测试用例。
      test("snapshot", async () => {
        // 往存储里写入一些测试数据。
        // 注意 key 的格式 "s1:a", "s2:a", "s3:a"。
        // 结合上面 driver 配置的 base: "base"，实际存储到 R2 里的 key 会是 "base:s1:a", "base:s2:a", "base:s3:a"。
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        await ctx.storage.setItem("s3:a", "test_data");

        // 创建一个新的 Storage 实例，这次不设置 base 前缀。
        // 我们想用它来获取 R2 桶中 *所有* 内容的快照，看看刚才写入的数据是否都在里面。
        const storage = createStorage({
          driver: CloudflareR2Binding({}), // 注意这里没有 base
        });

        // 调用 snapshot 工具函数，获取 storage 的完整快照。
        // 第一个参数是 storage 实例，第二个参数 "" 表示获取根路径下的所有内容。
        const storageSnapshot = await snapshot(storage, "");

        // 使用 expect 断言快照的内容是否符合预期。
        // toMatchInlineSnapshot 是 Vitest 的一个酷功能，它会自动生成或更新一个内联的快照字符串。
        // 第一次运行时，它会生成下面的快照；如果之后代码逻辑变了导致快照内容变化，测试会失败，
        // Vitest 会提示你是否要更新这个内联快照。
        expect(storageSnapshot).toMatchInlineSnapshot(`
          {
            "base:s1:a": "test_data",
            "base:s2:a": "test_data",
            "base:s3:a": "test_data",
          }
        `);
        // 这个快照显示，我们成功地从 R2 桶（通过模拟环境）中读取到了之前以 "base:" 为前缀写入的所有数据。
      });
    },
  });
});
