import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import driver from "../../src/drivers/session-storage";
import { testDriver } from "./utils";

describe("drivers: session-storage", () => {
  // --- JSDOM Setup ---
  // sessionStorage 是浏览器窗口 (window) 提供的一个功能，它允许网页在浏览器会话期间存储数据。
  // 但是，我们的测试是在 Node.js 环境（没有浏览器窗口）下运行的。
  // 为了测试 sessionStorage 驱动，我们需要模拟一个浏览器环境。
  // JSDOM 就是一个工具，它可以在 Node.js 中创建一个模拟的浏览器环境，包括 window 对象和 sessionStorage。
  const jsdom = new JSDOM("", {
    url: "http://localhost", // 提供一个 URL，就像在真实浏览器中一样
  });
  // 将 JSDOM 产生的虚拟控制台输出连接到我们的实际控制台，方便调试
  jsdom.virtualConsole.sendTo(console);

  testDriver({
    // 将模拟的 window 对象传递给驱动程序
    // `as unknown as typeof window` 是 TypeScript 的类型转换，告诉编译器我们确定这个模拟对象可以当作真实的 window 类型使用
    driver: driver({ window: jsdom.window as unknown as typeof window }),
    additionalTests: (ctx) => {
      // 这个测试检查我们通过 unstorage 的 setItem 设置的数据，
      // 是否真的被写入了模拟的 sessionStorage 中。
      it("check session storage", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        // 直接访问模拟的 window.sessionStorage 来验证
        expect(jsdom.window.sessionStorage.getItem("s1:a")).toBe("test_data");
      });

      // 这个测试检查 unstorage 的 watch 功能是否能监听到 sessionStorage 的变化。
      it("watch session storage", async () => {
        // 创建一个模拟函数 (spy)，用于记录 watch 是否被调用以及调用时的参数
        const watcher = vi.fn();
        // 启动监听
        await ctx.storage.watch(watcher);

        // --- 模拟浏览器存储事件 ---
        // 在真实的浏览器中，当 sessionStorage 中的数据发生变化时（通常是由另一个标签页或窗口修改），
        // 浏览器会自动触发一个 'storage' 事件。
        // 由于我们是在模拟环境中，需要手动创建并触发这个事件，来测试我们的 watch 功能是否能正确响应。

        // 1. 创建一个 'storage' 事件对象
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true, true); // 初始化事件类型为 'storage'

        // 2. 设置事件的属性，模拟真实事件包含的信息
        // @ts-ignore - 告诉 TypeScript 编译器忽略下一行的类型检查，因为我们正在动态添加属性
        ev.key = "s1:random_file"; // 被修改的 sessionStorage 的键 (key)
        // @ts-ignore
        ev.newValue = "random"; // 修改后的新值

        // 3. 在模拟的 window 上触发 (dispatch) 这个事件
        jsdom.window.dispatchEvent(ev);

        // --- 验证监听器 --- 
        // 检查我们的模拟函数 watcher 是否被调用了，
        // 并且参数是否符合预期 (事件类型 'update' 和被修改的键 's1:random_file')
        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
      });

      // 这个测试检查 unwatch 功能是否能成功停止监听。
      it("unwatch session storage", async () => {
        const watcher = vi.fn();
        // 启动监听，并获取停止监听的函数 unwatch
        const unwatch = await ctx.storage.watch(watcher);

        // --- 模拟第一个存储事件 ---
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true, true);
        // @ts-ignore
        ev.key = "s1:random_file";
        // @ts-ignore
        ev.newValue = "random";
        
        // --- 模拟第二个存储事件 (不同的 key) ---
        const ev2 = jsdom.window.document.createEvent("CustomEvent");
        ev2.initEvent("storage", true, true);
        // @ts-ignore
        ev2.key = "s1:random_file2";
        // @ts-ignore
        ev2.newValue = "random";

        // 触发第一个事件 (此时应该被监听到)
        jsdom.window.dispatchEvent(ev);

        // 调用 unwatch 停止监听
        await unwatch();

        // 触发第二个事件 (此时不应该被监听到)
        jsdom.window.dispatchEvent(ev2);

        // --- 验证监听器 ---
        // 确认 watcher 只被第一个事件触发了一次
        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
        expect(watcher).toHaveBeenCalledTimes(1);
      });
    },
  });
});
