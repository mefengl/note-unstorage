// 导入 Vitest 的测试函数和模拟功能。
import { describe, it, expect, vi } from "vitest";
// 从 Node.js 的 'path' 模块导入 resolve。
import { resolve } from "node:path";
// 从我们自己的驱动工具中导入文件读写函数。
import { readFile, writeFile } from "../../src/drivers/utils/node-fs";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";
// 导入我们要测试的标准 fs 驱动。
import driver from "../../src/drivers/fs";

// 定义测试组，专门测试标准 fs 驱动。
describe("drivers: fs", () => {
  // 解析出一个用于测试的临时目录路径。
  const dir = resolve(__dirname, "tmp/fs");

  // 使用通用测试工具 testDriver。
  testDriver({
    // 提供 fs 驱动实例。
    // base: dir 指定驱动在此目录下操作。
    driver: driver({ base: dir }),
    // 添加针对 fs 驱动的额外测试。
    additionalTests(ctx) {
      // 测试用例：检查基本的文件系统写入和读取。
      it("检查文件系统写入和读取", async () => {
        // 写入数据。
        await ctx.storage.setItem("s1:a", "test_data");
        // 直接读取文件确认写入成功。
        expect(await readFile(resolve(dir, "s1/a"), "utf8")).toBe("test_data");
      });

      // 测试用例：检查获取原生文件元数据。
      it("获取原生文件元数据", async () => {
        // 写入文件。
        await ctx.storage.setItem("s1:a", "test_data");
        // 获取元数据。
        const meta = await ctx.storage.getMeta("/s1/a");
        // 检查元数据属性。
        expect(meta.atime?.constructor.name).toBe("Date");
        expect(meta.mtime?.constructor.name).toBe("Date");
        expect(meta.size).toBeGreaterThan(0);
      });

      // 测试用例：检查文件系统监视功能。
      it("文件系统监视功能", async () => {
        // 创建一个 Vitest 的模拟函数 (spy) 来作为监视器回调。
        const watcher = vi.fn();
        // 启动对 storage 的监视。
        await ctx.storage.watch(watcher);
        // 在监视的目录下直接写入一个新文件。
        await writeFile(resolve(dir, "s1/random_file"), "random", "utf8");
        // 等待一小段时间，确保文件系统事件被捕捉到。
        // 注意：这是一个基于时间的测试，可能在某些系统或负载下不稳定。
        await new Promise((resolve) => setTimeout(resolve, 500));
        // 验证监视器回调函数是否被调用，并且参数正确。
        // 预期事件类型是 'update'，键是 's1:random_file'。
        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
      });

      // 定义一组无效的 key，用于测试路径遍历防护。
      const invalidKeys = ["../foobar", "..:foobar", "../", "..:", ".."];
      // 遍历无效 key。
      for (const key of invalidKeys) {
        // 为每个无效 key 定义测试用例。
        it("防止路径遍历", async () => {
          // 预期尝试获取无效 key 时会抛出错误。
          await expect(ctx.storage.getItem(key)).rejects.toThrow("Invalid key");
        });
      }

      // 测试用例：允许在文件名中使用双点号。
      it("允许在文件名中使用双点号", async () => {
        // 写入文件名包含 ".." 的项。
        await ctx.storage.setItem("s1/te..st..js", "ok");
        // 确认可以成功读取。
        expect(await ctx.storage.getItem("s1/te..st..js")).toBe("ok");
      });

      // 测试用例：测试 getKeys 方法对 maxDepth 参数的原生支持。
      it("getKeys 方法对 maxDepth 参数的原生支持", async () => {
        // 写入不同层级的文件。
        // 注意：这里的层级结构和 fs-lite 测试中的似乎略有不同。
        await ctx.storage.setItem("depth-test/file0.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/file1.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file2.md", "boop");
        await ctx.storage.setItem("depth-test/depth0/depth1/file3.md", "boop");

        // 测试 maxDepth: 1。
        // 预期只返回第一层 'depth-test' 下的文件。
        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 1,
            })
          ).sort()
        ).toMatchObject(["depth-test/file0.md"]);

        // 测试 maxDepth: 2。
        // 预期返回到第二层 'depth-test/depth0' 下的文件。
        expect(
          (
            await ctx.driver.getKeys("", {
              maxDepth: 2,
            })
          ).sort()
        ).toMatchObject(["depth-test/depth0/file1.md", "depth-test/file0.md"]);
        // 注意：这里似乎没有测试 maxDepth 为 0 或无限制的情况。
      });
    },
  });
});
