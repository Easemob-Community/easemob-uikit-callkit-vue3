<template>
  <div class="home-container">
    <div class="home-header">
      <h1>Easemob Chat CallKit Vue3</h1>
      <p class="subtitle">测试环境入口</p>
    </div>

    <div class="card-grid">
      <!-- Full 测试 -->
      <router-link to="/full-test" class="test-card full">
        <div class="card-icon">🎬</div>
        <h2>Full 测试</h2>
        <p class="card-desc">完整 UI 组件测试，包含单人通话、群组通话、事件日志等全部功能演示</p>
        <ul class="card-features">
          <li>EasemobChatSingleCall 组件</li>
          <li>EasemobChatMultiCall 组件</li>
          <li>InvitationNotification 组件</li>
          <li>IDB 日志调试面板</li>
        </ul>
        <span class="card-action">进入 →</span>
      </router-link>

      <!-- Core 测试 -->
      <router-link to="/core-test" class="test-card core">
        <div class="card-icon">⚙️</div>
        <h2>Core 测试</h2>
        <p class="card-desc">仅测试 callkit-core 信令层，完全隔离 UI 组件，验证核心逻辑</p>
        <ul class="card-features">
          <li>CallKitCore 信令收发</li>
          <li>状态机流转验证</li>
          <li>纯逻辑层测试面板</li>
        </ul>
        <span class="card-action">进入 →</span>
      </router-link>
    </div>

    <div class="home-footer">
      <p>选择一个测试模式开始调试</p>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.home-header {
  text-align: center;
  margin-bottom: 50px;
}

.home-header h1 {
  margin: 0;
  font-size: 32px;
  color: #1a1a1a;
}

.subtitle {
  margin: 10px 0 0;
  font-size: 16px;
  color: #666;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 24px;
}

.test-card {
  display: flex;
  flex-direction: column;
  padding: 32px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #e0e0e0;
  background: #fff;
}

.test-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.test-card.full {
  border-top: 4px solid #28a745;
}

.test-card.core {
  border-top: 4px solid #4A90D9;
}

.card-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.test-card h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #333;
}

.card-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.card-features {
  margin: 0 0 20px;
  padding-left: 20px;
  font-size: 13px;
  color: #555;
  line-height: 1.8;
  flex: 1;
}

.card-action {
  font-size: 14px;
  font-weight: 600;
  color: #007bff;
  align-self: flex-start;
}

.test-card.full .card-action { color: #28a745; }
.test-card.core .card-action { color: #4A90D9; }

.home-footer {
  text-align: center;
  margin-top: 40px;
  color: #999;
  font-size: 14px;
}
</style>
