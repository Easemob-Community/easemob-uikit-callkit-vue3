# Easemob Chat CallKit Vue3 插件

这是一个 Vue3 插件项目，用于集成环信聊天和音视频通话功能。

## 项目结构

```
easemob-chat-callkit-vue3/
├── lib/                          # 插件源码目录
│   ├── components/               # 组件
│   ├── composables/              # 组合式函数
│   ├── core/                     # 核心逻辑
│   ├── services/                 # 服务层
│   ├── store/                    # Pinia Store
│   ├── types/                    # 类型定义
│   ├── utils/                    # 工具函数
│   ├── index.ts                  # 插件入口
│   └── style.css                 # 插件样式
├── test/                         # 测试 Demo 目录
│   ├── src/                      # 测试页面源码
│   ├── scripts/                  # 辅助脚本
│   │   └── switch-mode.mjs       # 模式切换脚本
│   ├── vite.config.source.ts     # 源码模式配置
│   ├── vite.config.tgz.ts        # tgz 包模式配置
│   └── package.json
├── release/                      # 构建产物目录
│   └── dist/                     # 库构建输出
├── vite.config.ts                # 开发环境配置
├── vite.lib.config.ts            # 库构建配置
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录安装依赖
pnpm install

# 注意：不需要手动进入 test 目录安装依赖
# 启动脚本会自动处理 test 目录的依赖
```

### 2. 启动测试环境

本项目提供两种验证模式，**两种模式互不干扰**，会自动切换依赖配置：

#### 模式一：源码模式（推荐开发时使用）

直接引用 `lib/` 目录下的源代码，修改代码后实时生效，适合开发调试。

```bash
# 在项目根目录执行
pnpm run test

# 或
pnpm run test:source
```

> 💡 **自动切换机制**：执行此命令时会自动将 `test/package.json` 切换到源码模式（移除 tgz 依赖），确保加载的是 `lib/` 目录下的源代码。

#### 模式二：tgz 包模式（推荐发布前验证）

使用打包后的 `.tgz` 文件作为依赖，模拟真实用户使用场景，验证构建产物是否正确。

```bash
# 在项目根目录执行（会自动构建 tgz 包并启动）
pnpm run test:tgz
```

> 💡 **自动构建机制**：执行此命令时会先构建最新的 tgz 包，然后自动将 `test/package.json` 切换到 tgz 模式，确保加载的是打包后的产物。

### 3. 访问测试页面

启动后会显示访问地址，默认是：
- 本地：`http://localhost:5173`
- 网络：`http://localhost:5173`

## 开发指南

### 在 test 目录内切换模式（手动切换）

如果你已经在 `test` 目录中，也可以手动切换验证模式：

```bash
cd test

# 切换到源码模式（移除 tgz 依赖，安装源码依赖）
pnpm run switch:source

# 切换到 tgz 包模式（添加 tgz 依赖并安装）
# 注意：需先在根目录执行 pnpm run build:pack 生成 tgz 包
pnpm run switch:tgz

# 启动开发服务器
pnpm run dev:source   # 源码模式
pnpm run dev:tgz      # tgz 包模式
```

> ⚠️ **注意**：`test/package.json` 中的依赖配置会在切换时被修改，请勿将此文件提交到版本控制（已配置在 `.gitignore` 中）。

### 构建插件

```bash
# 构建库文件（输出到 release/dist/，每次构建会自动清空目录）
pnpm run build:lib

# 构建并打包为 tgz 文件（输出到 release/ 目录）
pnpm run build:pack
```

## 可用脚本

### 根目录脚本

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 启动根目录开发服务器（一般不用） |
| `pnpm run test` | 启动测试环境（源码模式） |
| `pnpm run test:source` | 启动源码验证模式 |
| `pnpm run test:tgz` | 构建 tgz 包并启动 tgz 验证模式 |
| `pnpm run build:lib` | 构建库文件到 `release/dist/` |
| `pnpm run build:pack` | 构建并打包为 tgz 文件 |

### test 目录脚本

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 启动当前模式的开发服务器 |
| `pnpm run dev:source` | 以源码模式启动 |
| `pnpm run dev:tgz` | 以 tgz 包模式启动 |
| `pnpm run switch:source` | 切换到源码模式并安装依赖 |
| `pnpm run switch:tgz` | 切换到 tgz 模式并安装依赖 |

## 使用示例

### 安装插件

```typescript
import { createApp } from 'vue'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)

app.use(EasemobChatCallKit, {
  appKey: 'your-app-key',
  userId: 'user-id',
  accessToken: 'access-token',
  debug: false
})

app.mount('#app')
```

### 在组件中使用

```vue
<template>
  <div>
    <EasemobChatCallKit />
  </div>
</template>
```

## 发布流程

1. **开发调试**：使用 `pnpm run test:source` 进行开发
2. **构建验证**：执行 `pnpm run test:tgz` 验证构建产物
3. **打包发布**：执行 `pnpm run build:pack` 生成 tgz 文件
4. **发布**：将 `release/easemob-chat-callkit-vue3-*.tgz` 上传到 npm 或私有仓库

## 注意事项

1. **构建前会自动清空**：每次执行 `pnpm run build:lib` 或 `pnpm run build:pack` 时，会自动清空 `release/dist/` 目录，确保产物是最新的。

2. **tgz 模式需要先构建**：使用 `pnpm run test:tgz` 或 `pnpm run switch:tgz` 前，需要先在根目录执行 `pnpm run build:pack` 生成 tgz 文件。

3. **切换模式后需要重新安装依赖**：切换验证模式后会自动执行 `pnpm install`，请耐心等待安装完成。
