import destr from "destr";
import type {
  Storage,
  Driver,
  WatchCallback,
  Unwatch,
  StorageValue,
  WatchEvent,
  TransactionOptions,
} from "./types";
import memory from "./drivers/memory"; // 默认的内存驱动
import { asyncCall, deserializeRaw, serializeRaw, stringify } from "./_utils"; // 内部工具函数
import {
  normalizeKey,
  normalizeBaseKey,
  joinKeys,
  filterKeyByDepth,
  filterKeyByBase,
} from "./utils"; // 公开的工具函数

/**
 * 存储上下文接口。
 * 用于在 `createStorage` 内部维护状态。
 */
interface StorageCTX {
  /**
   * 挂载点到驱动实例的映射。
   * 键是挂载的基础路径（例如 "" 表示根，"db:" 表示数据库），值是对应的驱动实例。
   */
  mounts: Record<string, Driver>;
  /**
   * 按长度排序的挂载点数组。
   * 用于高效地查找给定键对应的驱动。
   * 根挂载点 "" 始终存在。
   */
  mountpoints: string[];
  /**
   * 标记当前是否正在监听存储变化。
   */
  watching: boolean;
  /**
   * 挂载点到取消监听函数的映射。
   * 用于停止监听。
   */
  unwatch: Record<string, Unwatch>;
  /**
   * 监听器回调函数数组。
   * 当存储发生变化时，会调用这些监听器。
   */
  watchListeners: ((event: WatchEvent, key: string) => void)[];
}

/**
 * `createStorage` 函数的选项接口。
 */
export interface CreateStorageOptions {
  /**
   * 指定默认的根驱动。
   * 如果不提供，则默认使用内存驱动 (`memory()`)。
   */
  driver?: Driver;
}

/**
 * 创建一个新的 Storage 实例。
 * 这是 unstorage 的主要入口点。
 *
 * @param options - 创建存储实例的选项。
 * @returns 返回一个 Storage 对象，该对象提供了操作存储的各种方法。
 * @template T - 存储值的泛型类型，默认为 StorageValue。
 */
