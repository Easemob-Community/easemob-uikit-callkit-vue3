# Easemob Chat CallKit Vue3 插件

这是一个Vue3插件项目，用于集成环信聊天和通话功能。

## 项目结构

```
easemob-chat-callkit-vue3/
├── lib/                          # 插件源码目录
│   ├── components/               # 插件组件
│   │   └── EasemobChatCallKit.vue # 主组件
│   ├── types.ts                # 类型定义
│   └── index.ts                # 插件入口文件
├── test/                       # 测试环境
│   ├── src/
│   │   ├── App.vue             # 测试页面
│   │   └── main.ts             # 测试入口
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── vite.lib.config.ts          # 插件构建配置
└── package.json
```

## 开发说明

### 1. 安装依赖

```bash
# 安装主项目依赖
pnpm install

# 安装测试环境依赖
cd test && pnpm install
```

### 2. 运行测试

```bash
# 运行测试环境
pnpm test

# 或手动运行
# cd test && pnpm dev
```

### 3. 构建插件

```bash
# 构建插件库文件
pnpm build:lib
```

构建产物将输出到 `dist/` 目录。

## 使用示例

### 安装插件

```typescript
import { createApp } from 'vue'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'

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

## 开发计划

- [ ] 完善聊天功能
- [ ] 集成音视频通话
- [ ] 添加消息推送
- [ ] 支持群组聊天
- [ ] 优化UI界面

## 注意事项

1. 当前为插件基础结构，具体业务逻辑需要后续开发
2. 测试环境用于验证插件集成效果
3. 构建前请确保所有依赖已安装
