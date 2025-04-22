import type { Storage, StorageValue, TransactionOptions } from "./types";

// 定义一个类型，包含 Storage 接口中所有与 key 操作相关的属性名
type StorageKeys = Array<keyof Storage>;

// 列出 Storage 接口中所有需要被包装（prefix）的方法名
// 这些方法都涉及到对存储键（key）的操作
const storageKeyProperties: StorageKeys = [
  // 检查某个键是否存在
  "has",
  "hasItem",
  // 获取某个键的值
  "get",
  "getItem",
  // 获取某个键的原始值（可能包含元数据）
  "getItemRaw",
  // 设置某个键的值
  "set",
  "setItem",
  // 设置某个键的原始值（可能包含元数据）
  "setItemRaw",
  // 删除某个键
  "del",
  "remove",
  "removeItem",
  // 获取某个键的元数据
  "getMeta",
  // 设置某个键的元数据
  "setMeta",
  // 删除某个键的元数据
  "removeMeta",
  // 获取所有键
  "getKeys",
  // 清空存储
  "clear",
  // 挂载子存储
  "mount",
  // 卸载子存储
  "unmount",
];

/**
 * 给存储实例添加前缀。
 * 想象一下，你有一个大仓库（原始的 storage），你想在里面分隔出几个小区域，
 * 每个小区域放不同类别的东西。这个函数就是帮你给每个小区域的门牌号（key）
 * 都加上一个统一的前缀（比如 '水果区:'，'蔬菜区:'），这样就不会混淆了。
 *
 * @param storage 原始的存储实例，就像你的大仓库。
 * @param base 前缀字符串，比如 '水果区:'。
 * @returns 返回一个新的存储实例，所有操作的 key 都会自动加上这个前缀。
 */
export function prefixStorage<T extends StorageValue>(
  storage: Storage<T>, // 传入的大仓库
  base: string // 你想加的前缀，比如 '水果区:'
): Storage<T> {
  // 1. 规范化前缀：确保前缀格式正确，并在末尾加上 ':'
  base = normalizeBaseKey(base);
  // 如果前缀为空，那就不需要包装了，直接返回原始仓库
  if (!base) {
    return storage;
   }

  // 2. 创建一个新的存储对象（nsStorage = namespaced storage），它基于原始仓库
  //    但是我们会修改它的行为，让它的操作都带上前缀
  const nsStorage: Storage<T> = { ...storage }; // 先复制一份原始仓库的功能

  // 3. 遍历所有需要处理的方法名 (比如 setItem, getItem, getKeys 等)
  for (const property of storageKeyProperties) {
    // 4. 重新定义（覆盖）这些方法
    //    @ts-ignore: 这里暂时忽略 TypeScript 的类型检查，因为动态修改方法比较复杂
    nsStorage[property] = (key = "", ...args) =>
      // 当你调用新仓库的方法时 (比如 nsStorage.setItem('苹果', '好吃')):
      // a. 它会拿到你传入的 key ('苹果')
      // b. 在 key 前面加上我们定义的前缀 (base + key => '水果区:苹果')
      // c. 然后调用原始仓库（大仓库）的对应方法，并传入带前缀的 key 和其他参数
      //    (storage.setItem('水果区:苹果', '好吃'))
      // @ts-ignore: 同样忽略类型检查
      storage[property](base + key, ...args);
  }

  // 5. 特殊处理 getKeys 方法
  //    因为原始仓库的 getKeys 返回的是带前缀的键列表 (['水果区:苹果', '水果区:香蕉'])
  //    我们需要把前缀去掉，只返回区域内的键名 (['苹果', '香蕉'])
  nsStorage.getKeys = (key = "", ...arguments_) =>
    storage
      .getKeys(base + key, ...arguments_) // 先用带前缀的 key 从原始仓库获取键列表
      .then((keys) => keys.map((key) => key.slice(base.length))); // 对每个键，去掉前缀部分

  // 6. 特殊处理 getItems 方法 (批量获取)
  //    原理同上：给传入的 keys 加上前缀，调用原始 storage，然后去掉结果中的前缀
  nsStorage.getItems = async <U extends T>(
    items: (string | { key: string; options?: TransactionOptions })[],
    commonOptions?: TransactionOptions
  ) => {
    // 给每个要获取的 key 加上前缀
    const prefixedItems = items.map((item) =>
      typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    // 调用原始仓库的 getItems
    const results = await storage.getItems<U>(prefixedItems, commonOptions);
    // 从结果中移除前缀
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value,
    }));
  };

  // 7. 特殊处理 setItems 方法 (批量设置)
  //    原理类似：给传入的 keys 加上前缀，然后调用原始 storage 的 setItems
  nsStorage.setItems = async <U extends T>(
    items: { key: string; value: U; options?: TransactionOptions }[],
    commonOptions?: TransactionOptions
  ) => {
    // 给每个要设置的 key 加上前缀
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options,
    }));
    // 调用原始仓库的 setItems
    return storage.setItems<U>(prefixedItems, commonOptions);
  };

  // 8. 返回这个经过包装、带命名空间的新仓库实例
  return nsStorage;
}

