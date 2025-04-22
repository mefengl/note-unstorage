/**
 * 这个文件包含了针对 Azure App Configuration 驱动的测试。
 * 它使用了来自 `./utils` 的通用 `testDriver` 函数来执行标准化的存储操作测试。
 */
import { describe } from "vitest";
import driver from "../../src/drivers/azure-app-configuration"; // 导入 Azure App Configuration 驱动实现
import { testDriver } from "./utils"; // 导入通用测试运行器

// 使用 describe.skip 来定义测试套件，这意味着这个套件目前被跳过，不会执行。
// 跳过的原因可能是：
// 1. 需要特定的 Azure 凭据或环境配置才能运行。
// 2. 该驱动或测试本身可能仍在开发中或存在已知问题。
describe.skip("drivers: azure-app-configuration", () => {
  // 调用 testDriver 函数，并传入 Azure App Configuration 驱动的具体配置
  testDriver({
    // 实例化 Azure App Configuration 驱动
    driver: driver({
      // Azure App Configuration 实例的名称 (需要替换为实际名称)
      appConfigName: "unstoragetest", // 示例名称，实际测试时需要有效名称和凭据
      // 配置项的标签，用于区分不同的环境或版本 (例如 'dev', 'prod')
      label: "dev",
      // 键的前缀，用于在此 App Configuration 实例中隔离 unstorage 的数据
      prefix: "app01",
    }),
    // 这里可以添加特定于 Azure App Configuration 驱动的额外测试（如果需要）
    // additionalTests: (ctx) => { /* ... */ }
  });
});
