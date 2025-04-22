// 导入 Vitest 的测试函数。
import { it, describe, expect } from "vitest";
// 导入我们要测试的 lru-cache 驱动。
import driver from "../../src/drivers/lru-cache";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";

// 定义第一个测试组：测试 lru-cache 驱动的默认行为。
describe("drivers: lru-cache", () => {
  // 使用通用测试工具 testDriver 运行标准的 unstorage 驱动测试套件。
  // 这里传入 lru-cache 驱动的实例，使用默认配置。
  // 默认配置下，缓存大小和条目大小可能没有严格限制（或者由底层 lru-cache 库决定）。
  testDriver({
    driver: driver({}), // 使用空对象表示默认配置
  });
});

// 定义第二个测试组：测试 lru-cache 驱动带有条目大小限制 (maxEntrySize) 的行为。
describe("drivers: lru-cache with size", () => {
  // 使用通用测试工具 testDriver 运行测试。
  testDriver({
    // 提供 lru-cache 驱动实例，并配置 maxEntrySize。
    driver: driver({
      // 指定单个缓存条目的最大允许大小 (单位可能是字节)。
      // 这里设置为 50。
      maxEntrySize: 50,
    }),
    // 添加针对此特定配置的额外测试。
    additionalTests(ctx) {
      // 测试用例：验证缓存是否会拒绝存储过大的条目。
      it("should not store large items", async () => {
        // 尝试存储一个长度远超 maxEntrySize (50) 的字符串。
        // setItem 通常会对值进行序列化（如转为字符串或 JSON），
        // 驱动内部会计算序列化后的大小。
        await ctx.storage.setItem(
          "big",
          "0123456789012345678901234567890123456789012345678901234567890123456789" // 长度 70
        );
        // 断言：由于条目过大，预期它没有被存入缓存，因此 getItem 返回 null。
        expect(await ctx.storage.getItem("big")).toBe(null);

        // 尝试使用 setItemRaw 存储一个大的 Buffer 对象。
        // setItemRaw 会尝试存储原始值，驱动需要能计算 Buffer 的大小。
        await ctx.storage.setItemRaw("bigBuff", Buffer.alloc(100)); // 创建一个 100 字节的 Buffer
        // 断言：由于 Buffer 大小 (100) 超过 maxEntrySize (50)，预期它没有被存储。
        // getItemRaw 应该返回 null。
        expect(await ctx.storage.getItemRaw("bigBuff")).toBe(null);
      });
    },
  });
});
