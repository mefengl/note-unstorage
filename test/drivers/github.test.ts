// 导入 Vitest 的测试函数。
import { describe, it, expect } from "vitest";
// 导入我们要测试的 github 驱动。
import driver from "../../src/drivers/github";
// 导入 unstorage 的核心函数 createStorage。
import { createStorage } from "../../src";

// 定义测试组，专门测试 github 驱动。
describe("drivers: github", () => {
  // 创建一个 storage 实例，并配置使用 github 驱动。
  const storage = createStorage({
    driver: driver({
      // 指定目标 GitHub 仓库，格式为 'owner/repo'。
      repo: "unjs/unstorage",
      // 指定要读取的分支。
      branch: "main",
      // 指定仓库内的根目录，'/' 表示从仓库根目录开始读取。
      dir: "/",
    }),
  });

  // 测试用例：检查是否能读取仓库的文件列表。
  it("可以读取仓库的文件列表", async () => {
    // 调用 storage.getKeys() 获取文件和目录列表。
    const keys = await storage.getKeys();
    // 断言：获取到的 key (文件/目录名) 数量应该大于 10。
    // 这只是一个基本检查，确保能拿到一些东西。
    expect(keys.length).toBeGreaterThan(10);
  });

  // 测试用例：检查是否能判断文件是否存在。
  it("可以判断文件是否存在", async () => {
    // 调用 storage.hasItem() 检查 'package.json' 是否存在。
    const hasPkg = await storage.hasItem("package.json");
    // 断言：预期 'package.json' 应该存在，所以结果为 true。
    expect(hasPkg).toBe(true);
  });

  // 测试用例：检查是否能读取 JSON 文件的内容。
  it("可以读取 JSON 文件的内容", async () => {
    // 调用 storage.getItem() 读取 'package.json' 的内容。
    // 由于 getItem 可能返回 null 或非 JSON 类型，这里使用类型断言 `as Record<string, unknown>`
    // 并使用非空断言 `!`，表示我们确信能拿到有效的对象。
    const pkg = (await storage.getItem("package.json"))! as Record<
      string,
      unknown
    >;
    // 断言：读取到的 package.json 对象应该有一个 'name' 属性，且值为 'unstorage'。
    expect(pkg.name).toBe("unstorage");
  });

  // 测试用例：检查是否能读取文件的元数据。
  it("可以读取文件的元数据", async () => {
    // 调用 storage.getMeta() 获取 'package.json' 的元数据。
    // 对返回的元数据进行类型断言，指定我们关心的字段及其类型。
    const pkgMeta = (await storage.getMeta("package.json")) as {
      sha: string; // 文件的 Git SHA 哈希值
      mode: string; // 文件的权限模式 (通常是字符串形式的八进制数)
      size: number; // 文件的大小 (字节)
    };
    // 断言：SHA 哈希值的长度应该大于 0。
    expect(pkgMeta.sha.length > 0).toBe(true);
    // 断言：文件模式转换成数字后应该大于 1000 (这是一个基于典型文件模式的粗略检查)。
    expect(Number(pkgMeta.mode)).toBeGreaterThan(1000);
    // 断言：文件大小应该大于 1000 字节 (基于对 unstorage package.json 大小的了解)。
    expect(pkgMeta.size).toBeGreaterThan(1000);
  });
});
