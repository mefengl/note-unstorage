/**
 * _drivers.ts - 内置驱动注册表
 * 
 * 这个文件是自动生成的，它定义了unstorage支持的所有内置驱动的类型和引用。
 * 它使用户可以通过字符串名称来引用驱动，而不需要直接导入实际的驱动模块。
 * 这种方式允许我们实现按需加载，减少了最终打包的大小。
 * 
 * 注意：这个文件是由scripts/gen-drivers脚本自动生成的，不应该手动编辑。
 */

// Auto-generated using scripts/gen-drivers.
// Do not manually edit!

import type { AzureAppConfigurationOptions as AzureAppConfigurationOptions } from "unstorage/drivers/azure-app-configuration";
import type { AzureCosmosOptions as AzureCosmosOptions } from "unstorage/drivers/azure-cosmos";
import type { AzureKeyVaultOptions as AzureKeyVaultOptions } from "unstorage/drivers/azure-key-vault";
import type { AzureStorageBlobOptions as AzureStorageBlobOptions } from "unstorage/drivers/azure-storage-blob";
import type { AzureStorageTableOptions as AzureStorageTableOptions } from "unstorage/drivers/azure-storage-table";
import type { CapacitorPreferencesOptions as CapacitorPreferencesOptions } from "unstorage/drivers/capacitor-preferences";
import type { KVOptions as CloudflareKVBindingOptions } from "unstorage/drivers/cloudflare-kv-binding";
import type { KVHTTPOptions as CloudflareKVHttpOptions } from "unstorage/drivers/cloudflare-kv-http";
import type { CloudflareR2Options as CloudflareR2BindingOptions } from "unstorage/drivers/cloudflare-r2-binding";
import type { DB0DriverOptions as Db0Options } from "unstorage/drivers/db0";
import type { DenoKvNodeOptions as DenoKVNodeOptions } from "unstorage/drivers/deno-kv-node";
import type { DenoKvOptions as DenoKVOptions } from "unstorage/drivers/deno-kv";
import type { FSStorageOptions as FsLiteOptions } from "unstorage/drivers/fs-lite";
import type { FSStorageOptions as FsOptions } from "unstorage/drivers/fs";
import type { GithubOptions as GithubOptions } from "unstorage/drivers/github";
import type { HTTPOptions as HttpOptions } from "unstorage/drivers/http";
import type { IDBKeyvalOptions as IndexedbOptions } from "unstorage/drivers/indexedb";
import type { LocalStorageOptions as LocalstorageOptions } from "unstorage/drivers/localstorage";
import type { LRUDriverOptions as LruCacheOptions } from "unstorage/drivers/lru-cache";
import type { MongoDbOptions as MongodbOptions } from "unstorage/drivers/mongodb";
import type { NetlifyStoreOptions as NetlifyBlobsOptions } from "unstorage/drivers/netlify-blobs";
import type { OverlayStorageOptions as OverlayOptions } from "unstorage/drivers/overlay";
import type { PlanetscaleDriverOptions as PlanetscaleOptions } from "unstorage/drivers/planetscale";
import type { RedisOptions as RedisOptions } from "unstorage/drivers/redis";
import type { S3DriverOptions as S3Options } from "unstorage/drivers/s3";
import type { SessionStorageOptions as SessionStorageOptions } from "unstorage/drivers/session-storage";
import type { UploadThingOptions as UploadthingOptions } from "unstorage/drivers/uploadthing";
import type { UpstashOptions as UpstashOptions } from "unstorage/drivers/upstash";
import type { VercelBlobOptions as VercelBlobOptions } from "unstorage/drivers/vercel-blob";
import type { VercelKVOptions as VercelKVOptions } from "unstorage/drivers/vercel-kv";

/**
 * BuiltinDriverName - 内置驱动的名称类型
 * 
 * 这个类型定义了所有可用的内置驱动的名称。
 * 每个驱动都有两种命名形式：
 * 1. 短横线形式（如 'azure-app-configuration'）
 * 2. 驼峰式（如 'azureAppConfiguration'）
 * 
 * 用户可以使用任一形式来引用驱动，这提供了更大的灵活性。
 */
