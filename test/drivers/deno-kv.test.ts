// 从 Node.js 的 'url' 模块导入 fileURLToPath，用于将文件 URL 转换为系统路径。
import { fileURLToPath } from "node:url";
// 从 Node.js 的 'child_process' 模块导入 exec (异步执行命令) 和 execSync (同步执行命令)。
// 还导入了 ChildProcess 类型，用于表示子进程对象。
import { exec, execSync, type ChildProcess } from "node:child_process";
// 从 'vitest' 导入测试相关函数。
import { describe, beforeAll, afterAll } from "vitest";
// 从 'get-port-please' 导入 getRandomPort (获取随机可用端口) 和 waitForPort (等待端口变为可用状态)。
import { getRandomPort, waitForPort } from "get-port-please";
// 导入 unstorage 的 HTTP 驱动。这个驱动通过 HTTP 请求与远程存储服务交互。
import httpDriver from "../../src/drivers/http.ts";
// 导入通用的驱动测试工具。
import { testDriver } from "./utils";

// 检查当前系统是否安装了 Deno。
let hasDeno: boolean;
// 使用 try...catch 块来执行命令。
// prettier-ignore 指示 Prettier 不要格式化下一行代码。
try {
  // 同步执行 'deno --version' 命令。
  // stdio: 'ignore' 表示忽略命令的输出，我们只关心它是否成功执行。
  execSync("deno --version", { stdio: "ignore" });
  // 如果命令成功执行（没有抛出错误），说明系统安装了 Deno。
  hasDeno = true;
} catch {
  // 如果命令执行失败（抛出错误），说明系统没有安装 Deno。
  hasDeno = false;
}

// 定义测试组，但使用 describe.skipIf 根据 hasDeno 的值决定是否跳过。
// 如果系统没有安装 Deno (hasDeno 为 false)，则跳过整个测试组。
describe.skipIf(!hasDeno)("drivers: deno-kv", async () => {
  // 声明一个变量来持有 Deno 子进程对象。
  let denoProcess: ChildProcess;
  // 获取一个随机的可用端口号，用于启动 Deno 的 HTTP 服务。
  const randomPort = await getRandomPort();

  // 在当前测试组的所有测试开始之前执行一次。
  beforeAll(async () => {
    // 获取辅助脚本 'deno-kv.fixture.ts' 的绝对路径。
    // import.meta.url 是当前模块的 URL，结合相对路径找到 fixture 文件。
    const fixtureFile = fileURLToPath(
      new URL("deno-kv.fixture.ts", import.meta.url)
    );
    // 异步执行 Deno 命令来运行 fixture 脚本。
    // 'deno run': 运行 Deno 脚本。
    // '--unstable-kv': 启用 Deno 的不稳定 KV API。
    // '--unstable-sloppy-imports': 启用一些不稳定的导入特性（可能 fixture 需要）。
    // '-A': 允许所有权限（比如网络、读写文件等），为了简单起见。
    // `${fixtureFile}`: 要运行的脚本路径。
    denoProcess = exec(
      `deno run --unstable-kv --unstable-sloppy-imports -A ${fixtureFile}`,
      {
        // 设置环境变量，传递给 Deno 子进程。
        env: {
          ...process.env, // 继承当前 Node.js 进程的环境变量。
          PORT: randomPort.toString(), // 将随机端口号通过 PORT 环境变量传递给 Deno 脚本。
        },
      }
    );
    // 等待 Deno 子进程启动的 HTTP 服务在指定端口上就绪。
    // 设置 host 为 '0.0.0.0' 通常表示监听所有网络接口。
    await waitForPort(randomPort, { host: "0.0.0.0" });
    // 到这里，Deno KV 的 HTTP 服务应该已经启动并监听在 randomPort 上了。
  });

  // 在当前测试组的所有测试结束之后执行一次。
  afterAll(() => {
    // 强制终止 Deno 子进程。
    // kill(9) 发送 SIGKILL 信号，确保进程被立即杀死。
    denoProcess.kill(9);
  });

  // 使用通用的 testDriver 运行测试。
  testDriver({
    // 这次我们使用的是 httpDriver。
    driver: httpDriver({
      // 配置 httpDriver 的 base URL，指向我们刚刚启动的 Deno 进程提供的 HTTP 服务。
      base: `http://localhost:${randomPort}`,
    }),
    // 没有额外的测试，只运行标准测试套件。
    // 这些标准测试会通过 HTTP 请求发送到 Deno 服务，
    // Deno 服务再调用原生的 Deno KV API 来执行操作，并将结果通过 HTTP 返回。
    // 这样就间接测试了 unstorage 与 Deno KV 的兼容性。
  });
});
