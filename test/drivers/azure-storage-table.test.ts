/**
 * 这个文件包含了针对 Azure Storage Table 驱动的测试。
 * Azure Storage Table 是一种 NoSQL 键/属性存储服务。
 * 这个驱动使得 unstorage 可以使用 Azure Table Storage 作为其存储后端。
 * 测试利用了 `./utils` 中的通用 `testDriver` 函数，并通过 Azurite 进行本地模拟。
 */
import { describe, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-table"; // 导入 Azure Storage Table 驱动实现
import { testDriver } from "./utils"; // 导入通用测试运行器
import { TableClient } from "@azure/data-tables"; // 导入 Azure Data Tables SDK 客户端
import { ChildProcess, exec } from "node:child_process"; // 导入用于执行子进程的 Node.js 模块

// 使用 describe.skip 来定义测试套件，表示此测试套件默认被跳过。
// 跳过的原因可能包括：
// 1. 需要本地安装和运行 Azurite Table 模拟器 (`npx azurite-table`)。
// 2. 依赖特定的本地环境或端口。
describe.skip("drivers: azure-storage-table", () => {
  let azuriteProcess: ChildProcess; // 用于存储 Azurite 子进程的引用

  // 在该 describe 块的所有测试开始前执行
  beforeAll(async () => {
    // 使用 exec 启动 Azurite Table 存储模拟器进程
    // `--silent` 参数抑制 Azurite 的启动日志
    azuriteProcess = exec("npx azurite-table --silent");

    // 等待 Azurite 启动 (这里同样没有显式等待，实践中可能需要)

    // 使用本地开发存储的连接字符串和表名 'unstorage' 创建 TableClient 实例
    const client = TableClient.fromConnectionString(
      "UseDevelopmentStorage=true", // 指向本地 Azurite
      "unstorage" // 指定要操作的表名
    );

    // 尝试创建名为 'unstorage' 的表
    // 注意：如果表已存在，此操作通常会成功完成而不会报错，但具体行为可能依赖 SDK 版本。
    // 更好的做法可能是先 deleteIfExists 再 createTable，确保测试环境干净。
    await client.createTable();
  });

  // 在该 describe 块的所有测试结束后执行
  afterAll(() => {
    // 强制终止 Azurite 进程
    azuriteProcess.kill(9);
  });

  // 调用通用测试运行器来执行标准测试
  testDriver({
    // 实例化 Azure Storage Table 驱动
    driver: driver({
      // 使用本地开发存储连接字符串
      connectionString: "UseDevelopmentStorage=true",
      // accountName 在使用本地开发存储时通常不是必需的，但这里提供作为配置项。
      accountName: "local",
      // 可以显式指定 tableName: 'unstorage'，但驱动实现可能默认使用 'unstorage' 或允许不指定。
    }),
    // 这里可以添加特定于 Azure Storage Table 驱动的额外测试（如果需要）
    // additionalTests: (ctx) => { /* ... */ }
  });
});
