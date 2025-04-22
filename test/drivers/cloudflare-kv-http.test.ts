// 导入 Vitest 测试框架中的 describe 函数，它就像一个分组器，帮我们把相关的测试放在一起。
import { describe } from "vitest";
// 导入 Cloudflare KV HTTP 驱动，这是我们真正要测试的主角。
// 它负责通过 HTTP 请求和 Cloudflare 的 Key-Value 存储服务打交道。
import cfKvHttpDriver from "../../src/drivers/cloudflare-kv-http";
// 导入一个叫做 testDriver 的工具函数，它是一个测试小帮手，
// 里面封装了测试各种存储驱动的通用逻辑，这样我们就不用重复写很多测试代码了。
import { testDriver } from "./utils";

// 从环境变量里获取 Cloudflare 的账户 ID。
// 环境变量就像一个秘密小纸条，上面写着一些配置信息，比如账号密码啥的。
// 我们从 process.env 这个特殊对象里读取，VITE_CLOUDFLARE_ACC_ID 是这个秘密信息的代号。
const accountId = process.env.VITE_CLOUDFLARE_ACC_ID;
// 从环境变量里获取 Cloudflare KV 的命名空间 ID。
// 命名空间就像是在 Cloudflare KV 里建的一个个小仓库，用来区分不同的数据。
const namespaceId = process.env.VITE_CLOUDFLARE_KV_NS_ID;
// 从环境变量里获取 Cloudflare API 令牌。
// API 令牌就像一把钥匙，有了它，我们的程序才能访问 Cloudflare 的服务。
const apiToken = process.env.VITE_CLOUDFLARE_TOKEN;

// 这里使用 describe.skipIf 来定义一个测试组。
// .skipIf 的意思是“如果条件满足就跳过”。
// 括号里的条件是 !accountId || !namespaceId || !apiToken，意思是：
// 如果账户 ID、命名空间 ID、或者 API 令牌中，有任何一个没有设置（是空的或不存在），
// 那么这个测试组里的所有测试就都不运行了。
// 这是为了确保只有在提供了必要的 Cloudflare 凭证时，才执行与 Cloudflare 相关的测试。
// 这样做很安全，避免了没有钥匙还想开门的情况。
describe.skipIf(!accountId || !namespaceId || !apiToken)(
  // 给这个测试组起个名字，方便我们知道这是在测试啥。
  "drivers: cloudflare-kv-http",
  // 这是一个箭头函数，里面包含了这个测试组要执行的具体内容。
  () => {
    // 调用我们之前导入的 testDriver 测试小帮手。
    testDriver({
      // 告诉 testDriver 我们要测试哪个驱动。
      // 这里我们创建了一个 Cloudflare KV HTTP 驱动的实例。
      driver: () =>
        cfKvHttpDriver({
          // 把从环境变量里拿到的账户 ID 传给驱动。
          // 感叹号 ! 告诉 TypeScript：“别担心，我确定这玩意儿不是空的！”
          accountId: accountId!,
          // 把命名空间 ID 也传给驱动。
          namespaceId: namespaceId!,
          // 把 API 令牌（钥匙）也传给驱动。
          apiToken: apiToken!,
          // 设置一个基础路径 (base)。这就像给存储在这个驱动里的所有键(key)加一个统一的前缀。
          // 这里用了一个随机数生成一个唯一的 base，这样每次测试用的前缀都不一样，
          // 可以避免不同测试之间的数据互相干扰。
          // Math.random() 生成 0 到 1 之间的小数，乘以 100 万，再取整，
          // 然后用 toString(16) 转换成十六进制字符串，看起来更酷一点。
          base: Math.round(Math.random() * 1_000_000).toString(16),
        }),
    });
  }
);