export function createStorage<T extends StorageValue>(
  options: CreateStorageOptions = {}
): Storage<T> {
  // 初始化存储上下文
  const context: StorageCTX = {
    // 默认挂载根路径 ""，使用传入的驱动或内存驱动
    mounts: { "": options.driver || memory() },
    // 挂载点数组，初始只有根路径
    mountpoints: [""],
    // 初始不监听
    watching: false,
    // 监听器列表为空
    watchListeners: [],
    // 取消监听函数映射为空
    unwatch: {},
  };

  /**
   * 根据键查找对应的挂载信息。
   * 它会遍历 `mountpoints` 数组（已按长度排序，长的优先），
   * 找到第一个匹配键前缀的挂载点。
   *
   * @param key - 要查找的键。
   * @returns 返回包含挂载点基础路径、相对键和驱动实例的对象。
   *          如果没有找到匹配的挂载点，则返回根挂载点 "" 的信息。
   */
  const getMount = (key: string) => {
    // mountpoints 数组保证按长度降序排列，所以长的挂载点会先匹配
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length), // 键相对于挂载点的路径
          driver: context.mounts[base]!, // 对应的驱动
        };
      }
    }
    // 理论上不应该执行到这里，因为总有根挂载点 ""
    // 但作为回退，返回根挂载点信息
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]!,
    };
  };

  /**
   * 获取指定基础路径下的所有相关挂载点。
   * 用于需要跨多个挂载点操作的场景（如 `getKeys`、`clear`）。
   *
   * @param base - 要查询的基础路径。
   * @param includeParent - 是否包含父级挂载点（例如，查询 `a:b:` 时是否包含挂载点 `a:`）。
   * @returns 返回一个挂载点信息对象的数组。
   */
  const getMounts = (base: string, includeParent?: boolean) => {
    return context.mountpoints
      .filter(
        (mountpoint) =>
          // 挂载点是查询基础路径的子路径 (e.g., mountpoint 'a:b:' startsWith base 'a:')
          mountpoint.startsWith(base) ||
          // 或者，如果需要包含父级，查询基础路径是挂载点的子路径 (e.g., base 'a:b:' startsWith mountpoint 'a:')
          (includeParent && base!.startsWith(mountpoint))
      )
      .map((mountpoint) => ({
        // 计算查询基础路径相对于挂载点的路径
        relativeBase:
          base.length > mountpoint.length
            ? base!.slice(mountpoint.length) // 如果 base 比 mountpoint 长
            : undefined, // 否则相对路径是 undefined (表示 base 就是 mountpoint 或其父路径)
        mountpoint,
        driver: context.mounts[mountpoint]!,
      }));
  };

  /**
   * 内部监听回调函数。
   * 当任何挂载的驱动触发变化时，此函数会被调用。
   * 它会将事件和规范化的键传递给所有已注册的外部监听器。
   *
   * @param event - 发生的事件类型 ('update' 或 'remove')。
   * @param key - 发生变化的键（可能是驱动的相对路径）。
   */
  const onChange: WatchCallback = (event, key) => {
    // 如果 storage 实例没有启动监听，则忽略
    if (!context.watching) {
      return;
    }
    // 规范化键（确保没有非法字符，并可能是绝对路径）
    // 注意：这里的 key 可能是驱动返回的相对路径，需要根据调用的 watch 函数来确定
    // 但传递给外部监听器时，应该是绝对路径
    key = normalizeKey(key); // TODO: Review if key normalization is needed here or should be handled in driver watch
    // 通知所有外部监听器
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };

  /**
   * 启动对所有挂载驱动的监听。
   * 如果已经在监听，则直接返回。
   * 会遍历所有挂载点，调用每个驱动的 `watch` 方法。
   */
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    // 遍历所有挂载点
    for (const mountpoint in context.mounts) {
      // 调用驱动的 watch 方法，传入内部 onChange 回调和挂载点基础路径
      // `watch` 辅助函数会处理驱动不支持 watch 的情况
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint]!,
        onChange,
        mountpoint // 将挂载点基础路径传给 watch，以便可能地拼接完整键名
      );
    }
  };

  /**
   * 停止对所有挂载驱动的监听。
   * 如果未在监听，则直接返回。
   * 会遍历所有存储的 `unwatch` 函数并调用它们。
   */
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    // 遍历存储的 unwatch 函数
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]!(); // 调用取消监听函数
    }
    context.unwatch = {}; // 清空映射
    context.watching = false;
  };

  /**
   * 定义批处理项的结构。
   */
  type BatchItem = {
    driver: Driver; // 对应的驱动
    base: string; // 挂载点基础路径
    items: { // 这个批次包含的操作项
      key: string; // 原始的绝对键
      relativeKey: string; // 相对于驱动的键
      value?: StorageValue; // 值（用于 setItem）
      options?: TransactionOptions; // 事务选项
    }[];
  };

  /**
   * 执行批处理操作的通用函数。
   * 用于优化 `getItems` 和 `setItems`，将针对同一驱动的操作分组处理。
   *
   * @param items - 要处理的操作项数组，可以是键字符串或包含键、值、选项的对象。
   * @param commonOptions - 应用于所有操作的通用选项。
   * @param cb - 处理每个批次回调函数，接收一个 `BatchItem`。
   * @returns 返回一个 Promise，解析为所有批次回调结果合并后的数组。
   */
  const runBatch = (
    items: (
      | string
      | { key: string; value?: StorageValue; options?: TransactionOptions }
    )[],
    commonOptions: undefined | TransactionOptions,
    cb: (batch: BatchItem) => Promise<any>
  ) => {
    // 使用 Map 按挂载点基础路径对批次进行分组
    const batches = new Map<string /* mount base */, BatchItem>();

    /**
     * 获取或创建指定挂载点的批处理对象。
     */
    const getBatch = (mount: ReturnType<typeof getMount>) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: [],
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };

    // 遍历所有操作项
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey(isStringItem ? item : item.key); // 规范化键
      const value = isStringItem ? undefined : item.value; // 获取值
      // 合并通用选项和单个项的选项
      const options =
        isStringItem || !item.options
          ? commonOptions
          : { ...commonOptions, ...item.options };
      // 找到对应的挂载点
      const mount = getMount(key);
      // 将操作项添加到对应挂载点的批次中
      getBatch(mount).items.push({
        key, // 原始键
        value, // 值
        relativeKey: mount.relativeKey, // 相对键
        options, // 最终选项
      });
    }

    // 并行执行所有批处理的回调函数
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat() // 将结果数组扁平化
    );
  };

  // 创建并返回 Storage 对象
  const storage: Storage = {
    // --- Item Utils ---
    /**
     * 检查键是否存在。
     *
     * @param key - 要检查的键。
     * @param opts - 事务选项。
     * @returns 返回 Promise<boolean>。
     */
    hasItem(key: string, opts = {}) {
      key = normalizeKey(key); // 规范化键
      const { relativeKey, driver } = getMount(key); // 找到驱动和相对键
      // 异步调用驱动的 hasItem 方法
      return asyncCall(driver.hasItem, relativeKey, opts);
    },

    /**
     * 获取键对应的值。
     * 返回的值会通过 destr 进行反序列化。
     *
     * @param key - 要获取的键。
     * @param opts - 事务选项。
     * @returns 返回 Promise<StorageValue | null>。
     */
    getItem(key: string, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      // 异步调用驱动的 getItem 方法，然后反序列化
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value) as StorageValue // 使用 destr 安全地解析 JSON
      );
    },

    /**
     * 批量获取多个键的值。
     * 利用 runBatch 进行优化。
     *
     * @param items - 要获取的键数组或对象数组。
     * @param commonOptions - 通用事务选项。
     * @returns 返回 Promise<{ key: string; value: StorageValue }[]>。
     */
    getItems(
      items: (string | { key: string; options?: TransactionOptions })[],
      commonOptions = {}
    ) {
      return runBatch(items, commonOptions, (batch) => {
        // 优先使用驱动提供的 getItems 方法（如果存在）
        if (batch.driver.getItems) {
          // 如果驱动同时支持 setItemRaw，我们假设 setItems 也能处理原始值
          // TODO: 确认 setItems 是否应该总是接收序列化字符串，即使 setItemRaw 存在？
          const useRaw = !!batch.driver.setItemRaw;
          return asyncCall(
            batch.driver.getItems,
            // 传递相对键给驱动
            batch.items.map((item) => ({
              key: item.relativeKey,
              // 根据是否使用 raw 模式决定是否序列化
              value: useRaw ? item.value : stringify(item.value),
              options: item.options,
            })),
            commonOptions
          ).then((r) =>
            // 将驱动返回的相对键转换回绝对键，并反序列化值
            r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value),
            }))
          );
        }
        // 如果驱动没有 getItems，则逐个调用 getItem
        return Promise.all(
          batch.items.map((item) =>
            asyncCall(
              batch.driver.getItem, // 调用单个 getItem
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key, // 返回原始绝对键
              value: destr(value), // 反序列化值
            }))
          )
        );
      });
    },

    /**
     * 获取键对应的原始值，不进行反序列化。
     *
     * @experimental
     * @param key - 要获取的键。
     * @param opts - 事务选项。
     * @returns 返回 Promise<any>。
     */
    getItemRaw(key: string, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      // 如果驱动支持 getItemRaw，则优先使用
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      // 否则回退到 getItem，并使用 deserializeRaw 进行反序列化
      // deserializeRaw 尝试处理非 JSON 字符串的情况
      return asyncCall(driver.getItem, relativeKey, opts).then(deserializeRaw);
    },

    /**
     * 设置键值对。
     * 值会通过 stringify 进行序列化后再传递给驱动。
     *
     * @param key - 要设置的键。
     * @param value - 要设置的值。
     * @param opts - 事务选项 (可以包含 TTL 等)。
     * @returns 返回 Promise<void>。
     */
    setItem(key: string, value: T, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      // 如果驱动支持 setItemRaw，则优先使用它，避免序列化开销
      if (driver.setItemRaw) {
        return asyncCall(driver.setItemRaw, relativeKey, value, opts);
      }
      // 否则序列化值，并调用驱动的 setItem
      return asyncCall(driver.setItem, relativeKey, stringify(value), opts);
    },

    /**
     * 批量设置多个键值对。
     * 利用 runBatch 进行优化。
     *
     * @param items - 要设置的键值对对象数组。
     * @param commonOptions - 通用事务选项。
     * @returns 返回 Promise<void>。
     */
    setItems(
      items: { key: string; value: T; options?: TransactionOptions }[],
      commonOptions = {}
    ) {
      return runBatch(items, commonOptions, (batch) => {
        // 优先使用驱动的 setItems 方法
        if (batch.driver.setItems) {
          // 如果驱动同时支持 setItemRaw，我们假设 setItems 也能处理原始值
          // TODO: 确认 setItems 是否应该总是接收序列化字符串，即使 setItemRaw 存在？
          const useRaw = !!batch.driver.setItemRaw;
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              // 根据是否使用 raw 模式决定是否序列化
              value: useRaw ? item.value : stringify(item.value),
              options: item.options,
            })),
            commonOptions
          );
        }

        // 如果驱动没有 setItems，则逐个调用 setItem 或 setItemRaw
        const useRaw = !!batch.driver.setItemRaw;
        return Promise.all(
          batch.items.map((item) =>
            asyncCall(
              useRaw ? batch.driver.setItemRaw! : batch.driver.setItem!,
              item.relativeKey,
              useRaw ? item.value : stringify(item.value),
              item.options
            )
          )
        ).then(() => {}); // Promise.all 返回数组，这里确保返回 void
      });
    },

    /**
     * 设置键的原始值，不进行序列化。
     *
     * @experimental
     * @param key - 要设置的键。
     * @param value - 要设置的原始值。
     * @param opts - 事务选项。
     * @returns 返回 Promise<void>。
     */
    setItemRaw(key: string, value: any, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      // 如果驱动支持 setItemRaw，则优先使用
      if (driver.setItemRaw) {
        return asyncCall(driver.setItemRaw, relativeKey, value, opts);
      }
      // 否则回退到 setItem，并使用 serializeRaw 尝试序列化
      // serializeRaw 会处理 Buffer 等特殊类型
      return asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
    },

    /**
     * 移除一个键。
     *
     * @param key - 要移除的键。
     * @param opts - 事务选项。
     * @returns 返回 Promise<void>。
     */
    removeItem(key: string, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      // 必须确保驱动支持 removeItem
      if (!driver.removeItem) {
        return Promise.resolve(); // 如果不支持，则静默忽略
      }
      return asyncCall(driver.removeItem, relativeKey, opts);
    },

    /**
     * 获取键的元数据。
     *
     * @param key - 要获取元数据的键。
     * @param opts - 事务选项。
     * @returns 返回 Promise<StorageMeta | null>。
     */
    getMeta(key: string, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      // 如果驱动不支持 getMeta，返回 null
      if (!driver.getMeta) {
        return Promise.resolve(null);
      }
      return asyncCall(driver.getMeta, relativeKey, opts);
    },

    /**
     * 清除指定基础路径下的所有键。
     * 会操作所有相关的挂载点。
     *
     * @param base - 要清除的基础路径 (默认为所有)。
     * @param opts - 事务选项。
     * @returns 返回 Promise<void>。
     */
    clear(base = "", opts = {}) {
      base = normalizeBaseKey(base);
      // 获取所有与 base 相关的挂载点（包括父级和子级）
      return Promise.all(
        getMounts(base, true).map(({ driver, relativeBase }) => {
          // 必须确保驱动支持 clear
          if (!driver.clear) {
            return Promise.resolve();
          }
          // 调用驱动的 clear，传入相对基础路径
          return asyncCall(driver.clear, relativeBase || "", opts);
        })
      ).then(() => {});
    },

    /**
     * 获取指定基础路径下的所有键。
     * 会从所有相关的挂载点获取键，并进行合并和过滤。
     *
     * @param base - 要获取键的基础路径 (默认为所有)。
     * @param opts - 获取键的选项 (如深度限制)。
     * @returns 返回 Promise<string[]>。
     */
    getKeys(base = "", opts = {}) {
      base = normalizeBaseKey(base);
      // 获取所有与 base 相关的挂载点（包括子级，不包括父级）
      return Promise.all(
        getMounts(base).map(({ driver, mountpoint, relativeBase }) =>
          // 调用驱动的 getKeys，传入相对基础路径
          asyncCall(driver.getKeys, relativeBase || "", opts)
            .then((keys) =>
              keys
                .map((key) => joinKeys(mountpoint, key)) // 将相对键转换为绝对键
                .filter((key) => filterKeyByDepth(key, base, opts.maxDepth)) // 按深度过滤
            )
            // 捕获驱动可能抛出的错误，并返回空数组
            .catch(() => [])
        )
      ).then((keys) =>
        // 将所有挂载点的键合并、去重并按基础路径过滤
        [...new Set(keys.flat())].filter((key) => filterKeyByBase(key, base))
      );
    },

    // --- Watch --- 未完成
    /**
     * 监听存储变化。
     *
     * @param callback - 变化发生时的回调函数。
     * @returns 返回一个取消监听的函数 (Promise<Unwatch>)。
     */
    watch(callback) {
      // 将回调添加到监听器列表
      context.watchListeners.push(callback);
      // 如果还没有启动监听，则启动
      if (!context.watching) {
        startWatch().catch(console.error); // 启动监听，并处理可能的错误
      }
      // 返回取消监听函数
      return Promise.resolve(async () => {
        // 从监听器列表中移除回调
        context.watchListeners.splice(context.watchListeners.indexOf(callback), 1);
        // 如果没有监听器了，则停止监听
        if (context.watchListeners.length === 0 && context.watching) {
          await stopWatch();
        }
      });
    },

    /**
     * 取消所有监听。
     *
     * @returns 返回 Promise<void>。
     */
    unwatch() {
      // 清空监听器列表并停止监听
      context.watchListeners.length = 0;
      return stopWatch();
    },

    // --- Mount --- 未完成
    /**
     * 挂载一个新的驱动到指定的基础路径。
     *
     * @param base - 要挂载的基础路径。
     * @param driver - 要挂载的驱动实例。
     * @returns 返回 Storage 实例自身，支持链式调用。
     */
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base === "" || context.mounts[base]) {
        throw new Error(`Cannot mount to an existing mountpoint: "${base}"`);
      }
      if (!driver) {
        throw new Error("Cannot mount empty driver");
      }
      context.mounts[base] = driver;
      context.mountpoints.push(base);
      // 保持 mountpoints 按长度降序排序
      context.mountpoints.sort((a, b) => b.length - a.length);

      // 如果正在监听，则启动新挂载驱动的监听
      if (context.watching) {
        watch(driver, onChange, base)
          .then((unwatch) => {
            context.unwatch[base] = unwatch;
          })
          .catch(console.error);
      }
      return storage;
    },

    /**
     * 卸载指定基础路径的驱动。
     *
     * @param base - 要卸载的基础路径。
     * @returns 返回 Storage 实例自身，支持链式调用。
     */
    unmount(base) {
      base = normalizeBaseKey(base);
      if (base === "") {
        throw new Error("Cannot unmount root");
      }
      if (!context.mounts[base]) {
        return storage; // 如果不存在，则静默忽略
      }

      // 停止监听（如果正在监听）
      if (context.watching && context.unwatch[base]) {
        context.unwatch[base]!().catch(console.error);
        delete context.unwatch[base];
      }

      // 从映射和数组中移除
      delete context.mounts[base];
      context.mountpoints.splice(context.mountpoints.indexOf(base), 1);

      return storage;
    },

    // --- Dispose --- 未完成
    /**
     * 释放存储实例及其所有挂载驱动占用的资源。
     *
     * @returns 返回 Promise<void>。
     */
    async dispose() {
      // 停止监听
      await stopWatch().catch(console.error);
      // 调用所有驱动的 dispose 方法
      await Promise.all(
        Object.entries(context.mounts).map(([mountpoint, driver]) =>
          dispose(driver).catch(() => {
            console.warn(`Failed to dispose driver for mountpoint ${mountpoint}`);
          })
        )
      );
      // 清空上下文
      context.mounts = { "": memory() }; // 重置为内存驱动
      context.mountpoints = [""];
      context.watchListeners = [];
      context.unwatch = {};
    },

    // --- Experimental --- 未完成
    _getMount: getMount,
    _getMounts: getMounts,
    _storage: context, // 暴露内部上下文（可能用于测试或高级用途）
  };

  return storage;
}

