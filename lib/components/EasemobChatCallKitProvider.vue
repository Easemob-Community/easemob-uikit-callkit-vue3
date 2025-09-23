<template>
  <div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { provide, watchEffect } from 'vue'
import type { ProviderConfig } from '../types'
import { useListenerManager } from '../composables/useListenerManager';
import { useChatClientStore } from '../store/chatClient';
import { useCallStateStore } from '../store/callState';
import { logger } from '../utils/logger';

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

// 使用合并后的配置
watchEffect(() => {
  const callStateStore = useCallStateStore();
  callStateStore.inviteTimeout = effectiveInitConfig.inviteTimeout;
  
  // 设置日志级别
  logger.setDebug(effectiveInitConfig.debug);
  
  // 实际应用场景日志
  logger.info(`CallKit Provider 初始化完成，配置: debug=${effectiveInitConfig.debug}, enableRingtone=${effectiveInitConfig.enableRingtone}`);
  logger.debug(`CallKit Provider 详细配置: inviteTimeout=${effectiveInitConfig.inviteTimeout}, resizable=${effectiveInitConfig.resizable}, draggable=${effectiveInitConfig.draggable}`);
  logger.verbose(`CallKit 当前日志级别: ${logger.getCurrentLevelName()}`);

  // 提供全局配置
  const globalConfig = {
    enableRingtone: effectiveInitConfig.enableRingtone,
    resizable: effectiveInitConfig.resizable,
    draggable: effectiveInitConfig.draggable,
    chatClient: props.chatClient,
    debug: effectiveInitConfig.debug,
  };
  
  provide('easemob-callkit-config', globalConfig);
  logger.debug('CallKit Provider 全局配置已提供给子组件');
})
watchEffect(() => {
  if (chatClientStore.getChatClient) {
    logger.info('CallKit Provider 开始挂载事件监听器');
    const { mountTextMessageListener, mountSignalListener } = useListenerManager();
    mountTextMessageListener();
    mountSignalListener();
    logger.debug('CallKit Provider 事件监听器挂载完成');
  } else {
    logger.verbose('CallKit Provider 未挂载事件监听器：缺少环信客户端实例');
  }
})


</script>