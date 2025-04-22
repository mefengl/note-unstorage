/**
 * 这个文件包含了针对 Azure Key Vault 驱动的测试。
 * Azure Key Vault 用于安全地存储和管理密钥、证书和连接字符串等敏感信息。
 * 这个驱动允许 unstorage 将 Key Vault 作为其存储后端之一。
 * 测试同样使用了 `./utils` 中的通用 `testDriver` 函数。
 */
import { describe } from "vitest";
import driver from "../../src/drivers/azure-key-vault"; // 导入 Azure Key Vault 驱动实现
import { testDriver } from "./utils"; // 导入通用测试运行器

// 使用 describe.skip 来定义测试套件，表示此测试套件默认被跳过。
// 跳过的原因主要是：
// 1. 需要有效的 Azure 凭据来访问 Key Vault。
// 2. 需要一个名为 'testunstoragevault' 的实际 Key Vault 实例（或在运行时提供有效的 vaultName）。
// 3. Azure Key Vault 的操作（特别是删除和清除后的重建）可能有延迟。
describe.skip(
  "drivers: azure-key-vault", // 测试套件名称
  () => {
    // 调用通用测试运行器
    testDriver({
      // 实例化 Azure Key Vault 驱动
      driver: driver({
        // 指定要连接的 Azure Key Vault 的名称。
        // 'testunstoragevault' 是一个示例名称，实际测试时需要替换为有效的 Key Vault 名称，
        // 并且运行测试的环境需要有访问该 Key Vault 的权限（通常通过 DefaultAzureCredential 或类似方式认证）。
        vaultName: "testunstoragevault",
      }),
      // 这里可以添加特定于 Azure Key Vault 驱动的额外测试（如果需要）
      // additionalTests: (ctx) => { /* ... */ }
    });
  },
  // 为这个测试套件设置特定的超时时间（80000毫秒 = 80秒）
  {
    timeout: 80_000,
  }
  // 增加超时的原因（根据原始注释）：
  // Azure Key Vault 在删除一个密钥（Secret）后，需要一段时间来彻底清除（purge）它。
  // 在清除完成之前，无法创建同名的密钥。
  // 测试过程中可能会频繁地创建、删除、再创建同名项（例如在 afterEach 的 clear 操作之后），
  // 因此需要更长的超时时间来等待 Azure 完成清除操作，避免测试因超时而失败。
);