export type BuiltinDriverName = "azure-app-configuration" | "azureAppConfiguration" | "azure-cosmos" | "azureCosmos" | "azure-key-vault" | "azureKeyVault" | "azure-storage-blob" | "azureStorageBlob" | "azure-storage-table" | "azureStorageTable" | "capacitor-preferences" | "capacitorPreferences" | "cloudflare-kv-binding" | "cloudflareKVBinding" | "cloudflare-kv-http" | "cloudflareKVHttp" | "cloudflare-r2-binding" | "cloudflareR2Binding" | "db0" | "deno-kv-node" | "denoKVNode" | "deno-kv" | "denoKV" | "fs-lite" | "fsLite" | "fs" | "github" | "http" | "indexedb" | "localstorage" | "lru-cache" | "lruCache" | "memory" | "mongodb" | "netlify-blobs" | "netlifyBlobs" | "null" | "overlay" | "planetscale" | "redis" | "s3" | "session-storage" | "sessionStorage" | "uploadthing" | "upstash" | "vercel-blob" | "vercelBlob" | "vercel-kv" | "vercelKV";

/**
 * BuiltinDriverOptions - 内置驱动的配置选项类型
 * 
 * 这个类型定义了每个内置驱动的配置选项类型。
 * 它是一个映射类型，将驱动名称映射到其对应的配置选项类型。
 * 这使得TypeScript可以在创建驱动时提供类型检查和自动补全。
 */
export type BuiltinDriverOptions = {
  "azure-app-configuration": AzureAppConfigurationOptions;
  "azureAppConfiguration": AzureAppConfigurationOptions;
  "azure-cosmos": AzureCosmosOptions;
  "azureCosmos": AzureCosmosOptions;
  "azure-key-vault": AzureKeyVaultOptions;
  "azureKeyVault": AzureKeyVaultOptions;
  "azure-storage-blob": AzureStorageBlobOptions;
  "azureStorageBlob": AzureStorageBlobOptions;
  "azure-storage-table": AzureStorageTableOptions;
  "azureStorageTable": AzureStorageTableOptions;
  "capacitor-preferences": CapacitorPreferencesOptions;
  "capacitorPreferences": CapacitorPreferencesOptions;
  "cloudflare-kv-binding": CloudflareKVBindingOptions;
  "cloudflareKVBinding": CloudflareKVBindingOptions;
  "cloudflare-kv-http": CloudflareKVHttpOptions;
  "cloudflareKVHttp": CloudflareKVHttpOptions;
  "cloudflare-r2-binding": CloudflareR2BindingOptions;
  "cloudflareR2Binding": CloudflareR2BindingOptions;
  "db0": Db0Options;
  "deno-kv-node": DenoKVNodeOptions;
  "denoKVNode": DenoKVNodeOptions;
  "deno-kv": DenoKVOptions;
  "denoKV": DenoKVOptions;
  "fs-lite": FsLiteOptions;
  "fsLite": FsLiteOptions;
  "fs": FsOptions;
  "github": GithubOptions;
  "http": HttpOptions;
  "indexedb": IndexedbOptions;
  "localstorage": LocalstorageOptions;
  "lru-cache": LruCacheOptions;
  "lruCache": LruCacheOptions;
  "mongodb": MongodbOptions;
  "netlify-blobs": NetlifyBlobsOptions;
  "netlifyBlobs": NetlifyBlobsOptions;
  "overlay": OverlayOptions;
  "planetscale": PlanetscaleOptions;
  "redis": RedisOptions;
  "s3": S3Options;
  "session-storage": SessionStorageOptions;
  "sessionStorage": SessionStorageOptions;
  "uploadthing": UploadthingOptions;
  "upstash": UpstashOptions;
  "vercel-blob": VercelBlobOptions;
  "vercelBlob": VercelBlobOptions;
  "vercel-kv": VercelKVOptions;
  "vercelKV": VercelKVOptions;
};

