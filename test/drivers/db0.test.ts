// 导入 Vitest 测试框架的功能，跟之前的文件类似。
// afterAll: 在所有测试结束后执行清理。
// describe: 分组测试。
// expect: 断言结果。
// it: 定义单个测试用例 (it 是 test 的别名，功能一样)。
import { afterAll, describe, expect, it } from "vitest";
// 导入 db0 库的 createDatabase 函数，这是创建 db0 数据库实例的关键。
import { createDatabase } from "db0";
// 导入我们自己的 db0 驱动，这是 unstorage 和 db0 之间的桥梁。
import db0Driver from "../../src/drivers/db0";
// 导入通用的驱动测试工具函数。
import { testDriver } from "./utils";

// 定义一个包含不同数据库驱动配置的数组。
// 这个测试文件会遍历这个数组，为每种数据库后端都运行一遍测试。
const drivers = [
  {
    // 驱动名称，方便识别。
    name: "sqlite",
    // 一个异步函数，用来获取该数据库的 db0 实例。
    async getDB() {
      // 动态导入 db0 的 better-sqlite3 连接器。
      // better-sqlite3 是一个流行的、高性能的 Node.js SQLite 库。
      // 使用动态导入 (import()) 是因为我们可能不需要同时安装所有数据库的依赖。
      const sqlite = await import("db0/connectors/better-sqlite3").then(
        (m) => m.default // 获取模块的默认导出
      );
      // 使用导入的连接器和 createDatabase 创建一个基于 SQLite 的 db0 实例。
      // { name: ":memory:" } 表示使用内存数据库，速度快，测试完自动消失。
      return createDatabase(sqlite({ name: ":memory:" }));
    },
  },
  {
    name: "libsql", // LibSQL 是 SQLite 的一个分支，专注于分布式和边缘计算。
    async getDB() {
      // 动态导入 db0 的 LibSQL Node.js 连接器。
      const libSQL = await import("db0/connectors/libsql/node").then(
        (m) => m.default
      );
      // 创建基于 LibSQL 的 db0 实例，同样使用内存模式。
      return createDatabase(libSQL({ url: ":memory:" }));
    },
  },
  {
    name: "pglite", // PGlite 是一个能在 Node.js 和浏览器中运行的轻量级 PostgreSQL 仿真器。
    async getDB() {
      // 动态导入 db0 的 PGlite 连接器。
      const pglite = await import("db0/connectors/pglite").then(
        (m) => m.default
      );
      // 创建基于 PGlite 的 db0 实例。
      return createDatabase(pglite());
    },
  },
  // 下面是 MySQL 的配置，稍微复杂一点。
  // 这个注释提供了运行 MySQL Docker 容器的命令，方便本地测试。
  // docker run -it --rm --name mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=unstorage -p 3306:3306 mysql
  // 这个注释说明了如何通过设置环境变量来运行针对 MySQL 的测试。
  // VITEST_MYSQL_URI=mysql://root:root@localhost/unstorage pnpm vitest test/drivers/db0.test.ts -t mysql
  {
    name: "mysql",
    // enabled 标志：只有当环境变量 VITEST_MYSQL_URI 设置了，才启用 MySQL 测试。
    // 这样做是为了避免在没有 MySQL 环境的情况下运行并失败。
    enabled: !!process.env.VITEST_MYSQL_URI, // !! 将值转换为布尔值
    async getDB() {
      // 动态导入 db0 的 mysql2 连接器。
      const mysql = await import("db0/connectors/mysql2").then(
        (m) => m.default
      );
      // 创建基于 MySQL 的 db0 实例。
      return createDatabase(
        mysql({
          // 从环境变量读取 MySQL 连接字符串。
          uri: process.env.VITEST_MYSQL_URI,
        })
      );
    },
  },
];

// 遍历上面定义的 drivers 数组，为每个数据库驱动配置运行测试。
for (const driver of drivers) {
  // 使用 describe.skipIf 来决定是否跳过某个数据库后端的测试组。
  // 如果 driver.enabled 设置为 false（比如 MySQL 的环境变量没设置），则跳过该组测试。
  describe.skipIf(driver.enabled === false)(
    // 测试组的名称包含数据库驱动的名称，方便区分日志。
    `drivers: db0 - ${driver.name}`,
    // 测试组的主体是一个异步函数。
    async () => {
      // 在测试组开始时，调用 getDB() 获取当前数据库后端的 db0 实例。
      const db = await driver.getDB();

      // 注册一个在当前测试组所有测试结束后运行的清理函数。
      afterAll(async () => {
        // 执行 SQL 命令删除 unstorage 在数据库中创建的表。
        // 这是为了确保每次运行测试都是干净的环境。
        await db.sql`DROP TABLE IF EXISTS unstorage`;
        // 注意：这里没有关闭数据库连接，db0 或连接器内部可能会处理。
      });

      // 调用通用的 testDriver 函数来运行标准的 unstorage 驱动测试。
      testDriver({
        // 传入一个函数，该函数返回一个新的 db0Driver 实例。
        // 每次测试都需要一个新的驱动实例，以确保隔离性。
        // 将前面获取的 db0 数据库实例传递给驱动。
        driver: () => db0Driver({ database: db }),
        // 除了标准测试外，还可以添加针对 db0 驱动的特定测试。
        additionalTests: (ctx) => {
          // 定义一个名为 "meta" 的额外测试用例。
          it("meta", async () => {
            // 使用当前存储实例设置一个带元数据的值。
            // db0 驱动应该能处理元数据的存储。
            await ctx.storage.setItem("meta:test", "test_data");

            // 获取刚才设置项的元数据。
            // 预期元数据应该包含 birthtime (创建时间) 和 mtime (修改时间)。
            expect(await ctx.storage.getMeta("meta:test")).toMatchObject({
              birthtime: expect.any(Date), // 检查 birthtime 是否是一个 Date 对象
              mtime: expect.any(Date),     // 检查 mtime 是否是一个 Date 对象
            });
          });
        },
      });
    }
  );
}
