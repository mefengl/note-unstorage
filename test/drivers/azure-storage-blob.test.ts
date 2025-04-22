/**
 * 这个文件包含了针对 Azure Storage Blob 驱动的测试。
 * 它使用了 `./utils` 中的通用 `testDriver` 函数，并利用 Azurite（Azure Storage 模拟器）
 * 在本地环境中模拟 Blob Storage 服务来进行测试。
 */
import { describe, beforeAll, afterAll } from "vitest";
import driver from "../../src/drivers/azure-storage-blob"; // 导入 Azure Storage Blob 驱动实现
import { testDriver } from "./utils"; // 导入通用测试运行器
import { BlobServiceClient } from "@azure/storage-blob"; // 导入 Azure Storage Blob SDK 客户端
import { ChildProcess, exec } from "node:child_process"; // 导入用于执行子进程的 Node.js 模块

// 使用 describe.skip 来定义测试套件，表示此测试套件默认被跳过。
// 原因可能包括：
// 1. 需要本地安装和运行 Azurite (`npx azurite-blob`)。
// 2. 依赖于特定的本地环境或端口。
describe.skip("drivers: azure-storage-blob", () => {
  let azuriteProcess: ChildProcess; // 用于存储 Azurite 子进程的引用

  // 在该 describe 块的所有测试开始前执行
  beforeAll(async () => {
    // 使用 exec 启动 Azurite Blob 存储模拟器进程
    // `--silent` 参数抑制 Azurite 的启动日志
    azuriteProcess = exec("npx azurite-blob --silent");

    // 等待 Azurite 启动 (这里没有显式等待，但在实际场景中可能需要短暂延迟或轮询检查)

    // 使用本地开发存储的连接字符串创建 BlobServiceClient 实例
    // 这个连接字符串通常指向本地运行的 Azurite
    const client = BlobServiceClient.fromConnectionString(
      "UseDevelopmentStorage=true"
    );

    // 获取名为 'unstorage' 的容器客户端
    const containerClient = client.getContainerClient("unstorage");
    // 确保测试容器存在，如果不存在则创建
    await containerClient.createIfNotExists();
  });

  // 在该 describe 块的所有测试结束后执行
  afterAll(() => {
    // 强制终止 Azurite 进程 (使用信号 9，即 SIGKILL)
    azuriteProcess.kill(9);
  });

  // 调用通用测试运行器来执行标准测试
  testDriver({
    // 实例化 Azure Storage Blob 驱动
    driver: driver({
      // 使用本地开发存储连接字符串
      connectionString: "UseDevelopmentStorage=true",
      // 容器名称 (虽然上面创建了，但驱动内部可能也需要)
      // 注意：实际驱动实现可能只需要 connectionString，accountName 在本地模拟时通常不需要
      // 但这里提供了 'local' 作为占位符或特定配置项
      accountName: "local", // 在使用本地开发存储时，这个参数可能不是必需的
      // 也可以指定 containerName: 'unstorage'，但驱动默认可能使用 'unstorage'
    }),
    // 这里可以添加特定于 Azure Storage Blob 驱动的额外测试（如果需要）
    // additionalTests: (ctx) => { /* ... */ }
  });
});
