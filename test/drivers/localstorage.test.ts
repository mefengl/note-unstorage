// 导入 Vitest 的测试函数和模拟功能。
import { describe, it, expect, vi } from "vitest";
// 导入我们要测试的 localstorage 驱动。
import driver from "../../src/drivers/localstorage";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";
// 导入 JSDOM 用于在 Node.js 环境中模拟浏览器 DOM 和 localStorage。
import { JSDOM } from "jsdom";

// 定义测试组，专门测试 localstorage 驱动。
describe("drivers: localstorage", () => {
  // 1. 设置 JSDOM 环境。
  // 创建一个 JSDOM 实例，提供一个空的 HTML 字符串和基础 URL。
  const jsdom = new JSDOM("", {
    url: "http://localhost", // URL 对于 localStorage 是必需的，因为它与源相关联。
  });
  // 将 JSDOM 的虚拟控制台输出重定向到 Node.js 的控制台，方便调试。
  jsdom.virtualConsole.sendTo(console);

  // 2. 在模拟的 localStorage 中预设一些数据。
  // 这用于测试 clear 操作是否会影响到不属于 unstorage 管理的数据。
  jsdom.window.localStorage.setItem("__external_key__", "unrelated_data");

  // 3. 运行标准的驱动测试套件。
  testDriver({
    // 提供 localstorage 驱动实例。
    driver: driver({
      // 传入 JSDOM 创建的 window 对象。
      // 需要类型断言，因为 JSDOM 的 window 类型与全局 window 类型略有不同。
      window: jsdom.window as unknown as typeof window,
      // 指定一个基础前缀 'test'。
      // 所有 key 在存入 localStorage 时都会加上 'test:' 前缀。
      base: "test",
    }),
    // 4. 添加针对 localstorage 驱动的额外测试。
    additionalTests: (ctx) => {
      // 测试用例：检查数据是否正确写入模拟的 localStorage。
      it("检查 localstorage", async () => {
        // 使用 unstorage API 写入数据，key 是 's1:a'。
        await ctx.storage.setItem("s1:a", "test_data");
        // 直接检查模拟的 localStorage，key 应该是 'test:s1:a' (带 base 前缀)。
        expect(jsdom.window.localStorage.getItem("test:s1:a")).toBe(
          "test_data"
        );
        // 调用驱动的 clear 方法 (假设存在并清空带 base 前缀的数据)。
        // 注意：clear! 可能表示这是一个可选或扩展的方法。
        await ctx.driver.clear!("", {}); // 第一个参数通常是前缀，空字符串可能表示清除所有 base 下的数据
        // 再次检查预设的外部 key，它不应该被 clear 操作影响。
        expect(jsdom.window.localStorage.getItem("__external_key__")).toBe(
          "unrelated_data"
        );
      });

      // 测试用例：检查 watch 功能是否能监听到 localStorage 的变化。
      it("监听 localstorage", async () => {
        // 创建一个模拟函数作为 watcher 回调。
        const watcher = vi.fn();
        // 启动 unstorage 的 watch 功能。
        await ctx.storage.watch(watcher);

        // 模拟浏览器中的 localStorage 变化事件。
        // 当其他标签页或窗口修改 localStorage 时，浏览器会触发 'storage' 事件。
        // JSDOM 不会自动触发这个事件，所以需要手动模拟。

        // 错误模拟: 直接用 setItem 不会触发 JSDOM 中的事件。
        // jsdom.window.localStorage.setItem('s1:random_file', 'random')

        // 正确模拟：创建并分发 'storage' 事件。
        const ev = jsdom.window.document.createEvent("CustomEvent"); // 使用 CustomEvent
        ev.initEvent("storage", true, true); // 初始化事件类型为 'storage'
        // 设置事件的关键属性 (这些属性在真实的 StorageEvent 中存在)。
        // @ts-ignore 强制设置属性，因为类型定义可能不匹配。
        ev.key = "test:s1:random_file"; // 触发事件的 key (需要包含 base 前缀)
        // @ts-ignore
        ev.newValue = "random"; // 新的值
        // 在 window 对象上分发事件。
        jsdom.window.dispatchEvent(ev);

        // 断言：watcher 函数应该被调用，参数为 'update' 和原始 key 's1:random_file'。
        // 驱动内部应该处理了 base 前缀。
        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
      });

      // 测试用例：检查 unwatch 功能是否能停止监听。
      it("停止监听 localstorage", async () => {
        const watcher = vi.fn();
        // 启动监听，并获取 unwatch 函数。
        const unwatch = await ctx.storage.watch(watcher);

        // 模拟第一个 storage 事件。
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true, true);
        // @ts-ignore
        ev.key = "test:s1:random_file";
        // @ts-ignore
        ev.newValue = "random";
        // 模拟第二个 storage 事件。
        const ev2 = jsdom.window.document.createEvent("CustomEvent");
        ev2.initEvent("storage", true, true);
        // @ts-ignore
        ev2.key = "test:s1:random_file2";
        // @ts-ignore
        ev2.newValue = "random";

        // 分发第一个事件。
        jsdom.window.dispatchEvent(ev);

        // 调用 unwatch 函数停止监听。
        await unwatch();

        // 分发第二个事件。
        jsdom.window.dispatchEvent(ev2);

        // 断言：watcher 应该只被第一个事件调用过一次。
        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
        expect(watcher).toHaveBeenCalledTimes(1);
      });
    },
  });
});
