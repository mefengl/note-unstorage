/**
 * 这个文件包含了针对 Capacitor Preferences 驱动的测试。
 * Capacitor Preferences API 通常用于在 Capacitor 应用（如 iOS, Android）中存储简单的键值对数据。
 * 这个测试文件巧妙地使用了 Vitest 的 mocking 功能在 Node.js 环境中模拟了 Capacitor Preferences 的行为。
 */
import { describe, vi, afterEach } from "vitest"; // 从 vitest 导入测试相关函数
// 注意：上面的 afterEach 是从 vitest 导入的，覆盖了下面从 node:test 导入的 afterEach。
// 这可能是原始代码的一个小疏忽，但我们会遵循 vitest 的方式。
import driver from "../../src/drivers/capacitor-preferences"; // 导入 Capacitor Preferences 驱动实现
import { testDriver } from "./utils"; // 导入通用测试运行器
// import { afterEach } from "node:test"; // 这个导入实际上被 vitest 的 afterEach 覆盖了

// 使用 vi.mock 来模拟 '@capacitor/preferences' 模块。
// 这意味着任何尝试导入 '@capacitor/preferences' 的代码实际上会得到我们下面定义的模拟对象。
vi.mock("@capacitor/preferences", () => {
  // 创建一个内存中的 Map 来模拟 Preferences 存储。
  // 所有的 get, set, remove, clear 操作都将在这个 Map 上进行。
  const data = new Map<string, string>();

  // 模拟 Preferences.keys() 方法：返回 Map 中所有 key 组成的数组。
  const keys = vi.fn(() => Promise.resolve({ keys: [...data.keys()] }));
  // 模拟 Preferences.get() 方法：根据 key 从 Map 中获取 value，如果不存在则返回 null。
  const get = vi.fn(({ key }) =>
    Promise.resolve({ value: data.get(key) ?? null })
  );
  // 模拟 Preferences.set() 方法：将键值对存入 Map。
  const set = vi.fn(({ key, value }) => Promise.resolve(data.set(key, value)));
  // 模拟 Preferences.remove() 方法：从 Map 中删除指定的 key。
  const remove = vi.fn(({ key }) => Promise.resolve(data.delete(key)));
  // 模拟 Preferences.clear() 方法：清空整个 Map。
  const clear = vi.fn(() => Promise.resolve(data.clear()));

  // 返回模拟的 Preferences 对象结构。
  return {
    Preferences: {
      keys,
      get,
      set,
      remove,
      clear,
    },
  };
});

// 定义测试套件
describe("drivers: capacitor-preferences", () => {
  // 在每个测试用例（由 testDriver 内部生成）之后运行
  afterEach(() => {
    // 重置所有 mock 函数的调用记录（例如调用次数、参数等）。
    // 这有助于确保每个测试用例都在干净的 mock 状态下开始。
    // 注意：这不会清空上面模拟的 `data` Map，数据的清理由 `testDriver` 中的 clear 操作负责。
    vi.resetAllMocks();
  });

  // 第一次测试：不带 base 参数
  // 这将测试驱动在默认（根）级别存储数据的行为。
  testDriver({
    driver: driver({}), // 使用默认配置实例化驱动
  });

  // 第二次测试：带 base 参数
  // 这将测试驱动在使用指定前缀（命名空间）存储数据的行为。
  // 所有键都会自动加上 "test:" 前缀。
  testDriver({
    driver: driver({ base: "test" }), // 使用带 base 的配置实例化驱动
  });
});
