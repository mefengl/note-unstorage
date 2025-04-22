/**
 * @file src/cli.ts
 * @description unstorage 的命令行接口 (CLI) 实现。
 *
 * 这个脚本允许用户通过命令行启动一个本地的 unstorage 服务器。
 * 服务器默认使用文件系统 (fs) 驱动，将当前目录或指定目录作为存储根目录，
 * 并通过 HTTP 端口 (默认为 8080) 提供 unstorage 的 API 访问。
 *
 * 主要依赖：
 * - `citty`: 用于创建和管理命令行应用程序。
 * - `listhen`: 用于方便地启动和管理 HTTP 监听器。
 * - `node:path`: Node.js 内置模块，用于处理文件路径。
 *
 * 功能：
 * - 定义 `unstorage` 命令。
 * - 接受 `--dir` 参数或位置参数来指定根目录。
 * - 创建一个基于文件系统的 unstorage 实例。
 * - 创建一个 unstorage HTTP 服务器实例。
 * - 在指定端口 (默认 8080) 启动服务器并监听请求。
 *
 * 使用示例：
 * `npx unstorage .` 或 `npx unstorage --dir /path/to/your/data`
 */

// 从 Node.js 导入路径处理函数
import { resolve } from "node:path";
// 从 citty 导入定义命令和运行主函数的工具
import { defineCommand, runMain } from "citty";
// 从 listhen 导入启动 HTTP 监听器的函数
import { listen } from "listhen";
// 导入 unstorage 的核心创建函数
import { createStorage } from "./storage";
// 导入创建 unstorage 服务器的函数
import { createStorageServer } from "./server";
// 导入文件系统驱动
import fsDriver from "./drivers/fs";

// 使用 citty 定义主命令
const main = defineCommand({
  // 命令的元数据
  meta: {
    name: "unstorage", // 命令名称
    description: "Unstorage CLI", // 命令描述
  },
  // 定义命令接受的参数
  args: {
    // `--dir` 选项参数
    dir: {
      type: "string", // 参数类型为字符串
      description: "project root directory", // 参数描述：项目根目录
    },
    // `_dir` 位置参数 (例如 `unstorage .`)
    _dir: {
      type: "positional", // 参数类型为位置参数
      default: ".", // 默认值为当前目录 "."
      description: "project root directory (prefer using `--dir`)", // 描述，并建议优先使用 --dir
    },
  },
  // 命令的执行逻辑
  async run(args) {
    // 解析并规范化根目录路径
    // 优先使用 --dir 参数，否则使用位置参数
    const rootDir = resolve(args.args.dir || args.args._dir);

    // 创建 unstorage 实例
    const storage = createStorage({
      // 配置驱动为文件系统驱动
      driver: fsDriver({ base: rootDir }), // 将解析后的根目录传递给 fs 驱动
    });

    // 基于创建的 storage 实例创建 HTTP 服务器
    const storageServer = createStorageServer(storage);

    // 使用 listhen 启动 HTTP 服务器并监听端口
    await listen(storageServer.handle, { // 传入服务器的请求处理函数
      name: "unstorage server", // 服务器名称，用于日志输出
      port: 8080, // 监听的端口号
    });
  },
});

// 使用 citty 运行定义的主命令
runMain(main);
