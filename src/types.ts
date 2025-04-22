/**
 * 定义了可以存储在 unstorage 中的基本数据类型。
 * 它可以是 null、字符串、数字、布尔值或者一个普通的对象。
 * 注意：不支持存储函数、Symbol 等特殊类型，对象也最好是可序列化的简单对象。
 * 比如： `null`, `'hello'`, `123`, `true`, `{ name: 'unjs', age: 3 }`
 */
export type StorageValue = null | string | number | boolean | object;

/**
 * 定义了监听存储变化时可能发生的事件类型。
 * - `update`: 表示某个键的值被更新了（或者新创建了）。
 * - `remove`: 表示某个键被移除了。
 */
export type WatchEvent = "update" | "remove";

/**
 * 定义了监听存储变化的回调函数类型。
 * 当你调用 `storage.watch()` 时，需要提供这样一个函数。
 * 每当存储中有键被更新或移除时，这个函数就会被调用。
 * @param event - 触发回调的事件类型 (`'update'` 或 `'remove'`)。
 * @param key - 发生变化的键名 (例如 `'user:profile'`)。
 * @returns 这个函数可以返回任何值，但通常不处理其返回值。它可以是异步的 (`Promise<any>`)。
 */
export type WatchCallback = (event: WatchEvent, key: string) => any;

/**
 * 一个工具类型，表示一个值 T 或一个解析为 T 的 Promise。
 * 这在 unstorage 中很常见，因为很多存储操作可能是同步的（如内存存储），也可能是异步的（如文件系统或数据库存储）。
 * 使用这个类型可以统一处理这两种情况。
 * 例如： `MaybePromise<string>` 表示这个值可以是一个 `string`，也可以是一个 `Promise<string>`。
 */
type MaybePromise<T> = T | Promise<T>;

/**
 * 一个内部工具类型，似乎是为了处理泛型 T 可能未定义的情况，确保它总有一个类型（这里是 `any`）。
 * 这在处理复杂的泛型推断时可能有用，防止 TypeScript 报错。
 * 通常在库的内部实现中使用，使用者一般不需要直接接触。
 */
type MaybeDefined<T> = T extends any ? T : any;

/**
 * 定义了 `storage.watch()` 函数返回值的类型。
 * 当你开始监听存储变化后，会得到一个 `unwatch` 函数。
 * 调用这个函数可以停止监听。
 * @returns 这个停止监听的函数本身也可能是一个 Promise，表示停止操作可能是异步的。
 */
export type Unwatch = () => MaybePromise<void>;

/**
 * 定义了存储项的元数据（Metadata）结构。
 * 元数据是与存储值本身分离的附加信息。
 * 比如，你可以用它来存储上次访问时间、修改时间或过期时间。
 */
export interface StorageMeta {
  /**
   * 上次访问时间 (Access Time)。
   * 可选。
   */
  atime?: Date;
  /**
   * 上次修改时间 (Modification Time)。
   * 可选。
   */
  mtime?: Date;
  /**
   * 过期时间 (Time To Live)，单位是秒。
   * 例如，`ttl: 3600` 表示这个键值对在 1 小时后过期。
   * 可选。
   */
  ttl?: number;
  /**
   * 允许存储驱动添加自定义的元数据字段。
   * 键是字符串，值可以是 `StorageValue`、`Date` 或 `undefined`。
   * 这提供了很大的灵活性。
   */
  [key: string]: StorageValue | Date | undefined;
}

// TODO: 明确 ttl 的类型 （这里似乎是指在 TransactionOptions 中的 ttl）
/**
 * 定义了传递给存储操作（如 getItem, setItem）的可选参数。
 * 这些参数可以影响事务的行为，例如指定特定的缓存策略、数据库选项等。
 * 这是一个通用的记录类型，具体驱动可以定义它们自己支持的选项。
 * 例如：`{ ignoreCache: true }` 或 `{ transactionId: '...' }`
 */
