<script setup lang="ts">
import { ref } from 'vue'
import SDK from 'easemob-websdk'
import CallKitCoreTestHarness from '../../packages/callkit-vue3/src/demo/CallKitCoreTestHarness.vue'

const chatClient = ref<any>(null)
const isLoggedIn = ref(false)
const loginUserId = ref('')
const loginPassword = ref('')

// 初始化环信客户端
const connection = new SDK.connection({
  appKey: 'easemob-demo#support',
  isFixedDeviceId: false,
})
chatClient.value = connection

function handleLogin() {
  if (!loginUserId.value || !loginPassword.value) {
    alert('请输入用户ID和密码')
    return
  }
  connection.open({
    user: loginUserId.value,
    pwd: loginPassword.value,
  }).then(() => {
    isLoggedIn.value = true
    console.log('登录成功')
  }).catch((error: any) => {
    console.error('登录失败:', error)
    alert(`登录失败: ${error.message || '未知错误'}`)
  })
}
</script>

<template>
  <div id="app">
    <div class="header">
      <h1>CallKit Core 独立测试环境</h1>
      <p class="subtitle">完全隔离 lib 层，仅测试 callkit-core 信令</p>
    </div>

    <!-- 登录区域 -->
    <div v-if="!isLoggedIn" class="login-section">
      <h3>登录环信</h3>
      <div class="login-form">
        <input v-model="loginUserId" placeholder="输入用户ID" class="input-field" />
        <input v-model="loginPassword" type="password" placeholder="输入密码" class="input-field" />
        <button @click="handleLogin" class="btn login-btn">登录</button>
      </div>
    </div>

    <!-- CallKit Core 测试面板 -->
    <div v-else>
      <div class="logged-in-info">
        当前用户: <strong>{{ loginUserId }}</strong>
      </div>
      <CallKitCoreTestHarness :im-client="chatClient" :sdk="SDK" />
    </div>
  </div>
</template>

<style scoped>
#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #4A90D9;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: #666;
}

.login-section {
  margin: 40px 0;
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 300px;
}

.input-field {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background-color: #4A90D9;
  color: white;
}

.login-btn {
  background-color: #4CAF50;
}

.logged-in-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
}
</style>
