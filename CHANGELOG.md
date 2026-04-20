# Changelog

## 1.0.1 (2026-04-20)

### 修复
- **语音通话样式**：修复语音模式下页面半透明、头像毛玻璃效果残留、文字看不清等问题，语音与视频使用独立视觉风格
- **miniCore 兼容性**：
  - 兼容环信 IM SDK miniCore 版本的消息创建 API（`client.Message.create`）
  - 兼容 miniCore 插件模式的用户属性 API（`client.contact.fetchUserInfoById`）
  - 兼容 miniCore 插件模式的群组 API（`client.group.getGroupMembers`）
  - 新增 `isMiniCore` Provider 配置项，显式切换调用方式
- **样式文件版本控制**：修复 `lib/style.css` 被 `.gitignore` 排除导致其他开发者 build 失败的问题

### 优化
- **包体积**：Pinia 内部消化，无需用户项目手动安装；Agora/IM 外部化后 ESM 338KB / UMD 248KB
- **Plugin 类型**：`install(app, ...options: any[])` 兼容 Vue 3.5 严格类型

## 1.0.0 (2026-04-18)

### 首次发布
- Vue3 + Vite + Pinia 架构的单聊/群聊音视频通话组件库
- 支持 Agora RTC 外部传入客户端实例
- 支持环信 IM SDK 外部化依赖
