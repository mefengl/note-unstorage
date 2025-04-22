# 代码阅读推荐顺序

建议按以下顺序阅读代码，以理解项目结构和核心功能：

1. **核心类型与接口**:
    * [`src/types.ts`](./src/types.ts) - 定义项目中使用到的主要类型和接口。
2. **核心存储逻辑**:
    * [`src/storage.ts`](./src/storage.ts) - 实现核心的 `Storage` 类，包含挂载驱动、基本 K/V 操作等。
3. **通用工具函数**:
    * [`src/utils.ts`](./src/utils.ts) - 提供各种辅助函数，如序列化、路径处理等。
    * [`src/_utils.ts`](./src/_utils.ts) - 内部使用的工具函数。
4. **入口与导出**:
    * [`src/index.ts`](./src/index.ts) - 项目的主入口文件，导出公共 API。
5. **驱动实现**:
    * [`src/drivers/utils/index.ts`](./src/drivers/utils/index.ts) - 驱动相关的工具函数。
    * [`src/_drivers.ts`](./src/_drivers.ts) - 驱动相关的基础或辅助代码。
    * [`src/drivers/memory.ts`](./src/drivers/memory.ts) - 了解一个简单的内存驱动实现。
    * [`src/drivers/fs.ts`](./src/drivers/fs.ts) - 文件系统驱动，了解如何与外部系统交互。
    * [`src/drivers/overlay.ts`](./src/drivers/overlay.ts) - 叠加驱动，理解驱动组合。
    * (浏览 [`src/drivers/`](./src/drivers/) 目录下的其他驱动以了解特定实现)*
6. **HTTP 服务器**:
    * [`src/server.ts`](./src/server.ts) - HTTP 存储服务器的实现。
7. **命令行工具**:
    * [`src/cli.ts`](./src/cli.ts) - 命令行接口实现。
8. **构建与配置**:
    * [`package.json`](./package.json) - 项目依赖和脚本。
    * [`build.config.ts`](./build.config.ts) - 构建配置文件。
    * [`tsconfig.json`](./tsconfig.json) - TypeScript 配置文件。
    * [`vite.config.mjs`](./vite.config.mjs) - Vite 构建配置。
    * [`eslint.config.mjs`](./eslint.config.mjs) - ESLint 配置。
9. **测试**:
    * [`test/storage.test.ts`](./test/storage.test.ts) - 核心存储接口测试。
    * [`test/drivers/utils.ts`](./test/drivers/utils.ts) - 测试工具函数。
    * **驱动测试 (Drivers Tests):**
        * [`test/drivers/azure-app-configuration.test.ts`](./test/drivers/azure-app-configuration.test.ts)
        * [`test/drivers/azure-cosmos.test.ts`](./test/drivers/azure-cosmos.test.ts)
        * [`test/drivers/azure-key-vault.test.ts`](./test/drivers/azure-key-vault.test.ts)
        * [`test/drivers/azure-storage-blob.test.ts`](./test/drivers/azure-storage-blob.test.ts)
        * [`test/drivers/azure-storage-table.test.ts`](./test/drivers/azure-storage-table.test.ts)
        * [`test/drivers/capacitor-preferences.test.ts`](./test/drivers/capacitor-preferences.test.ts)
        * [`test/drivers/cloudflare-kv-binding.test.ts`](./test/drivers/cloudflare-kv-binding.test.ts)
        * [`test/drivers/cloudflare-kv-http.test.ts`](./test/drivers/cloudflare-kv-http.test.ts)
        * [`test/drivers/cloudflare-r2-binding.test.ts`](./test/drivers/cloudflare-r2-binding.test.ts)
        * [`test/drivers/db0.test.ts`](./test/drivers/db0.test.ts)
        * [`test/drivers/deno-kv-node.test.ts`](./test/drivers/deno-kv-node.test.ts)
        * [`test/drivers/deno-kv.test.ts`](./test/drivers/deno-kv.test.ts)
        * [`test/drivers/fs-lite.test.ts`](./test/drivers/fs-lite.test.ts)
        * [`test/drivers/fs.test.ts`](./test/drivers/fs.test.ts)
        * [`test/drivers/github.test.ts`](./test/drivers/github.test.ts)
        * [`test/drivers/http.test.ts`](./test/drivers/http.test.ts)
        * [`test/drivers/indexedb.test.ts`](./test/drivers/indexedb.test.ts)
        * [`test/drivers/localstorage.test.ts`](./test/drivers/localstorage.test.ts)
        * [`test/drivers/lru-cache.test.ts`](./test/drivers/lru-cache.test.ts)
        * [`test/drivers/memory.test.ts`](./test/drivers/memory.test.ts)
        * [`test/drivers/mongodb.test.ts`](./test/drivers/mongodb.test.ts)
        * [`test/drivers/netlify-blobs.test.ts`](./test/drivers/netlify-blobs.test.ts)
        * [`test/drivers/null.test.ts`](./test/drivers/null.test.ts)
        * [`test/drivers/overlay.test.ts`](./test/drivers/overlay.test.ts)
        * [`test/drivers/redis.test.ts`](./test/drivers/redis.test.ts)
        * [`test/drivers/s3.test.ts`](./test/drivers/s3.test.ts)
        * [`test/drivers/session-storage.test.ts`](./test/drivers/session-storage.test.ts)
        * [`test/drivers/uploadthing.test.ts`](./test/drivers/uploadthing.test.ts)
        * [`test/drivers/upstash.test.ts`](./test/drivers/upstash.test.ts)
        * [`test/drivers/vercel-blob.test.ts`](./test/drivers/vercel-blob.test.ts)
        * [`test/drivers/vercel-kv.test.ts`](./test/drivers/vercel-kv.test.ts)

