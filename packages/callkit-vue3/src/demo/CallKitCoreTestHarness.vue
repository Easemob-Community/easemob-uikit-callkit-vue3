<!--
  CallKitCoreTestHarness.vue

  可视化测试面板 - 用于验证 callkit-core 修复后的所有信令流程。

  测试场景覆盖：
  1. 单聊：主叫发起 - 被叫收到 incomingCall - 被叫接受 - 双方 IN_CALL - 一方挂断
  2. 单聊超时：主叫发起 - 30s 后收到 callTimeout + callEnded（Critical #1）
  3. 忙线拒绝：通话中收到新 invite - 自动回 busy（Critical #2）
  4. 群聊：主叫发起 - 被叫收到 - 被叫接受 - 等待 confirmCallee - 加入 RTC（Critical #4）
  5. 过期消息过滤：验证过期 invite/CMD 被正确忽略（Critical #3）

  使用方式：
  import CallKitCoreTestHarness from './demo/CallKitCoreTestHarness.vue'
  然后在模板中：
  <CallKitCoreTestHarness :im-client="conn" />
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallKitCore } from '../composables/useCallKitCore'
import { CALL_STATUS, CALL_TYPE } from '@easemob/callkit-core'

const props = defineProps<{
  imClient: any
  /** SDK 模块（full 版 easemob-websdk 的默认导出），用于 SDK.message.create() */
  sdk?: any
}>()

const {
  callState,
  groupSession,
  groupParticipants,
  lastEvent,
  eventLog,
  error,
  isInitialized,
  init,
  inviteCall,
  answerCall,
  hangup,
  inviteGroupCall,
  toggleAudio,
  toggleVideo,
  destroy,
} = useCallKitCore()

// ─── 表单状态 ───
const targetUserId = ref('')
const groupId = ref('')
const groupMembers = ref('')
const callTypeSelect = ref<'audio' | 'video'>('audio')

// ─── 计算属性 ───
const statusName = computed(() => {
  const names: Record<number, string> = {
    [CALL_STATUS.IDLE]: 'IDLE',
    [CALL_STATUS.INVITING]: 'INVITING',
    [CALL_STATUS.ALERTING]: 'ALERTING',
    [CALL_STATUS.CONFIRM_RING]: 'CONFIRM_RING',
    [CALL_STATUS.RECEIVED_CONFIRM_RING]: 'RECEIVED_CONFIRM_RING',
    [CALL_STATUS.ANSWER_CALL]: 'ANSWER_CALL',
    [CALL_STATUS.CONFIRM_CALLEE]: 'CONFIRM_CALLEE',
    [CALL_STATUS.IN_CALL]: 'IN_CALL',
  }
  return names[callState.status] || `UNKNOWN(${callState.status})`
})

const isInCall = computed(() => callState.status === CALL_STATUS.IN_CALL)
const isRinging = computed(() =>
  callState.status === CALL_STATUS.ALERTING ||
  callState.status === CALL_STATUS.RECEIVED_CONFIRM_RING
)
const isIdle = computed(() => callState.status === CALL_STATUS.IDLE)

// ─── 操作 ───
function doInit() {
  // 构建 createMessage 工厂：优先用外部传入的 SDK 模块，fallback 尝试 imClient 上的 API
  const sdkModule = props.sdk
  const createMessage = sdkModule?.message?.create
    ? (options: any) => sdkModule.message.create(options)
    : undefined

  init({
    imClient: props.imClient,
    inviteTimeout: 30000,
    createMessage,
    onUIEvent: (event) => {
      console.log('[TestHarness] UI Event:', event.type, event.payload)
    },
    onRtcEvent: (event) => {
      console.log('[TestHarness] RTC Event:', event.type, event.payload)
    },
  })
}

async function doInviteCall() {
  if (!targetUserId.value) return
  const callType = callTypeSelect.value === 'video'
    ? CALL_TYPE.VIDEO_1V1
    : CALL_TYPE.AUDIO_1V1
  await inviteCall({
    calleeUserId: targetUserId.value,
    callType,
  })
}

async function doInviteGroupCall() {
  if (!groupId.value || !groupMembers.value) return
  const members = groupMembers.value.split(',').map(s => s.trim()).filter(Boolean)
  const callType = callTypeSelect.value === 'video'
    ? CALL_TYPE.VIDEO_MULTI
    : CALL_TYPE.AUDIO_MULTI
  await inviteGroupCall({
    groupId: groupId.value,
    participantIds: members,
    callType,
  })
}

async function doAccept() {
  await answerCall({ callId: callState.callId, result: 'accept' })
}

async function doRefuse() {
  await answerCall({ callId: callState.callId, result: 'refuse' })
}

async function doHangup() {
  await hangup()
}

function clearLog() {
  // eventLog is readonly, so we can't clear it — it auto-trims to 100
}
</script>

