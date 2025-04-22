/**
 * @file build.config.ts
 * @description unstorage 项目的构建配置文件。
 *
 * 这个文件定义了如何使用 unbuild 工具来构建 unstorage 库。
 * unbuild 会根据这里的配置，将 TypeScript 源代码编译成可在不同环境 (如 Node.js, 浏览器)
 * 使用的 JavaScript 文件 (包括 CommonJS 和 ES Modules 格式)，并生成类型声明文件 (.d.ts)。
 *
 * 主要配置项：
 * - declaration: 是否生成类型声明文件。
 * - rollup.emitCJS: 是否同时生成 CommonJS 格式的文件。
 * - entries: 定义构建的入口点和输出规则。
 * - externals: 定义哪些依赖项不应被打包进最终的构建产物中。
 */

// 导入 unbuild 的配置定义函数
import { defineBuildConfig } from "unbuild";

// 导出构建配置对象
export default defineBuildConfig({
  // declaration: 生成 TypeScript 类型声明文件 (.d.ts)
  // 这对于库的使用者来说非常重要，可以提供类型检查和代码提示。
  declaration: true,

  // rollup: Rollup 构建工具的特定配置
  rollup: {
    // emitCJS: 除了默认的 ES Modules (ESM) 格式外，
    // 是否也要生成 CommonJS (CJS) 格式的文件。
    // 这有助于库在只支持 CommonJS 的旧版 Node.js 环境中使用。
    emitCJS: true,
  },

  // entries: 定义构建的入口点
  // unbuild 会为每个入口点生成对应的输出文件。
  entries: [
    // 1. 主入口点：src/index.ts
    // 会生成 index.mjs (ESM) 和 index.cjs (CJS) 以及 index.d.ts
    "src/index",

    // 2. 服务器入口点：src/server.ts
    // 会生成 server.mjs (ESM) 和 server.cjs (CJS) 以及 server.d.ts
    "src/server",

    // 3. 驱动入口点 (ESM 格式)
    {
      // input: 指定驱动源文件目录
      input: "src/drivers/",
      // outDir: 指定输出目录为 'drivers'
      // 会将 src/drivers/ 下的每个驱动文件 (如 fs.ts) 构建到 drivers/ 目录下
      // 例如：drivers/fs.mjs, drivers/http.mjs 等
      outDir: "drivers",
      // format: 指定输出格式为 ES Modules
      format: "esm",
      // declaration: true (默认) 会为每个驱动生成 .d.ts 文件，例如 drivers/fs.d.ts
    },

    // 4. 驱动入口点 (CJS 格式)
    {
      // input: 同样指定驱动源文件目录
      input: "src/drivers/",
      // outDir: 输出目录同样为 'drivers'
      outDir: "drivers",
      // format: 指定输出格式为 CommonJS
      format: "cjs",
      // ext: 指定 CJS 文件的扩展名为 .cjs
      // 例如：drivers/fs.cjs, drivers/http.cjs 等
      ext: "cjs",
      // declaration: false - 对于 CJS 格式，不需要重复生成 .d.ts 文件，
      // 因为 ESM 入口已经生成了。
      declaration: false,
    },
  ],

  // externals: 定义外部依赖
  // 这些依赖项不会被打包进最终的构建产物，而是期望由使用者环境提供。
  externals: [
    // "mongodb": 如果驱动中使用了 mongodb，不要将其打包，使用者应自行安装。
    "mongodb",
    // "unstorage": 核心库本身，通常作为 peer dependency，不应被打包。
    "unstorage",
    // /unstorage\/drivers\//: 匹配所有从 'unstorage/drivers/' 导入的路径。
    // 这可以防止驱动之间互相打包，或者核心库打包驱动代码。
    /unstorage\/drivers\//,
  ],
});
