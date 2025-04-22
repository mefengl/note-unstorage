/**
 * 这个文件提供了一个通用的测试套件 (`testDriver`)，用于测试 unstorage 的各种驱动程序。
 * 它定义了标准的测试流程和断言，确保驱动程序符合 unstorage 的核心 API 规范。
 */
import { it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  type Storage,    // 导入 Storage 类型
  type Driver,     // 导入 Driver 类型
  createStorage,  // 导入创建存储实例的函数
  restoreSnapshot, // 导入恢复快照的函数
} from "../../src";

// 定义测试上下文接口，包含 storage 实例和 driver 实例
export interface TestContext {
  storage: Storage;
  driver: Driver;
}

// 定义测试选项接口
export interface TestOptions {
  driver: Driver | (() => Driver); // 要测试的驱动实例或返回驱动实例的工厂函数
  additionalTests?: (ctx: TestContext) => void; // 可选的、特定于驱动的额外测试
}

/**
 * 运行针对指定驱动程序的标准测试套件。
 * @param opts 测试选项，包含要测试的驱动和可选的额外测试。
 */
export function testDriver(opts: TestOptions) {
  // 初始化测试上下文对象
  const ctx = {} as TestContext;

  // 在所有测试开始前执行
  beforeAll(() => {
    // 如果传入的是工厂函数，则调用它来获取驱动实例
    ctx.driver =
      typeof opts.driver === "function" ? opts.driver() : opts.driver;

    // 使用提供的驱动创建 storage 实例
    ctx.storage = createStorage({
      driver: ctx.driver,
    });
  });

  // 在所有测试结束后执行
  afterAll(async () => {
    // 清理驱动资源（如果驱动实现了 dispose 方法）
    await ctx.driver?.dispose?.();
    // 清理 storage 实例资源（如果 storage 实现了 dispose 方法）
    await ctx.storage?.dispose?.();
  });

  // 在每个测试结束后执行
  afterEach(async () => {
    // 清空存储，确保每个测试用例都在干净的状态下运行
    await ctx.storage.clear();
  });

  // 测试初始化：恢复快照并验证
  it("init", async () => {
    await restoreSnapshot(ctx.storage, { initial: "works" });
    expect(await ctx.storage.getItem("initial")).toBe("works");
    // 清理测试数据（虽然 afterEach 也会清理，但这里显式清理更清晰）
    await ctx.storage.clear();
  });

  // 测试初始状态：确认新存储是空的
  it("initial state", async () => {
    expect(await ctx.storage.hasItem("s1:a")).toBe(false);
    expect(await ctx.storage.getItem("s2:a")).toBe(null);
    expect(await ctx.storage.getKeys()).toMatchObject([]);
  });

  // 测试 setItem：写入数据并验证
  it("setItem", async () => {
    await ctx.storage.setItem("s1:a", "test_data");
    await ctx.storage.setItem("s2:a", "test_data");
    // 测试带查询参数的键（虽然 unstorage 通常会忽略查询参数，但驱动应该能处理）
    await ctx.storage.setItem("s3:a?q=1", "test_data");
    expect(await ctx.storage.hasItem("s1:a")).toBe(true);
    expect(await ctx.storage.getItem("s1:a")).toBe("test_data");
    // 验证获取时是否忽略查询参数（根据规范，应该忽略）
    expect(await ctx.storage.getItem("s3:a?q=2")).toBe("test_data");
  });

  // 测试 getKeys：列出键并验证
  it("getKeys", async () => {
    await ctx.storage.setItem("s1:a", "test_data");
    await ctx.storage.setItem("s2:a", "test_data");
    await ctx.storage.setItem("s3:a?q=1", "test_data");
    // 获取所有键并排序比较
    expect(await ctx.storage.getKeys().then((k) => k.sort())).toMatchObject(
      ["s1:a", "s2:a", "s3:a"].sort() // 注意 's3:a?q=1' 被规范化为 's3:a'
    );
    // 获取特定前缀的键
    expect(await ctx.storage.getKeys("s1").then((k) => k.sort())).toMatchObject(
      ["s1:a"].sort()
    );
  });

  // 测试 getKeys 的 maxDepth 选项
  it("getKeys with depth", async () => {
    // 设置不同层级的键
    await ctx.storage.setItem("depth0_0", "test_data");
    await ctx.storage.setItem("depth0:depth1:depth2_0", "test_data");
    await ctx.storage.setItem("depth0:depth1:depth2_1", "test_data");
    await ctx.storage.setItem("depth0:depth1_0", "test_data");
    await ctx.storage.setItem("depth0:depth1_1", "test_data");
    // 验证 maxDepth=0 只返回根层级的键
    expect(await ctx.storage.getKeys(undefined, { maxDepth: 0 })).toMatchObject(
      ["depth0_0"]
    );
    // 验证 maxDepth=1 返回根和第一层级的键
    expect(
      (await ctx.storage.getKeys(undefined, { maxDepth: 1 })).sort()
    ).toMatchObject(["depth0:depth1_0", "depth0:depth1_1", "depth0_0"]);
    // 验证 maxDepth=2 (或更大/默认) 返回所有层级的键
    expect(
      (await ctx.storage.getKeys(undefined, { maxDepth: 2 })).sort()
    ).toMatchObject([
      "depth0:depth1:depth2_0",
      "depth0:depth1:depth2_1",
      "depth0:depth1_0",
      "depth0:depth1_1",
      "depth0_0",
    ]);
  });

  // 测试对象序列化
  it("serialize (object)", async () => {
    await ctx.storage.setItem("/data/test.json", { json: "works" });
    expect(await ctx.storage.getItem("/data/test.json")).toMatchObject({
      json: "works",
    });
  });

  // 测试原始类型序列化
  it("serialize (primitive)", async () => {
    await ctx.storage.setItem("/data/true.json", true);
    expect(await ctx.storage.getItem("/data/true.json")).toBe(true);
  });

  // 测试带有 toJSON 方法的对象的序列化（会调用 toJSON）
  it("serialize (lossy object with toJSON())", async () => {
    // 定义一个带 toJSON 方法返回字符串的类
    class Test1 {
      toJSON() {
        return "SERIALIZED";
      }
    }
    await ctx.storage.setItem("/data/serialized1.json", new Test1());
    expect(await ctx.storage.getItem("/data/serialized1.json")).toBe(
      "SERIALIZED"
    );
    // 定义一个带 toJSON 方法返回对象的类
    class Test2 {
      toJSON() {
        return { serializedObj: "works" };
      }
    }
    await ctx.storage.setItem("/data/serialized2.json", new Test2());
    expect(await ctx.storage.getItem("/data/serialized2.json")).toMatchObject({
      serializedObj: "works",
    });
  });

  // 测试无法序列化的值（非原始类型且无 toJSON）是否会抛出错误
  it("serialize (error for non primitives)", async () => {
    class Test {}
    await expect(
      ctx.storage.setItem("/data/badvalue.json", new Test())
    ).rejects.toThrow("[unstorage] Cannot stringify value!");
  });

  // 测试原始数据 (Raw) 的支持
  it("raw support", async () => {
    // 定义一个 Uint8Array 作为原始值
    const value = new Uint8Array([1, 2, 3]);
    // 使用 setItemRaw 存储
    await ctx.storage.setItemRaw("/data/raw.bin", value);
    // 使用 getItemRaw 读取
    const rValue = await ctx.storage.getItemRaw("/data/raw.bin");
    // 比较读取到的值的长度（需要处理 ArrayBuffer 和 Uint8Array 的情况）
    const rValueLen = rValue?.length || rValue?.byteLength;
    if (rValueLen !== value.length) {
      console.log("Invalid raw value length:", rValue, "Length:", rValueLen);
    }
    expect(rValueLen).toBe(value.length);
    // 比较值的 Base64 编码，确保内容一致（跨环境兼容）
    expect(Buffer.from(rValue).toString("base64")).toBe(
      Buffer.from(value).toString("base64")
    );
  });

  // --- 批量操作测试 --- //
  // 测试批量设置 setItems
  it("setItems", async () => {
    await ctx.storage.setItems([
      { key: "t:1", value: "test_data_t1" },
      { key: "t:2", value: "test_data_t2" },
      { key: "t:3", value: "test_data_t3" },
    ]);
    expect(await ctx.storage.getItem("t:1")).toBe("test_data_t1");
    expect(await ctx.storage.getItem("t:2")).toBe("test_data_t2");
    expect(await ctx.storage.getItem("t:3")).toBe("test_data_t3");
  });

  // 测试批量获取 getItems
  it("getItems", async () => {
    await ctx.storage.setItem("v1:a", "test_data_v1:a");
    await ctx.storage.setItem("v2:a", "test_data_v2:a");
    await ctx.storage.setItem("v3:a?q=1", "test_data_v3:a?q=1");

    // 测试传入不同格式的键（对象、字符串）
    expect(
      await ctx.storage.getItems([{ key: "v1:a" }, "v2:a", { key: "v3:a?q=1" }])
    ).toMatchObject([
      {
        key: "v1:a",
        value: "test_data_v1:a",
      },
      {
        key: "v2:a",
        value: "test_data_v2:a",
      },
      {
        key: "v3:a", // 验证键是否被规范化（移除了查询参数）
        value: "test_data_v3:a?q=1", // 值保持不变
      },
    ]);
  });

  // 测试 getItem 是否能正确返回假值（falsy values）
  it("getItem - return falsy values when set in storage", async () => {
    await ctx.storage.setItem("zero", 0);
    expect(await ctx.storage.getItem("zero")).toBe(0);

    await ctx.storage.setItem("my-false-flag", false);
    expect(await ctx.storage.getItem("my-false-flag")).toBe(false);
  });

  // 如果定义了额外的测试，在这里运行它们
  // TODO: 将这部分移到清理测试之后可能更合理
  if (opts.additionalTests) {
    opts.additionalTests(ctx);
  }

  // 测试 removeItem：删除数据并验证
  it("removeItem", async () => {
    // 先确保数据存在（如果不存在，removeItem 可能行为不同）
    await ctx.storage.setItem("s1:a", "data");
    await ctx.storage.removeItem("s1:a"); // 默认第二个参数为 true (strict)
    expect(await ctx.storage.hasItem("s1:a")).toBe(false);
    expect(await ctx.storage.getItem("s1:a")).toBe(null);
    
    // 测试非严格模式（即使键不存在也不报错）
    await ctx.storage.removeItem("s1:nonexistent", false);
  });

  // 测试 clear：清空存储并验证
  it("clear", async () => {
    await ctx.storage.setItem("s1:a", "test_data");
    await ctx.storage.setItem("s2:a", "test_data");
    await ctx.storage.clear();
    expect(await ctx.storage.getKeys()).toMatchObject([]);
  });
}