/**
 * builtinDrivers - 内置驱动的模块路径映射
 * 
 * 这个常量对象将驱动名称映射到其实际的模块路径。
 * 当用户通过字符串指定驱动时，系统会使用这个映射来动态导入相应的驱动模块。
 * 这种方式实现了按需加载，避免了将所有驱动都打包到最终代码中。
 * 
 * 每个驱动都有两种命名形式（短横线和驼峰式），但它们指向相同的模块路径。
 */
export const builtinDrivers = {
  "azure-app-configuration": "unstorage/drivers/azure-app-configuration",
  "azureAppConfiguration": "unstorage/drivers/azure-app-configuration",
  "azure-cosmos": "unstorage/drivers/azure-cosmos",
  "azureCosmos": "unstorage/drivers/azure-cosmos",
  "azure-key-vault": "unstorage/drivers/azure-key-vault",
  "azureKeyVault": "unstorage/drivers/azure-key-vault",
  "azure-storage-blob": "unstorage/drivers/azure-storage-blob",
  "azureStorageBlob": "unstorage/drivers/azure-storage-blob",
  "azure-storage-table": "unstorage/drivers/azure-storage-table",
  "azureStorageTable": "unstorage/drivers/azure-storage-table",
  "capacitor-preferences": "unstorage/drivers/capacitor-preferences",
  "capacitorPreferences": "unstorage/drivers/capacitor-preferences",
  "cloudflare-kv-binding": "unstorage/drivers/cloudflare-kv-binding",
  "cloudflareKVBinding": "unstorage/drivers/cloudflare-kv-binding",
  "cloudflare-kv-http": "unstorage/drivers/cloudflare-kv-http",
  "cloudflareKVHttp": "unstorage/drivers/cloudflare-kv-http",
  "cloudflare-r2-binding": "unstorage/drivers/cloudflare-r2-binding",
  "cloudflareR2Binding": "unstorage/drivers/cloudflare-r2-binding",
  "db0": "unstorage/drivers/db0",
  "deno-kv-node": "unstorage/drivers/deno-kv-node",
  "denoKVNode": "unstorage/drivers/deno-kv-node",
  "deno-kv": "unstorage/drivers/deno-kv",
  "denoKV": "unstorage/drivers/deno-kv",
  "fs-lite": "unstorage/drivers/fs-lite",
  "fsLite": "unstorage/drivers/fs-lite",
  "fs": "unstorage/drivers/fs",
  "github": "unstorage/drivers/github",
  "http": "unstorage/drivers/http",
  "indexedb": "unstorage/drivers/indexedb",
  "localstorage": "unstorage/drivers/localstorage",
  "lru-cache": "unstorage/drivers/lru-cache",
  "lruCache": "unstorage/drivers/lru-cache",
  "memory": "unstorage/drivers/memory",
  "mongodb": "unstorage/drivers/mongodb",
  "netlify-blobs": "unstorage/drivers/netlify-blobs",
  "netlifyBlobs": "unstorage/drivers/netlify-blobs",
  "null": "unstorage/drivers/null",
  "overlay": "unstorage/drivers/overlay",
  "planetscale": "unstorage/drivers/planetscale",
  "redis": "unstorage/drivers/redis",
  "s3": "unstorage/drivers/s3",
  "session-storage": "unstorage/drivers/session-storage",
  "sessionStorage": "unstorage/drivers/session-storage",
  "uploadthing": "unstorage/drivers/uploadthing",
  "upstash": "unstorage/drivers/upstash",
  "vercel-blob": "unstorage/drivers/vercel-blob",
  "vercelBlob": "unstorage/drivers/vercel-blob",
  "vercel-kv": "unstorage/drivers/vercel-kv",
  "vercelKV": "unstorage/drivers/vercel-kv",
} as const;