---

# 💾 Unstorage

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

<!--[![Github Actions][github-actions-src]][github-actions-href]-->

Unstorage provides an async Key-Value storage API with conventional features like multi driver mounting, watching and working with metadata, dozens of built-in drivers and a [tiny core](https://bundlephobia.com/package/unstorage).

👉 [Documentation](https://unstorage.unjs.io)

## Features

* Designed for all environments: Browser, NodeJS, and Workers
* Lots of Built-in drivers
* Asynchronous API
* Unix-style driver mounting to combine storages
* Default [in-memory](https://unstorage.unjs.io/drivers/memory) storage
* Tree-shakable utils and tiny core
* Auto JSON value serialization and deserialization
* Binary and raw value support
* State [snapshots](https://unstorage.unjs.io/getting-started/utils#snapshots) and hydration
* Storage watcher
* HTTP Storage with [built-in server](https://unstorage.unjs.io/guide/http-server)

## Usage

Install `unstorage` npm package:

```sh
# yarn
yarn add unstorage

# npm
npm install unstorage

# pnpm
pnpm add unstorage
```

```js
import { createStorage } from "unstorage";

const storage = createStorage(/* opts */);

await storage.getItem("foo:bar"); // or storage.getItem('/foo/bar')
```

👉 Check out the [the documentation](https://unstorage.unjs.io) for usage information.

## Nightly release channel

You can use the nightly release channel to try the latest changes in the `main` branch via [`unstorage-nightly`](https://www.npmjs.com/package/unstorage-nightly).

If directly using `unstorage` in your project:

```json
{
  "devDependencies": {
    "unstorage": "npm:unstorage-nightly"
  }
}
```

If using `unstorage` via another tool in your project:

```json
{
  "resolutions": {
    "unstorage": "npm:unstorage-nightly"
  }
}
```

## Contribution

* Clone repository
* Install dependencies with `pnpm install`
* Use `pnpm dev` to start jest watcher verifying changes
* Use `pnpm test` before pushing to ensure all tests and lint checks passing

## License

[MIT](./LICENSE)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unstorage?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/unstorage
[npm-downloads-src]: https://img.shields.io/npm/dm/unstorage?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/unstorage
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/unstorage/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/unstorage
[bundle-src]: https://img.shields.io/bundlephobia/minzip/unstorage?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=unstorage
[license-src]: https://img.shields.io/github/license/unjs/unstorage.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/unjs/unstorage/blob/main/LICENSE