// --- 以下是辅助函数 ---

/**
 * 创建存储快照。
 * 会遍历所有键并获取它们的值。
 *
 * @param storage - Storage 实例。
 * @param base - 要创建快照的基础路径。
 * @returns 返回包含键值对的快照对象 (Promise<Snapshot<string>>)。值是序列化后的字符串。
 */
export async function snapshot<T = StorageValue>(
  storage: Storage<T>,
  base: string
): Promise<Snapshot<string>> {
  base = normalizeBaseKey(base);
  const keys = await storage.getKeys(base);
  const snapshot: Snapshot<string> = {};
  await Promise.all(
    keys.map(async (key) => {
      const value = await storage.getItemRaw(key);
      snapshot[key.slice(base.length)] = serializeRaw(value); // 存储相对键和序列化后的值
    })
  );
  return snapshot;
}

/**
 * 将快照恢复到存储中。
 *
 * @param driver - Storage 实例。
 * @param snapshot - 要恢复的快照对象。
 * @param base - 要恢复到的基础路径。
 */
export async function restoreSnapshot<T extends StorageValue>(
  driver: Storage<T>,
  snapshot: Snapshot<StorageValue>,
  base = ""
) {
  base = normalizeBaseKey(base);
  // 并行设置快照中的所有项
  await Promise.all(
    Object.entries(snapshot).map(([key, value]) =>
      driver.setItem(joinKeys(base, key), value)
    )
  );
}

