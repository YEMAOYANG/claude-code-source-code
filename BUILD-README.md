# 从零构建 Claude Code v2.1.88（反编译源码）

> 本文档详细记录了如何从反编译的 Claude Code v2.1.88 源码出发，完成所有补丁修复，并让它真正运行起来的完整流程。

---

## 目录

1. [前置条件](#1-前置条件)
2. [克隆仓库 + 切换分支](#2-克隆仓库--切换分支)
3. [安装依赖](#3-安装依赖)
4. [已做的所有 Patch 说明](#4-已做的所有-patch-说明)
5. [如何运行](#5-如何运行)
6. [API 配置方式](#6-api-配置方式)
7. [已知问题和限制](#7-已知问题和限制)

---

## 1. 前置条件

| 工具 | 最低版本 | 说明 |
|------|---------|------|
| **Node.js** | >= 18 | 推荐 20+；esbuild 构建脚本需要 |
| **Bun** | 最新版 | 用于运行源码和管理依赖 |
| **Git** | 任意 | 克隆仓库和分支切换 |

### 安装 Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

安装完成后验证：

```bash
bun --version
```

---

## 2. 克隆仓库 + 切换分支

```bash
# 克隆仓库
git clone https://github.com/YEMAOYANG/claude-code-source-code.git

# 进入项目目录
cd claude-code-source-code

# 切换到构建分支
git checkout build/esbuild-v2.1.88
```

> **说明**：`build/esbuild-v2.1.88` 分支包含所有已打好的补丁，可以直接安装依赖后运行。`main` 分支是原始反编译代码。

---

## 3. 安装依赖

```bash
# 使用 bun 安装所有依赖（根据 bun.lock 锁定版本）
bun install
```

项目根目录的 `bunfig.toml` 已配置 `.md` 和 `.txt` 文件的 text loader：

```toml
[loader]
".md" = "text"
".txt" = "text"
```

这是因为源码中多处 `import` 了 `.md` 和 `.txt` 文件作为字符串内容（如 prompt 模板、SKILL.md 等）。

---

## 4. 已做的所有 Patch 说明

> 这是本文档最核心的部分。反编译源码无法直接运行，需要大量补丁工作。所有补丁集中在两个 commit 中。

### 背景：为什么需要打补丁？

Claude Code 官方使用 **Bun 运行时**进行构建，依赖了大量 Bun 编译时特性：

- `feature('FLAG')` — Bun 在编译时解析为 `true`/`false`，并做死代码消除
- `MACRO.VERSION` 等 — Bun 的 `--define` 在编译时替换为字面量
- `bun:bundle` — Bun 内部模块，提供 `feature()` 函数
- `bun:ffi` — Bun 的 FFI 接口，用于原生代理支持
- 约 108 个内部模块 — Anthropic 内部未发布的模块，通过 `feature()` 门控

反编译源码中这些特性全部留存，直接运行会报大量错误。

---

### Commit 1: `feat: esbuild build from source (v2.1.88)`

> commit `f507355` | 337 files changed

这是基础构建补丁，解决了源码到可编译状态的所有问题。

#### 4.1 源码文件修补（233 个文件）

| 修补类型 | 数量 | 说明 |
|---------|------|------|
| `feature('FLAG')` → `false` | ~200+ 处 | Bun 编译时特性门控，全部替换为 `false` |
| `MACRO.*` 宏替换 | ~50+ 处 | 编译时常量替换为字面量字符串 |
| `bun:bundle` 导入替换 | ~30+ 处 | 替换为本地 stub 文件 `stubs/bun-bundle.js` |

**MACRO 替换对照表**：

| 原始宏 | 替换值 |
|--------|-------|
| `MACRO.VERSION` | `'2.1.88'` |
| `MACRO.BUILD_TIME` | `''` |
| `MACRO.FEEDBACK_CHANNEL` | `'https://github.com/anthropics/claude-code/issues'` |
| `MACRO.ISSUES_EXPLAINER` | `'https://github.com/anthropics/claude-code/issues/new/choose'` |
| `MACRO.NATIVE_PACKAGE_URL` | `'@anthropic-ai/claude-code'` |
| `MACRO.PACKAGE_URL` | `'@anthropic-ai/claude-code'` |
| `MACRO.VERSION_CHANGELOG` | `''` |

#### 4.2 创建 Stub 模块（78 个文件覆盖 108 个缺失模块）

这些模块是 Anthropic 内部未发布的，或者被 `feature()` 门控的功能模块。它们在官方构建中会被死代码消除，但在我们的环境中需要创建 stub 文件来避免导入错误。

**主要 stub 模块分类**：

| 分类 | stub 文件 | 说明 |
|------|----------|------|
| **Assistant** | `assistant/index.js`、`src/assistant/index.js` | Kairos 助手功能 |
| **Bridge** | `bridge/peerSessions.js`、`src/bridge/peerSessions.js` | 对等会话桥接 |
| **Coordinator** | `coordinator/workerAgent.js` | 多 agent 协调模式 |
| **Proactive** | `proactive/index.js` | 主动功能模块 |
| **Compact** | `services/compact/reactiveCompact.js`、`snipCompact.js`、`snipProjection.js`、`cachedMCConfig.js`、`cachedMicrocompact.js` | 上下文压缩服务 |
| **Context Collapse** | `services/contextCollapse/index.js`、`operations.js`、`persist.js` | 上下文折叠服务 |
| **Skill Search** | `services/skillSearch/featureCheck.js`、`remoteSkillLoader.js`、`remoteSkillState.js`、`telemetry.js`、`prefetch.js`、`localSearch.js` | 技能搜索服务 |
| **MCP Skills** | `skills/mcpSkills.js` | MCP 技能模块 |
| **Commands** | `commands/agents-platform/`、`commands/buddy/`、`commands/force-snip.js`、`commands/fork/`、`commands/peers/`、`commands/proactive.js`、`commands/workflows/` 等 | 各种命令模块 |
| **Tools** | `tools/TungstenTool/`、`tools/WorkflowTool/`、`tools/WebBrowserTool/`、`tools/REPLTool/`、`tools/CtxInspectTool/` 等 | 工具模块 |
| **Utils** | `utils/protectedNamespace.js`、`utils/udsClient.js`、`utils/udsMessaging.js`、`utils/systemThemeWatcher.js` 等 | 工具函数 |

#### 4.3 修复命名导出冲突

部分 stub 模块的导出名与其他模块冲突，需要特殊处理：

- **TungstenTool** — 工具名称冲突
- **connectorText** — 类型导出冲突
- **WorkflowTool** — 工具导出冲突

#### 4.4 其他修复

- 添加 `isReplBridgeActive` stub 到 `src/bootstrap/state.ts`
- 添加 `.md`/`.txt` 的 esbuild loader 支持
- 产出：`dist/cli.js`（20MB CJS bundle，`node dist/cli.js --version` = 2.1.88）

---

### Commit 2: `fix: disable internal Anthropic network requests, enable external API usage`

> commit `370387c` | 11 files changed

这是让源码真正可用的关键补丁——禁用了所有内部 Anthropic 网络请求，使得可以通过标准 API 方式调用。

#### 4.5 禁用 Grove 服务

**文件**：`src/services/api/grove.ts`

```typescript
// 修改前：复杂的 grove 资格检查逻辑
export async function isQualifiedForGrove(): Promise<boolean> {
  if (!isConsumerSubscriber()) { return false }
  // ... 网络请求检查 ...
}

// 修改后：直接返回 false，跳过所有 grove 相关网络请求
export async function isQualifiedForGrove(): Promise<boolean> { return false;
  // ... 原有代码保留但不执行 ...
}
```

> Grove 是 Anthropic 内部的 API 网关服务，外部用户无法访问。

#### 4.6 禁用远程托管设置加载

**文件**：`src/services/remoteManagedSettings/index.ts`

```typescript
// 修改后：直接返回，不等待远程设置加载
export async function waitForRemoteManagedSettingsToLoad(): Promise<void> { return;
  // ... 原有代码保留但不执行 ...
}
```

> 远程托管设置用于企业客户的配置下发，外部环境不需要。

#### 4.7 跳过 GrowthBook 初始化

**文件**：`src/cli/print.ts`

```typescript
// 在 print.ts 顶部导入 feature stub，使 GrowthBook 初始化被跳过
import { feature } from '../stubs/bun-bundle.js'
```

> GrowthBook 是 Anthropic 使用的特性开关（Feature Flag）服务，外部无法连接。

#### 4.8 修复 main.tsx 入口

**文件**：`src/main.tsx`

- 添加 `import { setup as _staticSetup } from "./setup.js"` — 确保初始化代码正确执行
- 修复 `feature` 导入路径

#### 4.9 修复 Commander Flag 格式

**文件**：`src/entrypoints/cli.tsx`

- 添加调试日志：`console.error("[DEBUG] cli.tsx loading...")`
- 修复短 flag 格式问题（`-d2e` → `--d2e`），避免 commander 解析错误

#### 4.10 配置 bunfig.toml

```toml
[loader]
".md" = "text"
".txt" = "text"
```

> Bun 需要明确配置才能将 `.md` 和 `.txt` 文件作为 text 导入。

#### 4.11 添加 Stub 依赖

在 `package.json` 中添加了大量依赖，确保所有 `import` 路径都能正确解析。

---

## 5. 如何运行

### 5.1 检查版本

```bash
bun run src/entrypoints/cli.tsx --version
```

预期输出：

```
2.1.88 (Claude Code)
```

### 5.2 非交互模式（推荐 ✅）

使用 `-p`（print）模式直接发送 prompt 并获取响应：

```bash
# 基本用法
bun run src/entrypoints/cli.tsx -p "你好，请介绍你自己"

# 指定工作目录中的代码任务
cd ~/my-project
bun run ~/claude-code-source-code/src/entrypoints/cli.tsx -p "请分析这个项目的目录结构"
```

### 5.3 交互模式（实验性）

```bash
bun run src/entrypoints/cli.tsx
```

> ⚠️ 交互模式（REPL）可能存在兼容性问题，推荐优先使用 `-p` 模式。

---

## 6. API 配置方式

Claude Code 通过**环境变量**配置 API 访问。

### 6.1 使用 Anthropic 官方 API

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

bun run src/entrypoints/cli.tsx -p "Hello"
```

### 6.2 使用第三方兼容 API（推荐）

支持任何兼容 Anthropic API 格式的服务（如 OpenRouter、自建代理等）：

```bash
export ANTHROPIC_BASE_URL=https://your-api-proxy.com/v1
export ANTHROPIC_API_KEY=your-api-key

bun run src/entrypoints/cli.tsx -p "Hello"
```

### 6.3 一行命令（临时设置）

```bash
ANTHROPIC_BASE_URL=https://your-proxy.com/v1 \
ANTHROPIC_API_KEY=your-key \
bun run src/entrypoints/cli.tsx -p "Hello"
```

### 6.4 环境变量一览

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `ANTHROPIC_API_KEY` | API 密钥（必填） | `sk-ant-xxx` |
| `ANTHROPIC_BASE_URL` | API 基础 URL（可选，默认 Anthropic 官方） | `https://api.anthropic.com` |

---

## 7. 已知问题和限制

### 7.1 功能限制

这是反编译源码，不是官方构建。所有 `feature('FLAG')` 特性门控被设为 `false`，以下功能**不可用**：

| 特性 Flag | 功能说明 | 状态 |
|-----------|---------|------|
| `COORDINATOR_MODE` | 多 Agent 协调模式 | ❌ 不可用 |
| `KAIROS` | Assistant 助手功能 | ❌ 不可用 |
| `TRANSCRIPT_CLASSIFIER` | 转录分类器（自动权限判断） | ❌ 不可用 |
| `DIRECT_CONNECT` | 直接连接模式 | ❌ 不可用 |
| `LODESTONE` | Anthropic 内部服务 | ❌ 不可用 |
| `SSH_REMOTE` | SSH 远程连接 | ❌ 不可用 |
| 其他内部特性 | 各种实验性功能 | ❌ 不可用 |

### 7.2 被禁用的内部服务

| 服务 | 说明 | 处理方式 |
|------|------|---------|
| **Grove** | Anthropic 内部 API 网关 | `isQualifiedForGrove()` 返回 `false` |
| **Remote Managed Settings** | 企业远程配置 | `waitForRemoteManagedSettingsToLoad()` 直接返回 |
| **GrowthBook** | 特性开关服务 | 初始化被跳过 |
| **Telemetry/Analytics** | 遥测数据上报 | 已 stub，不会发送数据到 Anthropic |
| **Auto Updater** | 自动更新检查 | 已禁用 |
| **bun:ffi** | Bun FFI 原生接口 | 已 stub |

### 7.3 其他已知问题

1. **约 108 个内部模块被 stub 化** — 这些模块在 Anthropic 内部仓库中存在，但未包含在发布源码中。被 stub 的模块导出空函数/对象，不影响核心功能。

2. **交互模式兼容性** — REPL 交互模式可能存在 UI 渲染问题，推荐使用 `-p` 非交互模式。

3. **部分生成的类型文件缺失** — 如 `src/entrypoints/sdk/coreTypes.generated.js` 等，已创建 stub。

4. **esbuild 构建产物** — `dist/cli.js` 可通过 `node dist/cli.js` 运行，但推荐使用 `bun run src/entrypoints/cli.tsx` 直接从源码运行以获得更好的兼容性。

---

## 项目结构概览

```
claude-code-source-code/
├── src/                          # TypeScript 源码（1,884 文件）
│   ├── entrypoints/
│   │   ├── cli.tsx               # CLI 入口 ← 运行这个
│   │   ├── mcp.ts                # MCP 入口
│   │   └── sdk/                  # SDK 入口
│   ├── main.tsx                  # 主逻辑
│   ├── setup.ts                  # 初始化
│   ├── commands/                 # 命令实现
│   ├── components/               # Ink (React) UI 组件
│   ├── services/                 # 服务层
│   ├── tools/                    # 工具实现（Bash、Agent、File 等）
│   ├── utils/                    # 工具函数
│   └── stubs/                    # Bun 编译时特性的 stub
│       └── bun-bundle.js         # feature() 函数 stub
├── stubs/                        # 顶层 stub 文件
│   ├── bun-bundle.js
│   ├── bun-ffi.ts
│   └── global.d.ts
├── scripts/
│   └── build.mjs                 # esbuild 构建脚本
├── dist/                         # 构建产出目录
│   └── cli.js                    # 构建后的 bundle（20MB）
├── package.json                  # 依赖配置
├── bun.lock                      # Bun 锁文件
├── bunfig.toml                   # Bun 配置（loader）
├── QUICKSTART.md                 # 快速开始（英文）
└── BUILD-README.md               # 本文件
```

---

## 许可声明

⚠️ **本仓库仅用于研究和学习目的。**

Claude Code 的版权归 [Anthropic](https://www.anthropic.com/) 所有。本仓库中的代码来源于 npm 发布包的反编译，不包含任何官方未公开的内部代码。所有 stub 模块均为社区创建的空实现。

请勿将本仓库用于商业用途。如需使用 Claude Code，请通过 [Anthropic 官方渠道](https://claude.ai/) 获取。
