// 导入 Vitest 的测试函数。
import { describe, it, expect } from "vitest";
// 从 Node.js 的 'path' 模块导入 resolve，用于处理文件路径。
import { resolve } from "node:path";
// 从我们自己的驱动工具中导入 readFile 函数（可能是对 Node.js fs.readFile 的封装）。
import { readFile } from "../../src/drivers/utils/node-fs";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";
// 导入我们要测试的 fs-lite 驱动。
import driver from "../../src/drivers/fs-lite";

// 定义测试组，专门测试 fs-lite 驱动。
describe("drivers: fs-lite", () => {
  // 解析出一个用于测试的临时目录路径。
  // __dirname 是当前文件所在的目录。
  // resolve 会将相对路径转换为绝对路径。
  const dir = resolve(__dirname, "tmp/fs-lite");

  // 使用通用测试工具 testDriver。
  testDriver({
    // 提供 fs-lite 驱动实例。
    // base: dir 指定驱动将在这个临时目录下读写文件。
    // 所有存储的键都会相对于这个基础目录。
    driver: driver({ base: dir }),
    // 添加针对 fs-lite 驱动的额外测试。
    additionalTests(ctx) {
      // 测试用例：检查文件系统写入是否成功。
      it("检查文件系统写入", async () => {
        // 使用 storage API 写入数据。
        // key "s1:a" 会被映射到目录 "s1" 下的文件 "a"。
        await ctx.storage.setItem("s1:a", "test_data");
        // 直接使用 Node.js 文件系统 API 读取刚才写入的文件。
        // resolve(dir, "s1/a") 计算出文件的绝对路径。
        // 确认文件内容是否与写入的数据一致。
        expect(await readFile(resolve(dir, "s1/a"), "utf8")).toBe("test_data");
      });

      // 测试用例：检查获取原生文件元数据的功能。
      it("获取原生文件元数据", async () => {
        // 先写入一个文件。
        await ctx.storage.setItem("s1:a", "test_data");
        // 使用 storage API 获取该文件的元数据。
        // 注意 key 可以使用 '/' 作为分隔符，驱动内部会处理。
        const meta = await ctx.storage.getMeta("/s1/a");
        // 检查元数据中的访问时间 (atime) 和修改时间 (mtime) 是否是 Date 对象。
        // .constructor.name 是获取对象构造函数名称的一种方式。
        expect(meta.atime?.constructor.name).toBe("Date");
        expect(meta.mtime?.constructor.name).toBe("Date");
        // 检查文件大小 (size) 是否大于 0。
        expect(meta.size).toBeGreaterThan(0);
      });

      // 定义一组无效的 key，这些 key 试图进行路径遍历攻击。
      // 比如 "../foobar" 试图访问上级目录。
      const invalidKeys = ["../foobar", "..:foobar", "../", "..:", ".."];
      // 遍历无效 key 数组。
      for (const key of invalidKeys) {
        // 为每个无效 key 定义一个测试用例。
        it("防止路径遍历攻击", async () => {
          // 尝试使用无效 key 获取项目。
          // 预期 storage.getItem 会抛出一个包含 "Invalid key" 信息的错误。
          // expect(...).rejects.toThrow(...) 用于测试异步函数是否按预期抛出错误。
          await expect(ctx.storage.getItem(key)).rejects.toThrow("Invalid key");
        });
      }

      // 测试用例：允许在文件名中使用双点号。
      // 虽然 ".." 通常用于路径遍历，但如果它只是文件名的一部分，应该是允许的。
      it("允许文件名中使用双点号", async () => {
        // 写入一个文件名包含 ".." 的项。
        await ctx.storage.setItem("s1/te..st..js", "ok");
        // 确认可以成功读取回来。
        expect(await ctx.storage.getItem("s1/te..st..js")).toBe("ok");
      });

      // 测试用例：测试 getKeys 方法对 maxDepth 参数的原生支持。
      // fs-lite 驱动可以直接利用文件系统的层级结构来实现深度限制。
      it("测试 getKeys 方法的 maxDepth 参数", async () => {
        // 写入一些不同层级的文件。
        await ctx.storage.setItem("file0.md", "boop");
        await ctx.storage.setItem("depth-test/file1.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/file2.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file3.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file4.md", "boop");

        // 测试 maxDepth: 0，应该只返回根目录下的文件。
        expect(
          (
            // 直接调用驱动的 getKeys 方法。
            await ctx.driver.getKeys("", {
              maxDepth: 0,
            })
          ).sort() // 对结果排序以确保比较顺序一致。
        ).toMatchObject(["file0.md"]); // 预期结果。

        // 测试 maxDepth: 1，应该返回根目录和第一层子目录的文件。
        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 1,
            })
          ).sort()
        ).toMatchObject(["depth-test/file1.md", "file0.md"]);

        // 测试 maxDepth: 2，应该返回到第二层子目录的文件。
        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 2,
            })
          ).sort()
        ).toMatchObject([
          "depth-test/depth0/file2.md",
          "depth-test/file1.md",
          "file0.md",
        ]);
        // 注意：这里没有测试 maxDepth 无限制的情况，那应该会返回所有 5 个文件。
      });
    },
  });
});
