// 导入 Vitest 的测试生命周期钩子、测试函数和断言。
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// 导入我们要测试的 mongodb 驱动。
import driver from "../../src/drivers/mongodb";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";
// 导入 mongodb-memory-server 用于在内存中启动一个 MongoDB 实例进行测试。
import { MongoMemoryServer } from "mongodb-memory-server";
// 导入 Node.js 的 promisify 工具，用于将基于回调的函数（如 setTimeout）转换为 Promise 版本。
import { promisify } from "node:util";

// 定义测试组，专门测试 mongodb 驱动。
// 注意：使用了 .skip，表示这个测试组目前被跳过，不会执行。
// 跳过的原因可能是依赖问题、环境问题、或者测试本身不稳定。
describe.skip("drivers: mongodb", async () => {
  // 将 setTimeout 转换为 Promise 版本的 sleep 函数，方便在异步测试中等待。
  const sleep = promisify(setTimeout);

  // 声明变量用于存储内存 MongoDB 服务器实例和连接字符串。
  let mongoServer: MongoMemoryServer;
  let connectionString: string | undefined;

  // 在当前 describe 块中的所有测试运行之前执行一次。
  beforeAll(async () => {
    // 创建并启动一个内存 MongoDB 服务器实例。
    // 这可能需要下载 MongoDB 二进制文件，第一次运行时会比较慢。
    mongoServer = await MongoMemoryServer.create();
    // 获取启动的内存服务器的连接 URI。
    connectionString = mongoServer.getUri();
  }, 60_000); // 设置较长的超时时间 (60秒)，因为启动服务器可能耗时较长

  // 在当前 describe 块中的所有测试运行完成之后执行一次。
  afterAll(async () => {
    // 如果内存服务器实例存在，则停止它。
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // 使用通用测试工具 testDriver 运行标准的 unstorage 驱动测试套件。
  testDriver({
    // 提供 mongodb 驱动实例。
    driver: driver({
      // 传入从内存服务器获取的连接字符串。
      // 使用类型断言，因为此时 connectionString 理论上已经有值。
      connectionString: connectionString as string,
      // 指定测试用的数据库名称。
      databaseName: "test",
      // 指定测试用的集合名称。
      collectionName: "test",
    }),
    // 添加针对 mongodb 驱动的额外测试。
    additionalTests: (ctx) => {
      // 测试用例：验证在未提供连接字符串时驱动是否会抛出错误。
      it("should throw error if no connection string is provided", async () => {
        // 预期调用 driver 时缺少 connectionString 会抛出特定错误。
        // 使用 rejects.toThrowError 来断言 Promise 应该被拒绝并抛出错误。
        // (注意: 这里直接调用 getItem 可能不是触发配置检查的最佳方式，
        // 但意图是检查配置错误)
        expect(() =>
          driver({
            databaseName: "test",
            collectionName: "test",
            // @ts-ignore 强制模拟缺少 connectionString 的情况
          } as any).getItem("")
        ).rejects.toThrowError(
          "[unstorage] [mongodb] Missing required option `connectionString`."
        );
      });

      // 测试用例：验证更新条目后，mtime 和 birthtime 是否不同。
      it("should have different dates when an entry was updated", async () => {
        // 第一次设置条目，记录 birthtime 和 mtime。
        await ctx.storage.setItem("s1:a", "test_data");
        // 等待一段时间 (100毫秒)，确保后续更新的时间戳不同。
        await sleep(100);
        // 更新同一个条目，这应该只更新 mtime。
        await ctx.storage.setItem("s1:a", "updated_test_data");
        // 获取条目的元数据。
        const result = await ctx.storage.getMeta("s1:a");
        // 断言：修改时间 (mtime) 不应该等于创建时间 (birthtime)。
        expect(result!.mtime).not.toBe(result!.birthtime);
      });
    },
  });
});