export type TransactionOptions = Record<string, any>;

/**
 * `getKeys` 操作的特定选项，继承自通用的 `TransactionOptions`。
 */
export type GetKeysOptions = TransactionOptions & {
  /**
   * 指定获取键的最大层级深度。
   * 这对于模拟目录结构的存储驱动（如文件系统驱动）特别有用。
   * 例如，`maxDepth: 1` 可能只返回当前层级的键。
   * 可选。
   */
  maxDepth?: number;
};

/**
 * 定义了存储驱动（Driver）可以声明的一些特性标志。
 * 这些标志告诉 unstorage 核心库该驱动支持哪些高级功能。
 */
export interface DriverFlags {
  /**
   * 表示该驱动是否支持 `getKeys` 操作的 `maxDepth` 选项。
   * 如果为 `true`，unstorage 会将 `maxDepth` 选项传递给驱动的 `getKeys` 方法。
   * 可选，默认为 `false`。
   */
  maxDepth?: boolean;
  /**
   * 表示该驱动是否原生支持 TTL (Time To Live) 过期机制。
   * 如果为 `true`，驱动自己负责处理过期逻辑。
   * 如果为 `false` 或未定义，unstorage 核心库会尝试在 `getMeta` 返回的 `ttl` 字段基础上模拟过期行为。
   * 可选，默认为 `false`。
   */
  ttl?: boolean;
}

type StorageDefinition = {
  items: unknown;
  [key: string]: unknown;
};

type StorageItemMap<T> = T extends StorageDefinition ? T["items"] : T;
type StorageItemType<T, K> = K extends keyof StorageItemMap<T>
  ? StorageItemMap<T>[K]
  : T extends StorageDefinition
    ? StorageValue
    : T;

