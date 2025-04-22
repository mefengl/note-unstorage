/**
 * 这个文件包含了对 unstorage 核心功能的单元测试。
 * 主要测试 Storage 实例的创建、挂载、卸载、快照、监听、以及一些工具函数。
 * 使用了 Vitest 测试框架。
 */
import { describe, it, expect, vi } from "vitest";
import { resolve } from "node:path";
import {
  createStorage, // 导入创建存储实例的函数
  snapshot,      // 导入创建快照的函数
  restoreSnapshot, // 导入恢复快照的函数
  prefixStorage,   // 导入给存储键加前缀的工具函数
} from "../src";
import memory from "../src/drivers/memory"; // 导入内存驱动
import fs from "../src/drivers/fs";       // 导入文件系统驱动

// 定义一些测试用的初始数据
const data = {
  "etc:conf": "test",
  "data:foo": 123,
};

// 测试核心的 Storage 功能
describe("storage", () => {
  // 测试驱动的挂载和卸载功能
  it("mount/unmount", async () => {
    // 创建一个 Storage 实例，并挂载一个内存驱动到 /mnt 路径
    const storage = createStorage().mount("/mnt", memory());
    // 将测试数据恢复到挂载的驱动器中
    await restoreSnapshot(storage, data, "mnt");
    // 验证挂载点下的快照是否与初始数据匹配
    expect(await snapshot(storage, "/mnt")).toMatchObject(data);
    // 这里可以隐式地测试 unmount，因为测试结束后 storage 实例会被销毁
    // 也可以显式调用 storage.unmount('/mnt') 进行测试
  });

  // 测试获取挂载点信息的功能
  it("getMount and getMounts", () => {
    const storage = createStorage();

    // 挂载不同的路径和驱动
    storage.mount("/mnt", memory());
    storage.mount("cache", memory());
    storage.mount("cache:sub", memory());

    // 测试 getMount 是否能根据键路径找到正确的挂载点
    // 注意：挂载点基础路径会自动添加 ':'
    expect(storage.getMount("/cache:").base).toBe("cache:");
    expect(storage.getMount("/cache:foo").base).toBe("cache:"); // 'foo' 属于 'cache:' 挂载点
    expect(storage.getMount("/cache:sub").base).toBe("cache:sub:"); // 精确匹配
    expect(storage.getMount("/cache:sub:foo").base).toBe("cache:sub:"); // 'foo' 属于 'cache:sub:' 挂载点

    // 测试 getMounts 获取指定路径下的所有挂载点（包括子挂载点）
    expect(storage.getMounts("/cache").map((m) => m.base))
      .toMatchInlineSnapshot(`
        [
          "cache:sub:", // 子挂载点优先
          "cache:",
        ]
      `);
    // 测试获取精确路径下的挂载点
    expect(storage.getMounts("/cache:sub").map((m) => m.base))
      .toMatchInlineSnapshot(`
        [
          "cache:sub:",
        ]
      `);
    // 测试获取指定路径及其所有父级挂载点
    expect(
      storage.getMounts("/cache:sub", { parents: true }).map((m) => m.base)
    ).toMatchInlineSnapshot(`
      [
        "cache:sub:",
        "cache:",
        "", // 根挂载点
      ]
    `);

    // 测试获取所有已挂载的驱动点
    expect(storage.getMounts().map((m) => m.base)).toMatchInlineSnapshot(`
      [
        "cache:sub:",
        "cache:",
        "mnt:",
        "", // 根挂载点
      ]
    `);
  });

  // 测试快照功能
  it("snapshot", async () => {
    const storage = createStorage();
    // 将数据恢复到根存储
    await restoreSnapshot(storage, data);
    // 验证根存储的快照是否与数据匹配
    expect(await snapshot(storage, "")).toMatchObject(data);
  });

  // 测试监听（watch）功能
  it("watch", async () => {
    // 创建一个 mock 函数来监听变化
    const onChange = vi.fn();
    const storage = createStorage().mount("/mnt", memory());
    // 开始监听
    await storage.watch(onChange);
    // 通过恢复快照触发数据变更
    await restoreSnapshot(storage, data, "mnt");
    // 验证 onChange 是否被正确调用，参数是否包含挂载点前缀
    expect(onChange).toHaveBeenCalledWith("update", "mnt:etc:conf");
    expect(onChange).toHaveBeenCalledWith("update", "mnt:data:foo");
    // 验证 onChange 总共被调用的次数
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  // 测试取消监听（unwatch）的返回值
  it("unwatch return", async () => {
    const onChange = vi.fn();
    const storage = createStorage().mount("/mnt", memory());
    // 开始监听，并获取取消监听的函数
    const unwatch = await storage.watch(onChange);
    // 触发一次变更
    await storage.setItem("mnt:data:foo", 42);
    // 调用取消监听函数
    await unwatch();
    // 再次触发变更
    await storage.setItem("mnt:data:foo", 41);
    // 验证 onChange 只被调用了一次（取消监听后不再触发）
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // 测试取消所有监听的功能
  it("unwatch all", async () => {
    const onChange = vi.fn();
    const storage = createStorage().mount("/mnt", memory());
    // 开始监听
    await storage.watch(onChange);
    // 触发一次变更
    await storage.setItem("mnt:data:foo", 42);
    // 取消所有监听
    await storage.unwatch();
    // 再次触发变更
    await storage.setItem("mnt:data:foo", 41);
    // 验证 onChange 只被调用了一次
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // 测试挂载点覆盖行为
  it("mount overides", async () => {
    // 创建一个基础的内存驱动
    const mainStorage = memory();
    // 创建 Storage 实例，使用 mainStorage 作为默认驱动
    const storage = createStorage({ driver: mainStorage });
    // 在默认驱动中设置一些初始值
    await storage.setItem("/mnt/test.txt", "v1");
    await storage.setItem("/mnt/test.base.txt", "v1");

    // 获取初始的键列表
    const initialKeys = await storage.getKeys();
    expect(initialKeys).toMatchInlineSnapshot(`
      [
        "mnt:test.txt",
        "mnt:test.base.txt",
      ]
    `);

    // 在 /mnt 路径挂载一个新的内存驱动，这将覆盖默认驱动在该路径下的行为
    storage.mount("/mnt", memory());
    // 在新的挂载点设置值
    await storage.setItem("/mnt/test.txt", "v2");

    // 尝试在一个尚未挂载的子路径设置值，这会写入到 /mnt 的挂载驱动
    await storage.setItem("/mnt/foo/test.txt", "v3");
    // 在 /mnt/foo 挂载新的驱动，这将覆盖 /mnt 驱动在该子路径的行为
    storage.mount("/mnt/foo", memory());
    // 此时读取 /mnt/foo/test.txt 会是 null，因为它读取的是刚挂载的空驱动
    expect(await storage.getItem("/mnt/foo/test.txt")).toBe(null);

    // 读取 /mnt/test.txt，应该得到 v2，来自 /mnt 挂载点
    expect(await storage.getItem("/mnt/test.txt")).toBe("v2");
    // 获取当前所有可见的键，只会包含 /mnt 挂载点下的键，因为 /mnt/foo 也是独立挂载点
    expect(await storage.getKeys()).toMatchInlineSnapshot(`
      [
        "mnt:test.txt", // 注意这里不包含 /mnt/foo/test.txt，因为它在新挂载点
                         // 也不包含 /mnt/test.base.txt，因为它在被覆盖的默认驱动里
      ]
    `);

    // 清除 /mnt 挂载点的数据
    await storage.clear("/mnt");
    // 卸载 /mnt 驱动
    await storage.unmount("/mnt");
    // 卸载后，/mnt 路径下的操作会回到默认驱动
    // 验证键列表是否恢复到初始状态
    expect(await storage.getKeys()).toMatchObject(initialKeys);
    // 验证 /mnt/test.txt 的值是否是初始的 v1
    expect(await storage.getItem("/mnt/test.txt")).toBe("v1");
  });
});

// 测试工具函数
describe("utils", () => {
  // 测试 prefixStorage 工具函数，用于给键添加前缀
  it("prefixStorage", async () => {
    // prefixStorage 工具函数用于给存储键添加前缀
    // 这个测试用例验证 prefixStorage 的功能是否正常
    const storage = createStorage();
    // 创建一个带 'foo' 前缀的存储代理
    const pStorage = prefixStorage(storage, "foo");
    // 通过代理设置值
    await pStorage.setItem("x", "bar");
    await pStorage.setItem("y", "baz");
    // 验证原始存储中键是否带前缀
    expect(await storage.getItem("foo:x")).toBe("bar");
    // 验证通过代理获取值时不需要前缀
    expect(await pStorage.getItem("x")).toBe("bar");
    // 验证通过代理获取键列表时不包含前缀
    expect(await pStorage.getKeys()).toStrictEqual(["x", "y"]);

    // --- 测试更高层级的存储 --- //
    const secondStorage = createStorage();
    // 将第一个 storage 挂载到 secondStorage 的 /mnt 路径
    secondStorage.mount("/mnt", storage);
    // 创建一个代理，指向 secondStorage 的 /mnt 路径
    // 注意：这里的 prefix 是 'mnt'，它会应用到 secondStorage 上
    const mntStorage = prefixStorage(secondStorage, "mnt");

    // 获取 mntStorage 的键，它会看到挂载点 /mnt 下的所有键
    // 因为 /mnt 下挂载的是 storage，里面有 'foo:x', 'foo:y'
    expect(await mntStorage.getKeys()).toStrictEqual(["foo:x", "foo:y"]);
    // 获取 mntStorage 下以 'foo' 为前缀的键
    // 相当于在 secondStorage 中查找 'mnt:foo:' 开头的键
    expect(await mntStorage.getKeys("foo")).toStrictEqual(["foo:x", "foo:y"]);
  });

  // 测试值是否能正确字符串化（例如空数组）
  it("stringify", () => {
    // 这个测试用例验证存储值是否能正确字符串化
    const storage = createStorage();
    // 验证设置空数组不会抛出错误
    expect(async () => await storage.setItem("foo", [])).not.toThrow();
  });

  // 测试各种操作方法的别名是否按预期工作
  it("has aliases", async () => {
    // 这个测试用例验证各种操作方法的别名是否按预期工作
    const storage = createStorage();

    await storage.setItem("foo", "bar");
    // has 是 hasItem 的别名
    expect(await storage.has("foo")).toBe(true);
    // get 是 getItem 的别名
    expect(await storage.get("foo")).toBe("bar");
    // keys 是 getKeys 的别名
    expect(await storage.keys()).toEqual(["foo"]);
    // del 是 removeItem 的别名
    await storage.del("foo");
    expect(await storage.has("foo")).toBe(false);
    await storage.setItem("bar", "baz");
    // remove 是 removeItem 的别名
    await storage.remove("bar");
    expect(await storage.has("bar")).toBe(false);
  });
});

// 回归测试：确保修复了已知的问题
describe("Regression", () => {
  /**
   * 测试 setItems 是否会错误地触发两次底层 setItem 调用
   * 参考: https://github.com/unjs/unstorage/pull/392
   */
  it("setItems doesn't upload twice", async () => {
    /**
     * 背景：之前的实现中，如果驱动没有提供 setItems 方法，
     * createStorage 会 fallback 到多次调用 setItem。
     * 但是，即使驱动 *有* setItems 方法，基础逻辑里也可能错误地
     * 同时调用了驱动的 setItems 和多次 setItem。
     * 这个测试旨在确保如果驱动有 setItems，则只调用 setItems 一次。
     */

    // 使用 vi.fn() 创建 mock 函数来跟踪 setItem 和 setItems 的调用
    const setItem = vi.fn();
    const setItems = vi.fn();

    // 获取一个基础的内存驱动
    const driver = memory();
    // 创建一个新的存储实例，包装原始驱动，并注入 mock 函数
    const storage = createStorage({
      driver: {
        ...driver, // 继承原始驱动的所有方法
        // 覆盖 setItem 方法，调用 mock 函数后再调用原始方法
        setItem: (...args) => {
          setItem(...args);
          return driver.setItem?.(...args); // 使用 optional chaining 以防原始驱动没有此方法
        },
        // 覆盖 setItems 方法，调用 mock 函数后再调用原始方法
        setItems: (...args) => {
          setItems(...args);
          return driver.setItems?.(...args);
        },
      },
    });

    // 调用 setItem，预期只触发 setItem 一次
    await storage.setItem("a", 1);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItems).toHaveBeenCalledTimes(0);

    // 重置 mock 函数计数器
    setItem.mockClear();
    setItems.mockClear();

    // 调用 setItems，预期只触发 setItems 一次（因为内存驱动实现了 setItems）
    await storage.setItems([{ key: "a", value: 1 }]);
    expect(setItem).toHaveBeenCalledTimes(0);
    expect(setItems).toHaveBeenCalledTimes(1);
  });

  /**
   * 测试 fs 驱动的 watch 功能在 base 路径不存在时是否正常工作
   * 参考: https://github.com/unjs/unstorage/issues/277
   */
  it("fs driver watch doesn't throw when base doesn't exist", async () => {
    // 定义一个不存在的目录路径
    const nonExistentDir = resolve(__dirname, "non-existent-dir");
    // 创建一个使用 fs 驱动的 storage，指向一个不存在的目录
    const storage = createStorage({ driver: fs({ base: nonExistentDir }) });
    const onChange = vi.fn();
    // 验证调用 watch 时不会因为目录不存在而抛出错误
    // .resolves.toBeDefined() 验证 Promise 成功解决且值不是 undefined
    await expect(storage.watch(onChange)).resolves.toBeDefined();
    // 注意：虽然 watch 不会抛错，但因为目录不存在，实际可能无法监听到任何文件变化
    // 这个测试主要是保证在路径无效时的健壮性
  });

  /**
   * 测试 fs 驱动在 ignore 配置不正确时是否能优雅处理
   * 参考: https://github.com/unjs/unstorage/issues/345
   */
  it("fs driver handles invalid ignore option gracefully", async () => {
    // 创建一个 fs 驱动，传入一个无效的 ignore 选项（类型错误，应该是字符串数组）
    // 使用 `null as any` 来绕过 TypeScript 的类型检查，模拟错误的输入
    const storage = createStorage({ driver: fs({ ignore: null as any }) });
    // 验证调用 getKeys 时不会因为无效的 ignore 选项而崩溃
    // 内部逻辑应该能处理这种错误情况，例如将无效的 ignore 视为无忽略规则
    await expect(storage.getKeys()).resolves.toBeDefined();
  });
});
