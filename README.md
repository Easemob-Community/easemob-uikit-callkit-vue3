# Easemob Chat CallKit Vue3

基于 Vue 3 + Pinia + 环信 IM SDK + 声网 RTC SDK 的音视频通话 UI 组件库。

支持 **单人通话（1v1）** 和 **群组通话（多人）**，提供完整的呼叫、接听、挂断、音视频控制等能力。

---

## 📦 两种集成方式

本库提供两种引入方式，根据你的场景选择：

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **方式一：npm / tgz 包引入** | 生产环境、常规项目 | 与源码解耦，构建产物稳定 | 修改源码需重新打包 |
| **方式二：源码 / Vite Alias 引入** | 开发调试、需修改源码 | 实时热更新，修改立即生效 | 仅限 Vite 项目 |

---

## 方式一：npm / tgz 包引入（生产推荐）

### 1. 安装

```bash
# 安装核心依赖
pnpm add easemob-websdk agora-rtc-sdk-ng pinia

# 方式 1a：从 npm 仓库安装（发布到 npm 后）
pnpm add easemob-chat-callkit-vue3

# 方式 1b：从本地 tgz 文件安装（私有部署或未发布时）
pnpm add ./easemob-chat-callkit-vue3-1.0.0.tgz
```

### 2. 全局注册 Pinia

CallKit 依赖 Pinia 进行状态管理，需在你的 `main.ts` 中注册：

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

> ⚠️ **注意**：`easemob-chat-callkit-vue3` 不提供 Vue 插件 `install` 方式。你需要手动 import 组件和 composables，在模板中使用。

### 3. 使用组件

在根组件（如 `App.vue`）中：

```vue
<template>
  <EasemobChatCallKitProvider :chat-client="chatClient" :init-config="{ debug: false }">
    <router-view />
    <!-- 通话邀请通知弹窗 -->
    <InvitationNotification />
    <!-- 单人通话组件（自动显示/隐藏） -->
    <EasemobChatSingleCall />
    <!-- 群组通话组件（autoShow 默认开启） -->
    <EasemobChatMultiCall :group-id="groupId" />
  </EasemobChatCallKitProvider>
</template>

<script setup>
import {
  EasemobChatCallKitProvider,
  InvitationNotification,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
} from 'easemob-chat-callkit-vue3'

// chatClient 是你通过 easemob-websdk 创建的 Connection 实例
const chatClient = /* ... */
const groupId = /* ... */
</script>
```

---

## 方式二：源码 / Vite Alias 引入（开发调试）

适用于**开发期间需要修改 CallKit 源码**的场景。通过 Vite 的 `resolve.alias` 将包名直接映射到源码目录，实现修改即生效。

### 1. 在你的项目中配置 Vite Alias

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'easemob-chat-callkit-vue3': path.resolve(
        __dirname,
        '../easemob-chat-callkit-vue3/lib/index.ts'
      ),
      'easemob-chat-callkit-vue3/style.css': path.resolve(
        __dirname,
        '../easemob-chat-callkit-vue3/lib/style.css'
      ),
    },
  },
})
```

### 2. 安装依赖（不需要安装 callkit 包）

```bash
pnpm add easemob-websdk agora-rtc-sdk-ng pinia
```

### 3. 使用方式与方式一完全相同

import 路径不变，Vite 会自动通过 alias 解析到源码：

```typescript
import { useCallKit } from 'easemob-chat-callkit-vue3'
import 'easemob-chat-callkit-vue3/style.css'
```

---

## 🚀 快速开始（完整示例）

```vue
<template>
  <div>
    <input v-model="targetUserId" placeholder="目标用户ID" />
    <button @click="startCall('audio')">语音通话</button>
    <button @click="startCall('video')">视频通话</button>
    <button @click="handleEndCall">结束通话</button>
  </div>

  <EasemobChatCallKitProvider :chat-client="chatClient">
    <InvitationNotification />
    <EasemobChatSingleCall />
  </EasemobChatCallKitProvider>
</template>

<script setup>
import { ref } from 'vue'
import {
  EasemobChatCallKitProvider,
  InvitationNotification,
  EasemobChatSingleCall,
  useCallKit,
  useEndCall,
} from 'easemob-chat-callkit-vue3'

const targetUserId = ref('')
const chatClient = /* 你的环信 IM 实例 */

const { startSingleCall } = useCallKit()
const { hangup } = useEndCall()

const startCall = async (type) => {
  await startSingleCall(targetUserId.value, type)
}

const handleEndCall = async () => {
  await hangup()
}
</script>
```

---

## 🛠️ 开发 & 测试

### 项目结构

```
easemob-chat-callkit-vue3/
├── lib/                    # 插件源码（用户导入的入口）
│   ├── components/         # Vue 组件
│   ├── composables/        # 组合式 API
│   ├── services/           # 纯 JS 服务层
│   ├── store/              # Pinia Store
│   ├── signaling/          # 信令路由与处理器
│   ├── modules/groupCall/  # 群组通话新模块
│   └── index.ts            # 库入口
├── test/                   # 测试 Demo（验证两种引入方式）
│   ├── src/App.vue         # 演示页面
│   ├── vite.config.source.ts  # 源码模式配置
│   ├── vite.config.tgz.ts     # tgz 包模式配置
│   └── scripts/switch-mode.mjs # 模式切换脚本
├── release/                # 构建产物
│   ├── dist/               # 库构建输出（ES + UMD + d.ts + CSS）
│   └── *.tgz               # 打包后的 npm 包
└── vite.lib.config.ts      # 库的 Vite 构建配置
```

### 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装根目录依赖 |
| `pnpm run test` | 启动测试 Demo（源码模式，实时热更新） |
| `pnpm run test:source` | 同上 |
| `pnpm run test:tgz` | 构建 tgz 包并以包模式启动测试 Demo |
| `pnpm run build:lib` | 构建库到 `release/dist/` |
| `pnpm run build:pack` | 构建并打包为 `release/*.tgz` |

### 验证两种引入方式

本项目在 `test/` 目录中同时论证了两种引入方式：

- **源码模式**：`test/vite.config.source.ts` 通过 Vite alias 将 `easemob-chat-callkit-vue3` 映射到 `../lib/index.ts`
- **tgz 包模式**：`test/vite.config.tgz.ts` 不配置 alias，让 Vite 从 `node_modules` 正常解析已安装的 tgz 包

切换脚本 `test/scripts/switch-mode.mjs` 会自动修改 `test/package.json` 的依赖配置，配合 `pnpm install` 完成模式切换。

---

## 📦 发布流程

1. **开发调试**：使用 `pnpm run test:source` 进行源码模式开发
2. **构建验证**：执行 `pnpm run build:pack` 生成 tgz 包
3. **产物验证**：执行 `pnpm run test:tgz` 验证 tgz 包能否正常工作
4. **发布**：将 `release/easemob-chat-callkit-vue3-*.tgz` 上传到 npm 或私有仓库

---

## 📖 详细使用文档

参见 [`USAGE.md`](./USAGE.md) 了解完整的 API 参考、组件 Props、事件回调和进阶用法。
