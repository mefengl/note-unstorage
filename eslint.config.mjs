/**
 * @file eslint.config.mjs
 * @description ESLint 配置文件。
 *
 * 这个文件定义了 unstorage 项目的代码风格和质量检查规则。
 * 它使用了 unjs 团队提供的共享 ESLint 配置 (eslint-config-unjs) 作为基础，
 * 并在此基础上进行了一些自定义。
 */

// 导入 unjs 的共享 ESLint 配置工厂函数
import unjs from "eslint-config-unjs";

// 导出 ESLint 配置对象
// unjs() 函数会返回一个预设的配置数组，包含了推荐的规则集。
export default unjs({
  // ignores: 指定 ESLint 应忽略检查的文件或目录模式
  ignores: [
    // "drivers": 忽略 'drivers' 目录。这通常是因为构建后生成的驱动代码不需要 lint。
    "drivers",
    // "/server*": 忽略根目录下以 'server' 开头的文件，例如构建后的 server.mjs/server.cjs。
    "/server*",
    // "docs/.*": 忽略 'docs' 目录下的所有文件和目录。文档通常不需要 lint。
    "docs/.*"
  ],

  // rules: 自定义或覆盖基础配置中的规则
  // 这里将一系列 unicorn 和 typescript-eslint 的规则设置为 0 (即禁用)。
  // 这表示项目维护者认为这些特定的规则不适用于本项目，或者过于严格。
  rules: {
    // "unicorn/no-null": 0 - 允许使用 null (基础配置可能禁止)
    "unicorn/no-null": 0,
    // "unicorn/prevent-abbreviations": 0 - 允许使用常见的缩写 (如 req, res, err)
    "unicorn/prevent-abbreviations": 0,
    // "@typescript-eslint/no-non-null-assertion": 0 - 允许使用非空断言 (!)
    "@typescript-eslint/no-non-null-assertion": 0,
    // "unicorn/prefer-string-replace-all": 0 - 不强制要求使用 replaceAll 替换全局的 replace
    "unicorn/prefer-string-replace-all": 0,
    // "unicorn/prefer-at": 0 - 不强制要求使用 .at() 替代 [] 进行索引访问
    "unicorn/prefer-at": 0,
    // "unicorn/catch-error-name": 0 - 不强制要求 catch 语句中的错误变量名称 (例如必须是 error)
    "unicorn/catch-error-name": 0,
    // "unicorn/prefer-logical-operator-over-ternary": 0 - 不强制要求用逻辑运算符替代简单的三元表达式
    "unicorn/prefer-logical-operator-over-ternary": 0,
    // "unicorn/prefer-ternary": 0 - 不强制要求在某些情况下使用三元表达式
    "unicorn/prefer-ternary": 0,
    // "unicorn/prefer-string-raw": 0 - 不强制要求对包含特殊字符的字符串使用模板字面量 `String.raw`
    "unicorn/prefer-string-raw": 0,
    // "@typescript-eslint/no-empty-object-type": 0 - 允许使用空对象类型 `{}` (基础配置可能建议使用 Record<string, never>)
    "@typescript-eslint/no-empty-object-type": 0,
    // "unicorn/prefer-global-this": 0 - 允许使用 window 或 self 而不是强制 globalThis
    "unicorn/prefer-global-this": 0, // 原始注释提到是用于 window. usage
  },
});