<template>
  <div class="callkit-test-harness">
    <h2>CallKit Core 测试面板</h2>

    <!-- 初始化 -->
    <section class="section">
      <h3>1. 初始化</h3>
      <button @click="doInit" :disabled="isInitialized">
        {{ isInitialized ? '✅ 已初始化' : '初始化 CallKitCore' }}
      </button>
      <button @click="destroy" :disabled="!isInitialized">销毁</button>
    </section>

    <!-- 当前状态 -->
    <section class="section state-panel">
      <h3>2. 当前状态</h3>
      <table>
        <tbody>
          <tr><td>Status</td><td><strong :class="'status-' + callState.status">{{ statusName }}</strong></td></tr>
          <tr><td>CallId</td><td>{{ callState.callId || '-' }}</td></tr>
          <tr><td>Channel</td><td>{{ callState.channel || '-' }}</td></tr>
          <tr><td>Type</td><td>{{ callState.type }}</td></tr>
          <tr><td>Caller</td><td>{{ callState.callerUserId || '-' }}</td></tr>
          <tr><td>Callee</td><td>{{ callState.calleeUserId || '-' }}</td></tr>
          <tr><td>Audio</td><td>{{ callState.audioEnabled ? '🔊 ON' : '🔇 OFF' }}</td></tr>
          <tr><td>Video</td><td>{{ callState.videoEnabled ? '📹 ON' : '📷 OFF' }}</td></tr>
          <tr v-if="callState.startTime"><td>Duration</td><td>{{ Math.floor((Date.now() - callState.startTime) / 1000) }}s</td></tr>
        </tbody>
      </table>
    </section>

    <!-- 发起通话 -->
    <section class="section" v-if="isIdle && isInitialized">
      <h3>3. 发起通话</h3>
      <div class="form-row">
        <label>通话类型:</label>
        <select v-model="callTypeSelect">
          <option value="audio">语音</option>
          <option value="video">视频</option>
        </select>
      </div>

      <fieldset>
        <legend>单聊</legend>
        <div class="form-row">
          <input v-model="targetUserId" placeholder="对方用户 ID" />
          <button @click="doInviteCall" :disabled="!targetUserId">发起单聊</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>群聊</legend>
        <div class="form-row">
          <input v-model="groupId" placeholder="群组 ID" />
        </div>
        <div class="form-row">
          <input v-model="groupMembers" placeholder="被邀请成员 (逗号分隔)" />
          <button @click="doInviteGroupCall" :disabled="!groupId || !groupMembers">发起群聊</button>
        </div>
      </fieldset>
    </section>

    <!-- 来电操作 -->
    <section class="section" v-if="isRinging">
      <h3>来电中 — {{ callState.callerUserId }}</h3>
      <button @click="doAccept" class="btn-accept">接受</button>
      <button @click="doRefuse" class="btn-refuse">拒绝</button>
    </section>

    <!-- 通话中操作 -->
    <section class="section" v-if="isInCall">
      <h3>通话中</h3>
      <button @click="toggleAudio">{{ callState.audioEnabled ? '静音' : '取消静音' }}</button>
      <button @click="toggleVideo">{{ callState.videoEnabled ? '关摄像头' : '开摄像头' }}</button>
      <button @click="doHangup" class="btn-refuse">挂断</button>
    </section>

    <!-- 主叫等待 -->
    <section class="section" v-if="callState.status === CALL_STATUS.INVITING">
      <h3>等待对方接听...</h3>
      <button @click="doHangup" class="btn-refuse">取消</button>
    </section>

    <!-- 群聊参与者 -->
    <section class="section" v-if="groupSession">
      <h3>群聊参与者</h3>
      <ul>
        <li v-for="p in groupParticipants" :key="p.userId">
          {{ p.userId }} — {{ p.state }}
        </li>
      </ul>
    </section>

    <!-- 错误 -->
    <section class="section" v-if="error">
      <h3 style="color: red;">错误</h3>
      <pre>{{ error }}</pre>
    </section>

    <!-- 事件日志 -->
    <section class="section">
      <h3>事件日志 ({{ eventLog.length }})</h3>
      <div class="event-log">
        <div v-for="(e, i) in [...eventLog].reverse()" :key="i" class="event-entry">
          <span class="event-time">{{ new Date(e.timestamp).toLocaleTimeString() }}</span>
          <span class="event-type" :class="'event-' + e.type">{{ e.type }}</span>
          <pre class="event-payload">{{ JSON.stringify(e.payload, null, 2) }}</pre>
        </div>
        <div v-if="eventLog.length === 0" class="event-empty">暂无事件</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.callkit-test-harness {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
h2 { margin-bottom: 16px; }
h3 { margin: 8px 0; }
.section {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.state-panel table {
  width: 100%;
  border-collapse: collapse;
}
.state-panel td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.state-panel td:first-child {
  font-weight: 600;
  width: 100px;
  color: #666;
}
.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.form-row input, .form-row select {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex: 1;
}
button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #4A90D9;
  color: white;
  font-weight: 500;
}
button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.btn-accept { background: #4CAF50; }
.btn-refuse { background: #F44336; }
fieldset {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
}
legend { font-weight: 600; padding: 0 4px; }

/* 状态颜色 */
.status-0 { color: #999; }
.status-1, .status-2 { color: #FF9800; }
.status-7 { color: #4CAF50; }

/* 事件日志 */
.event-log {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
}
.event-entry {
  margin-bottom: 8px;
  padding: 6px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #4A90D9;
}
.event-time {
  color: #999;
  margin-right: 8px;
}
.event-type {
  font-weight: 700;
  margin-right: 8px;
}
.event-payload {
  margin: 4px 0 0;
  font-size: 11px;
  color: #555;
  white-space: pre-wrap;
  word-break: break-all;
}
.event-empty { color: #999; text-align: center; padding: 16px; }
.event-incomingCall { color: #FF9800; }
.event-callStarted { color: #4CAF50; }
.event-callEnded, .event-callTimeout { color: #F44336; }
.event-shouldJoinRtc { color: #2196F3; }
.event-statusChanged { color: #9C27B0; }
</style>
