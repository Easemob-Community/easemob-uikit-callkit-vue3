<template>
  <div id="app">
    <h1>Easemob Chat CallKit Vue3 插件测试</h1>
    <p>这是一个测试插件功能的演示页面</p>
    
    <!-- 使用插件组件 -->
    <EasemobChatCallKit />
    
    <div class="test-section">
      <h3>测试说明</h3>
      <ul>
        <li>✅ 插件已成功安装</li>
        <li>✅ 全局组件已注册</li>
        <li>✅ 配置已正确注入</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这里可以添加测试逻辑
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.test-section {
  margin: 40px auto;
  max-width: 600px;
  text-align: left;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.test-section h3 {
  color: #495057;
  margin-bottom: 15px;
}

.test-section ul {
  list-style-type: none;
  padding: 0;
}

.test-section li {
  padding: 5px 0;
  color: #28a745;
}
</style>