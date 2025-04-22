// 导入 Vitest 的测试函数。
import { describe, afterAll, expect, it } from "vitest";
// 导入我们要测试的 http 驱动。
import driver from "../../src/drivers/http";
// 导入 unstorage 的核心函数 createStorage。
import { createStorage } from "../../src";
// 导入用于创建 unstorage HTTP 服务器的函数。
import { createStorageServer } from "../../src/server";
// 导入 listhen 用于快速启动和管理 HTTP 监听器。
import { listen } from "listhen";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";

// 定义测试组，专门测试 http 驱动。
// 使用 async 是因为我们需要在 describe 块内部等待服务器启动。
describe("drivers: http", async () => {
  // 1. 设置模拟的远程存储 (服务器端)
  // 创建一个基础的内存存储实例，它将作为 HTTP 服务器的后端。
  const remoteStorage = createStorage();

  // 2. 创建 unstorage HTTP 服务器
  const server = createStorageServer(remoteStorage, {
    // 可选配置：添加授权逻辑。
    authorize(req) {
      // 这个函数会在每次请求到达服务器时被调用。
      // 我们可以检查请求头、方法、key 等信息来决定是否授权。
      // req 对象包含了请求的关键信息，如 key, type (操作类型), event (底层事件对象)

      // 检查全局必需的请求头。
      // req.event.node.req 是底层的 Node.js 请求对象。
      if (req.event.node.req.headers["x-global-header"] !== "1") {
        // 如果缺少或值不正确，则抛出错误，拒绝请求。
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing global test header!");
      }
      // 针对特定 key ('authorized') 检查特定的请求头。
      if (
        req.key === "authorized" &&
        req.event.node.req.headers["x-auth-header"] !== "1"
      ) {
        // 如果是操作 'authorized' 这个 key，并且缺少 'x-auth-header'，则拒绝。
        // console.log(req.key, req.type, req.event.node.req.headers);
        throw new Error("Missing auth test header!");
      }
      // 如果所有检查都通过，函数正常返回，表示授权成功。
    },
  });

  // 3. 启动 HTTP 服务器
  // 使用 listhen 启动服务器，监听一个随机可用端口。
  const listener = await listen(server.handle, {
    port: { random: true }, // 让 listhen 自动选择端口
  });

  // 4. 测试结束后清理
  // 使用 afterAll 钩子确保在所有测试运行完毕后关闭服务器监听器。
  afterAll(async () => {
    await listener.close();
  });

  // 5. 运行标准驱动测试
  // 使用通用测试工具 testDriver 来测试 http 驱动。
  testDriver({
    // 提供 http 驱动实例 (客户端)。
    driver: driver({
      // 指定远程服务器的基础 URL，即我们刚刚启动的服务器地址。
      // listener!.url 包含了协议、主机和端口。
      base: listener!.url,
      // 配置驱动发送请求时默认携带的全局请求头。
      // 这个头是为了通过服务器端的全局授权检查。
      headers: { "x-global-header": "1" },
    }),
    // 6. 添加针对 http 驱动的额外测试。
    async additionalTests(ctx) {
      // 测试用例：验证自定义请求头是否能被发送和处理。
      it("custom headers", async () => {
        // 调用 setItem 时，可以通过第三个参数传递额外的选项，包括 headers。
        // 这个请求是针对 'authorized' key 的，所以需要 'x-auth-header'。
        // 这里的 headers 会被 http 驱动附加到对应的 HTTP 请求中。
        // 服务器端的授权逻辑会检查这个头。
        // 如果测试没有抛出错误，说明头被正确发送并通过了授权。
        await ctx.storage.setItem("authorized", "test", {
          headers: { "x-auth-header": "1" },
        });
      });

      // 测试用例：验证 null 值的处理。
      it("null item", async () => {
        // 存储一个实际的 null 值。
        await ctx.storage.setItem("nullItem", null);
        // 存储一个字符串 "null"。
        await ctx.storage.setItem("nullStringItem", "null");

        // 断言：获取实际存储为 null 的项，应该返回 null。
        expect(await ctx.storage.getItem("nullItem")).toBeNull();
        // 断言：获取一个不存在的项 ('nanItem' 故意写错)，也应该返回 null。
        expect(await ctx.storage.getItem("nanItem")).toBeNull();
        // 断言：获取存储为字符串 "null" 的项。
        // !! 注意：这里的预期结果也是 null。这表明 http 驱动 (或服务器端)
        // !! 可能将字符串 "null" 也视为空值返回。这是需要注意的特性。
        expect(await ctx.storage.getItem("nullStringItem")).toBeNull();
      });
    },
  });
});