export interface Storage<T extends StorageValue = StorageValue> {
  // Item
  hasItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    opts?: TransactionOptions
  ): Promise<boolean>;
  hasItem(key: string, opts?: TransactionOptions): Promise<boolean>;

  getItem<
    U extends Extract<T, StorageDefinition>,
    K extends string & keyof StorageItemMap<U>,
  >(
    key: K,
    ops?: TransactionOptions
  ): Promise<StorageItemType<T, K> | null>;
  getItem<R = StorageItemType<T, string>>(
    key: string,
    opts?: TransactionOptions
  ): Promise<R | null>;

  /** @experimental */
  getItems: <U extends T>(
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions
  ) => Promise<{ key: string; value: U }[]>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  getItemRaw: <T = any>(
    key: string,
    opts?: TransactionOptions
  ) => Promise<MaybeDefined<T> | null>;

  setItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    value: StorageItemType<T, K>,
    opts?: TransactionOptions
  ): Promise<void>;
  setItem<U extends T>(
    key: string,
    value: U,
    opts?: TransactionOptions
  ): Promise<void>;

  /** @experimental */
  setItems: <U extends T>(
    items: { key: string; value: U; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => Promise<void>;
  /** @experimental See https://github.com/unjs/unstorage/issues/142 */
  setItemRaw: <T = any>(
    key: string,
    value: MaybeDefined<T>,
    opts?: TransactionOptions
  ) => Promise<void>;

  removeItem<
    U extends Extract<T, StorageDefinition>,
    K extends keyof StorageItemMap<U>,
  >(
    key: K,
    opts?:
      | (TransactionOptions & { removeMeta?: boolean })
      | boolean /* legacy: removeMeta */
  ): Promise<void>;
  removeItem(
    key: string,
    opts?:
      | (TransactionOptions & { removeMeta?: boolean })
      | boolean /* legacy: removeMeta */
  ): Promise<void>;

  // Meta
  getMeta: (
    key: string,
    opts?:
      | (TransactionOptions & { nativeOnly?: boolean })
      | boolean /* legacy: nativeOnly */
  ) => MaybePromise<StorageMeta>;
  setMeta: (
    key: string,
    value: StorageMeta,
    opts?: TransactionOptions
  ) => Promise<void>;
  removeMeta: (key: string, opts?: TransactionOptions) => Promise<void>;
  // Keys
  getKeys: (base?: string, opts?: GetKeysOptions) => Promise<string[]>;
  // Utils
  clear: (base?: string, opts?: TransactionOptions) => Promise<void>;
  dispose: () => Promise<void>;
  watch: (callback: WatchCallback) => Promise<Unwatch>;
  unwatch: () => Promise<void>;
  // Mount
  mount: (base: string, driver: Driver) => Storage;
  unmount: (base: string, dispose?: boolean) => Promise<void>;
  getMount: (key?: string) => { base: string; driver: Driver };
  getMounts: (
    base?: string,
    options?: { parents?: boolean }
  ) => { base: string; driver: Driver }[];
  // Aliases
  keys: Storage["getKeys"];
  get: Storage<T>["getItem"];
  set: Storage<T>["setItem"];
  has: Storage<T>["hasItem"];
  del: Storage<T>["removeItem"];
  remove: Storage<T>["removeItem"];
}

/**
 * 定义了存储驱动（Driver）的接口。
 * Driver 是 unstorage 的核心概念，它封装了与特定后端存储（如内存、文件系统、Redis、S3 等）交互的逻辑。
 * 你可以实现自己的 Driver 来对接任何你想用的存储系统。
 *
 * @template OptionsT - 驱动初始化时接受的选项类型。
 * @template InstanceT - 驱动内部可能维护的实例类型（例如数据库连接实例）。
 */
export interface Driver<OptionsT = any, InstanceT = any> {
  /**
   * 驱动的名称，用于调试或识别。
   * 例如：`'fs'`, `'redis'`, `'memory'`。
   * 可选。
   */
  name?: string;
  /**
   * 驱动支持的特性标志。
   * @see DriverFlags
   * 可选。
   */
  flags?: DriverFlags;
  /**
   * 驱动初始化时接收到的选项。
   * 这些选项通常在创建驱动实例时传入。
   * 可选。
   */
  options?: OptionsT;
  /**
   * 获取驱动内部维护的实例（如果存在）。
   * 例如，获取 Redis 驱动的 `ioredis` 客户端实例。
   * 可选。
   */
  getInstance?: () => InstanceT;

  /**
   * 检查指定的键是否存在于存储中。
   * @param key - 要检查的键名。
   * @param opts - 事务选项。
   * @returns 返回一个布尔值或解析为布尔值的 Promise，表示键是否存在。
   */
  hasItem: (key: string, opts: TransactionOptions) => MaybePromise<boolean>;

  /**
   * 获取指定键的值。
   * @param key - 要获取的键名。
   * @param opts - 事务选项。
   * @returns 返回对应的值或解析为值的 Promise。如果键不存在，应返回 `null`。
   *         返回的值应该是 unstorage 可以处理的 `StorageValue` 类型。
   */
  getItem: (
    key: string,
    opts?: TransactionOptions
  ) => MaybePromise<StorageValue>;

  /**
   * 批量获取多个键的值。
   * 这是一个实验性功能，可以提高性能，减少多次调用的开销。
   * @experimental
   * @param items - 一个对象数组，每个对象包含要获取的 `key` 和可选的 `options`。
   * @param commonOptions - 应用于所有获取操作的通用事务选项。
   * @returns 返回一个 Promise，解析为一个包含键值对的对象数组。
   */
  getItems?: (
    items: { key: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<{ key: string; value: StorageValue }[]>;

  /**
   * 获取指定键的原始值，不经过 unstorage 的序列化/反序列化处理。
   * 这对于存储二进制数据或非 JSON 兼容的数据很有用。
   * @experimental
   * @param key - 要获取的键名。
   * @param opts - 事务选项。
   * @returns 返回原始值或解析为原始值的 Promise。如果键不存在，行为可能依赖于具体驱动，但通常是 `null` 或 `undefined`。
   */
  getItemRaw?: (key: string, opts: TransactionOptions) => MaybePromise<unknown>;

  /**
   * 设置指定键的值。
   * 如果键已存在，则覆盖。
   * @param key - 要设置的键名。
   * @param value - 要设置的值。注意：这里接收的是 **序列化后** 的字符串。unstorage 核心库负责序列化。
   * @param opts - 事务选项，可以包含 TTL 等元数据信息。
   * @returns 返回 void 或 Promise<void>。
   */
  setItem?: (
    key: string,
    value: string, // 注意：驱动层面接收的是序列化后的字符串
    opts: TransactionOptions
  ) => MaybePromise<void>;

  /**
   * 批量设置多个键的值。
   * 这是一个实验性功能。
   * @experimental
   * @param items - 一个对象数组，每个对象包含要设置的 `key`, `value` (序列化后的字符串) 和可选的 `options`。
   * @param commonOptions - 应用于所有设置操作的通用事务选项。
   * @returns 返回 void 或 Promise<void>。
   */
  setItems?: (
    items: { key: string; value: string; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => MaybePromise<void>;

  /**
   * 设置指定键的原始值，不经过 unstorage 的序列化处理。
   * @experimental
   * @param key - 要设置的键名。
   * @param value - 要设置的原始值。
   * @param opts - 事务选项。
   * @returns 返回 void 或 Promise<void>。
   */
  setItemRaw?: (
    key: string,
    value: any, // 接收原始值
    opts: TransactionOptions
  ) => MaybePromise<void>;

  /**
   * 移除指定的键及其关联的值。
   * @param key - 要移除的键名。
   * @param opts - 事务选项。
   * @returns 返回 void 或 Promise<void>。
   */
  removeItem?: (key: string, opts: TransactionOptions) => MaybePromise<void>;

  /**
   * 获取指定键的元数据。
   * @param key - 要获取元数据的键名。
   * @param opts - 事务选项。
   * @returns 返回元数据对象或解析为元数据对象的 Promise。如果键不存在或没有元数据，应返回 `null`。
   * @see StorageMeta
   */
  getMeta?: (
    key: string,
    opts: TransactionOptions
  ) => MaybePromise<StorageMeta | null>;

  /**
   * 获取指定基础路径下的所有键名。
   * @param base - 基础路径（例如 `'users:'` 或 `''` 表示根路径）。驱动应返回此前缀下的所有键。
   * @param opts - 获取键的选项，可能包含 `maxDepth`。
   * @returns 返回一个字符串数组或解析为字符串数组的 Promise，包含所有匹配的键名。
   * @see GetKeysOptions
   */
  getKeys: (base: string, opts: GetKeysOptions) => MaybePromise<string[]>;

  /**
   * 清除指定基础路径下的所有键值对。
   * @param base - 要清除的基础路径。如果为空字符串或未提供，可能表示清除所有键（取决于驱动实现）。
   * @param opts - 事务选项。
   * @returns 返回 void 或 Promise<void>。
   */
  clear?: (base: string, opts: TransactionOptions) => MaybePromise<void>;

  /**
   * 释放驱动占用的资源。
   * 例如，关闭数据库连接、停止文件监听器等。
   * 当调用 `storage.dispose()` 时，所有挂载的驱动的 `dispose` 方法会被调用。
   * 可选。
   * @returns 返回 void 或 Promise<void>。
   */
  dispose?: () => MaybePromise<void>;

  /**
   * 开始监听存储的变化。
   * 驱动需要实现这个方法来支持 `storage.watch()`。
   * @param callback - 当存储变化时要调用的回调函数。
   * @returns 返回一个 `unwatch` 函数或 Promise<Unwatch>，用于停止监听。
   * @see WatchCallback
   * @see Unwatch
   * 可选。
   */
  watch?: (callback: WatchCallback) => MaybePromise<Unwatch>;
}
