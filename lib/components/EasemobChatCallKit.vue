<template>
  <!-- <div class="easemob-chat-callkit">
    <h2>Easemob Chat CallKit</h2>
    <p>这是一个Vue3插件示例组件</p>
    <div class="controls">
      <button @click="handleTestAction">测试插件功能</button>
    </div>
  </div> -->
  <slot></slot>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import type { EasemobChatCallKitOptions } from '../types'

// 获取插件配置
const options = inject<EasemobChatCallKitOptions>('easemob-chat-callkit-options')

// 测试方法
const handleTestAction = () => {
  console.log('Easemob Chat CallKit 插件测试成功！')
  console.log('当前配置:', options)
  alert('插件测试成功！配置信息已打印到控制台')
}
</script>

<style scoped>
.easemob-chat-callkit {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  max-width: 400px;
  margin: 20px auto;
}

.easemob-chat-callkit h2 {
  color: #333;
  margin-bottom: 10px;
}

.controls {
  margin-top: 20px;
}

.controls button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background-color: #0056b3;
}
</style>