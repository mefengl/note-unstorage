// 导入 Vitest 的测试函数。
import { describe, expect, it } from "vitest";
// 导入我们要测试的 indexeddb 驱动。
import driver from "../../src/drivers/indexedb";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";
// 导入 fake-indexeddb 并自动应用模拟。
// 这使得我们可以在 Node.js 环境中测试依赖 IndexedDB 的代码。
import "fake-indexeddb/auto";
// 导入 unstorage 的核心函数 createStorage。
import { createStorage } from "../../src";

// 定义测试组，专门测试 indexeddb 驱动。
describe("drivers: indexeddb", () => {
  // 1. 运行标准的驱动测试套件。
  // 使用通用测试工具 testDriver，传入 indexeddb 驱动实例。
  // 配置驱动使用名为 "test-db" 的 IndexedDB 数据库。
  testDriver({ driver: driver({ dbName: "test-db" }) });

  // 2. 测试自定义配置。
  // 创建一个新的 storage 实例，使用不同的配置。
  const customStorage = createStorage({
    driver: driver({
      // 指定自定义的数据库名称。
      dbName: "custom-db",
      // 指定自定义的对象存储 (object store) 名称。
      // IndexedDB 将数据存储在 object stores 中。
      storeName: "custom-name",
      // 指定一个基础前缀，所有 key 都会自动加上这个前缀。
      // 例如，setItem('foo', ...) 实际上会存储为 'unstorage:foo'。
      base: "unstorage",
    }),
  });

  // 测试用例：验证使用自定义数据库/存储名/基础前缀的存储实例。
  it("可以使用自定义存储", async () => {
    // 写入数据，key 会自动变成 'unstorage:first'。
    await customStorage.setItem("first", "foo");
    // 写入数据，key 会自动变成 'unstorage:second'。
    await customStorage.setItem("second", "bar");
    // 读取数据，会自动处理前缀。
    expect(await customStorage.getItem("first")).toBe("foo");
    // 删除数据。
    await customStorage.removeItem("first");
    // 获取所有 key，预期只剩下带前缀的 'second'。
    expect(await customStorage.getKeys()).toMatchObject(["unstorage:second"]);
    // 清空所有带此前缀的数据。
    await customStorage.clear();
    // 确认 'second' 确实被清除了。
    expect(await customStorage.hasItem("second")).toBe(false);
  });

  // 测试用例：验证对原始 (raw) 数据的处理。
  // unstorage 通常会对存储的值进行序列化 (如 JSON.stringify)。
  // setItemRaw/getItemRaw 允许存储和读取未序列化的原始值。
  it("正确处理原始数据", async () => {
    // 使用 setItem 存储对象，它会被序列化为 JSON 字符串。
    await customStorage.setItem("object", { item: "foo" });
    // 使用 setItemRaw 存储对象，它会按原样存储 (如果 IndexedDB 支持)。
    await customStorage.setItemRaw("rawObject", { item: "foo" });
    // 使用 getItemRaw 读取被 setItem 存储的对象，预期得到 JSON 字符串。
    expect(await customStorage.getItemRaw("object")).toBe('{"item":"foo"}');
    // 使用 getItemRaw 读取被 setItemRaw 存储的对象，预期得到原始对象。
    expect(await customStorage.getItemRaw("rawObject")).toStrictEqual({
      item: "foo",
    });

    // 对数字类型进行类似测试。
    await customStorage.setItem("number", 1234);
    await customStorage.setItemRaw("rawNumber", 1234);
    // setItem 存储的数字会被转为字符串。
    expect(await customStorage.getItemRaw("number")).toBe("1234");
    // setItemRaw 存储的数字保持原样。
    expect(await customStorage.getItemRaw("rawNumber")).toBe(1234);

    // 对布尔类型进行类似测试。
    await customStorage.setItem("boolean", true);
    await customStorage.setItemRaw("rawBoolean", true);
    // setItem 存储的布尔值会被转为字符串 "true"。
    expect(await customStorage.getItemRaw("boolean")).toBe("true");
    // setItemRaw 存储的布尔值保持原样。
    expect(await customStorage.getItemRaw("rawBoolean")).toBe(true);
  });
});