/**
 * 规范化存储键（key）。
 * 就像整理书包，把乱七八糟的路径符号统一一下，去掉多余的符号。
 * 比如，把 'a/b\c' 或者 'a::b:c:' 变成 'a:b:c'。
 *
 * @param key 原始的键字符串。
 * @returns 返回规范化后的键字符串。
 */
export function normalizeKey(key?: string): string {
  // 如果 key 是空的，直接返回空字符串
  if (!key) {
    return "";
  }
  // 1. 去掉 URL 查询参数部分（如果存在的话），比如 'a:b?param=1' => 'a:b'
  // 2. 把所有的斜杠 '/' 和反斜杠 '\' 替换成冒号 ':'
  // 3. 把连续的多个冒号 ':::' 替换成单个冒号 ':'
  // 4. 去掉开头和结尾可能存在的冒号 ':abc:' => 'abc'
  // 5. 如果处理完变成空了，也返回空字符串
  return (
    key
      .split("?")[0]
      ?.replace(/[/\]/g, ":") // a/b\c => a:b:c
      .replace(/:+/g, ":") // a:::b => a:b
      .replace(/^:|:$/g, "") // :a:b: => a:b
      || ""
  );
}

/**
 * 连接多个键片段。
 * 就像搭积木，把几块（键片段）用冒号连接起来，组成一个完整的键。
 * 比如 joinKeys('a', 'b', 'c') => 'a:b:c'
 *
 * @param keys 键片段数组。
 * @returns 返回连接并规范化后的键字符串。
 */
export function joinKeys(...keys: string[]): string {
  // 先用冒号把所有片段连接起来，然后调用 normalizeKey 进行规范化
  return normalizeKey(keys.join(":"));
}

/**
 * 规范化基础键（base key）。
 * 主要用于 prefixStorage，确保基础键后面有个冒号做分隔符。
 * 比如 'users' => 'users:'，但如果是空字符串 ''，就还是 ''。
 *
 * @param base 原始的基础键字符串。
 * @returns 返回规范化后的基础键，如果非空则末尾带冒号。
 */
export function normalizeBaseKey(base?: string): string {
  // 先用 normalizeKey 处理一下，去掉不规范的字符
  base = normalizeKey(base);
  // 如果处理后 base 不是空的，就在后面加上冒号；否则返回空字符串
  return base ? base + ":" : "";
}

/**
 * 根据“深度”过滤键。
 * 这里的“深度”指的是键中冒号 ':' 的数量。
 * 比如 'a:b:c' 的深度是 2。
 * 这个函数用来判断一个键的深度是否小于等于指定的深度。
 *
 * @param key 要检查的键。
 * @param depth 允许的最大深度 (冒号的数量)。如果 undefined，则不过滤。
 * @returns 如果键的深度符合要求，返回 true，否则返回 false。
 */
export function filterKeyByDepth(
  key: string,
  depth: number | undefined
): boolean {
  // 如果没有指定深度限制，直接返回 true (不过滤)
  if (depth === undefined) {
    return true;
  }

  // 计算 key 中冒号的数量
  let substrCount = 0;
  let index = key.indexOf(":");

  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1); // 从下一个位置继续查找
  }

  // 判断冒号数量是否小于等于指定的深度
  return substrCount <= depth;
}

/**
 * 根据基础路径（base）过滤键。
 * 检查一个键是否以指定的基础路径开头，并且不能是内部使用的元数据键（以 '$' 结尾）。
 *
 * @param key 要检查的键。
 * @param base 指定的基础路径（需要已经 normalize 并带上末尾冒号，如 'users:'）。
 * @returns 如果键符合要求，返回 true，否则返回 false。
 */
export function filterKeyByBase(
  key: string,
  base: string | undefined
): boolean {
  // 如果指定了 base
  if (base) {
    // 检查 key 是否以 base 开头，并且 key 的最后一个字符不是 '$' (内部标记)
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }

  // 如果没有指定 base，则只检查 key 的最后一个字符不是 '$'
  return key[key.length - 1] !== "$";
}
