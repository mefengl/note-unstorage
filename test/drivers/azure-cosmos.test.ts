/**
 * 这个文件包含了针对 Azure Cosmos DB 驱动的测试。
 * 它使用了 `./utils` 中的通用 `testDriver` 函数来执行标准化的存储操作测试。
 */
import { describe } from "vitest";
import driver from "../../src/drivers/azure-cosmos"; // 导入 Azure Cosmos DB 驱动实现
import { testDriver } from "./utils"; // 导入通用测试运行器

// 使用 describe.skip 来定义测试套件，表示此测试套件默认被跳过。
// 跳过的主要原因是它需要真实的 Azure Cosmos DB 凭据才能连接和操作数据库。
// 这些凭据通常通过环境变量或其他安全方式提供，而不是硬编码在代码中。
describe.skip("drivers: azure-cosmos", () => {
  // 调用通用测试运行器
  testDriver({
    // 实例化 Azure Cosmos DB 驱动
    driver: driver({
      // Azure Cosmos DB 实例的端点 URL。
      // "COSMOS_DB_ENDPOINT" 是一个占位符，实际运行时需要替换为真实的端点 URL。
      // 通常会从环境变量 process.env.COSMOS_DB_ENDPOINT 获取。
      endpoint: "COSMOS_DB_ENDPOINT",
      // 用于访问 Azure Cosmos DB 实例的账户密钥。
      // "COSMOS_DB_KEY" 是一个占位符，实际运行时需要替换为真实的账户密钥。
      // 通常会从环境变量 process.env.COSMOS_DB_KEY 获取。
      accountKey: "COSMOS_DB_KEY",
      // 其他可选配置，如 databaseId, containerId 等，如果未提供，驱动可能有默认值。
    }),
    // 这里可以添加特定于 Azure Cosmos DB 驱动的额外测试（如果需要）
    // additionalTests: (ctx) => { /* ... */ }
  });
});