/**
 * 包装驱动的 watch 方法。
 * 如果驱动不支持 watch，则返回一个空操作的 unwatch 函数。
 *
 * @param driver - 驱动实例。
 * @param onChange - 内部变化回调。
 * @param base - 挂载点基础路径（用于可能的键拼接）。
 * @returns 返回 Promise<Unwatch>。
 */
function watch(driver: Driver, onChange: WatchCallback, base: string) {
  // 如果驱动支持 watch，则调用它
  if (driver.watch) {
    // 注意：这里的 key 可能是驱动返回的相对路径，需要 onChange 内部处理
    // 或者约定 driver.watch 总是返回绝对路径？
    // 当前实现假设 onChange 会处理
    return Promise.resolve(driver.watch(onChange));
  }
  // 否则返回一个什么都不做的 unwatch 函数
  return Promise.resolve(() => {});
}

/**
 * 调用驱动的 dispose 方法。
 * 如果驱动不支持 dispose，则静默忽略。
 *
 * @param driver - 驱动实例。
 * @returns 返回 Promise<void>。
 */
function dispose(driver: Driver) {
  // 如果驱动支持 dispose，则调用它
  if (driver.dispose) {
    return Promise.resolve(driver.dispose());
  }
  // 否则返回 resolved Promise
  return Promise.resolve();
}
