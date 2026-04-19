<template>
  <div class="easemob-callkit-provider">
    <slot v-if="mounted"></slot>
  </div>
</template>

<script setup lang="ts">
import { watchEffect, computed, onUnmounted, ref, onMounted } from 'vue'
import type { ProviderConfig } from '../types'
import { useListenerManager } from '../composables/useListenerManager';
import { useChatClientStore } from '../store/chatClient';
import { useCallStateStore } from '../store/callState';
import { useRtcChannelStore } from '../store/rtcChannel';
import { logger } from '../utils/logger';

// 确保组件挂载完成后再渲染插槽
const mounted = ref(false)

// 定义默认的initConfig对象
const defaultInitConfig = {
  debug: false,
  enableRingtone: true,
  resizable: true,
  draggable: true,
  inviteTimeout: 30000,
};

const props = defineProps<ProviderConfig>();

//接收外部传入的环信实例
const chatClientStore = useChatClientStore();
watchEffect(() => {
  if (props.chatClient) {
    logger.info('CallKit Provider 接收到环信客户端实例');
    chatClientStore.setClient(props.chatClient);
    logger.verbose('环信客户端实例已保存到store');
  } else {
    logger.warn('CallKit Provider 未接收到环信客户端实例');
  }
})
// 合并默认配置和用户配置
const effectiveInitConfig = {
  ...defaultInitConfig,
  ...props.initConfig,
};

logger.debug(`CallKit Provider 配置合并完成：默认配置 + 用户配置`);
logger.verbose(`CallKit Provider 合并后的完整配置: ${JSON.stringify(effectiveInitConfig)}`);

// 创建响应式的全局配置
const globalConfig = computed(() => ({
  enableRingtone: effectiveInitConfig.enableRingtone,
  resizable: effectiveInitConfig.resizable,
  draggable: effectiveInitConfig.draggable,
  chatClient: props.chatClient,
  debug: effectiveInitConfig.debug,
}));

// 创建全局 store 实例
const rtcChannelStore = useRtcChannelStore();

// 在 setup 顶层创建 listenerManager
const { mountTextMessageListener, mountSignalListener } = useListenerManager();

// 先设置日志级别（必须在RTC初始化之前）
watchEffect(() => {
  const callStateStore = useCallStateStore();
  callStateStore.inviteTimeout = effectiveInitConfig.inviteTimeout;
  
  // 设置日志级别
  logger.setDebug(effectiveInitConfig.debug);
  
  // 实际应用场景日志
  logger.info(`CallKit Provider 初始化完成，配置: debug=${effectiveInitConfig.debug}, enableRingtone=${effectiveInitConfig.enableRingtone}`);
  logger.debug(`CallKit Provider 详细配置: inviteTimeout=${effectiveInitConfig.inviteTimeout}, resizable=${effectiveInitConfig.resizable}, draggable=${effectiveInitConfig.draggable}`);
  logger.verbose(`CallKit 当前日志级别: ${logger.getCurrentLevelName()}`);
});

// 初始化RTC服务（在日志配置之后）
// 注意：appId 将从环信服务器动态获取，这里传入的 agoraAppId 仅用于初始化占位
watchEffect(async () => {
  if (!rtcChannelStore.getRtcService()) {
    try {
      // 使用占位 appId 初始化 RtcService，实际 appId 在 joinChannel 时动态设置
      const placeholderAppId = props.agoraAppId || 'placeholder'
      await rtcChannelStore.initializeRtcService(placeholderAppId);
      logger.info('RTC服务已初始化，appId 将在加入频道时从环信服务器动态获取')
    } catch (error) {
      // 错误已在store中记录
    }
  }
});
watchEffect(() => {
  if (chatClientStore.getChatClient) {
    logger.info('CallKit Provider 开始挂载事件监听器');
    // 使用已经在 setup 顶层创建的 listenerManager
    mountTextMessageListener();
    mountSignalListener();
    logger.debug('CallKit Provider 事件监听器挂载完成');
  } else {
    logger.verbose('CallKit Provider 未挂载事件监听器：缺少环信客户端实例');
  }
})

// 组件挂载完成
onMounted(() => {
  mounted.value = true
})

// 组件卸载时清理RTC服务
onUnmounted(async () => {
  await rtcChannelStore.destroyRtcService();
});

</script>