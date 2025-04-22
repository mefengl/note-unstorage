// 导入 Vitest 的 describe 函数，用于组织测试用例。
import { describe } from "vitest";
// 导入我们要测试的 memory 驱动。
// memory 驱动是一种简单的内存存储，数据只存在于当前进程的内存中，进程退出后数据丢失。
import driver from "../../src/drivers/memory";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";

// 定义测试组，专门测试 memory 驱动。
describe("drivers: memory", () => {
  // 使用通用测试工具 testDriver 运行标准的 unstorage 驱动测试套件。
  // 这个套件包含了一系列通用的测试用例，比如 setItem, getItem, removeItem, getKeys 等。
  // 这里传入 memory 驱动的实例。
  // driver() 创建了一个新的、空的内存存储实例。
  // 由于 memory 驱动非常基础，通常不需要额外的配置或特定的测试用例，
  // 所以这里只运行标准的测试套件。
  testDriver({
    driver: driver(), // 创建并传入 memory 驱动实例
  });
});
