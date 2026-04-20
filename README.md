# Easemob Chat CallKit Vue3

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 **Vue 3 + 环信 IM SDK + 声网 RTC SDK** 的音视频通话 UI 组件库。内置 Pinia 状态管理，用户无需感知。

支持**单人通话（1v1）**和**群组通话（多人）**，内置完整的呼叫、接听、挂断、音视频控制、邀请通知等能力，开箱即用。

---

## ✨ 特性

- 📞 **单人通话** — 1v1 音频/视频通话，支持呼叫、接听、挂断
- 👥 **群组通话** — 多人音视频通话，支持邀请成员、视频网格布局
- 🔔 **邀请通知** — 被叫方自动弹出接听/拒绝弹窗
- 🎛️ **媒体控制** — 静音、开关摄像头、切换前后置摄像头
- 🖼️ **视频布局** — 单聊悬浮窗、群聊九宫格/主视频模式
- 🎯 **自动显隐** — 组件根据通话状态自动显示/隐藏，无需手动 `v-if`
- 🔧 **两种引入方式** — npm 包或源码 alias，开发调试灵活

---

## 📋 前置条件

- Vue 3 项目
- 已安装 **环信 IM SDK**（`easemob-websdk`）并完成登录
- 已安装 **声网 RTC SDK**（`agora-rtc-sdk-ng`）

```bash
pnpm add vue easemob-websdk agora-rtc-sdk-ng
```

---

## 📦 安装

```bash
# 从 npm 安装（发布后）
pnpm add easemob-chat-callkit-vue3

# 或从本地 tgz 文件安装
pnpm add ./easemob-chat-callkit-vue3-1.0.0.tgz
```

---

## 🚀 快速开始

参见 **[QUICK_START.md](./QUICK_START.md)** — 5 分钟跑通单聊/群聊通话，包含 Pinia 注册、Provider 放置、发起通话完整示例。

> 完整 API 参考、事件订阅、进阶用法参见 [USAGE.md](./USAGE.md)。

---

## 🏗️ 核心概念

### Provider — 通话上下文

`EasemobChatCallKitProvider` 是所有通话组件的根上下文，负责：
- 接收环信 `chatClient` 实例
- 初始化 RTC 服务
- 挂载 IM 消息监听（信令自动处理）
- 管理全局配置（debug、铃声、超时等）

**必须在应用顶层包裹一次**，且内部放置通话相关组件。

### 自动显示/隐藏

- `EasemobChatSingleCall`：当主叫方发起呼叫（`INVITING`）或通话中（`IN_CALL`）时自动显示；被叫响铃（`ALERTING`）时不显示，由 `InvitationNotification` 接管
- `EasemobChatMultiCall`：`autoShow` 默认为 `true`，群组通话状态时自动显示

**不需要写 `v-if`**，直接放在 Provider 内部即可。

### 事件订阅

通过 `useCallKitEvents()` 监听通话生命周期事件，在通话结束后发送系统消息、记录通话时长等：

```typescript
import { useCallKitEvents, HANGUP_REASON } from 'easemob-chat-callkit-vue3'
import { onUnmounted } from 'vue'

const { onCallStarted, onCallEnded, onIncomingCall } = useCallKitEvents()

onCallStarted((e) => {
  console.log('通话接通', e.callId, '主叫:', e.isCaller)
})

onCallEnded((e) => {
  const sec = Math.round(e.duration / 1000)
  console.log('通话结束', '原因:', e.reason, '时长:', sec, '秒')
  // 可在此发送系统消息到聊天会话
})

onIncomingCall((e) => {
  console.log('收到来电', e.callerUserId)
})

// 所有订阅返回解绑函数，建议在 onUnmounted 中调用
```

> 完整事件列表和用法参见 [USAGE.md](./USAGE.md#usecallkitevents)。

### 日志级别

```typescript
import { LogLevel } from 'easemob-chat-callkit-vue3'

<EasemobChatCallKitProvider
  :chat-client="chatClient"
  :init-config="{ logLevel: LogLevel.INFO }"
>
```

| 级别 | 说明 |
|------|------|
| `LogLevel.ERROR` | 只输出错误 |
| `LogLevel.WARN` | 错误 + 警告 |
| `LogLevel.INFO` | 推荐生产环境 |
| `LogLevel.DEBUG` | 开发调试 |
| `LogLevel.VERBOSE` | 完整信令日志 |

---

## 🔧 两种集成方式

| 方式 | 适用场景 | 配置 |
|------|---------|------|
| **npm / tgz 包** | 生产环境 | 正常 `pnpm add` 安装 |
| **源码 alias** | 开发调试 | Vite `resolve.alias` 映射到 `lib/index.ts` |

### 源码模式配置（Vite）

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

---

## 🛠️ 开发 & 测试

```bash
# 安装依赖
pnpm install

# 源码模式开发（实时热更新）
pnpm run test:source

# 构建并测试 tgz 包
pnpm run test:tgz

# 仅构建库
pnpm run build:lib
```

---

## 📖 详细文档

- **[USAGE.md](./USAGE.md)** — 完整的 API 参考、组件 Props、事件、Store、进阶用法

---

## 📄 License

[MIT](./LICENSE)
