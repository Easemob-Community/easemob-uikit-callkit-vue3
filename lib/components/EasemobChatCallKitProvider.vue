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
    chatClientStore.setClient(props.chatClient);
  }
})
// 合并默认配置和用户配置
const effectiveInitConfig = {
  ...defaultInitConfig,
  ...props.initConfig,
};

// 使用合并后的配置
watchEffect(() => {
  console.log('effectiveInitConfig', effectiveInitConfig);
  console.log('inviteTimeout', effectiveInitConfig.inviteTimeout);
  const callStateStore = useCallStateStore();
  callStateStore.inviteTimeout = effectiveInitConfig.inviteTimeout;

  // 提供全局配置
  provide('easemob-callkit-config', {
    enableRingtone: effectiveInitConfig.enableRingtone,
    resizable: effectiveInitConfig.resizable,
    draggable: effectiveInitConfig.draggable,
    chatClient: props.chatClient,
    debug: effectiveInitConfig.debug,
  });
})
watchEffect(() => {
  if (chatClientStore.getChatClient) {
    const { mountTextMessageListener, mountSignalListener } = useListenerManager();
    mountTextMessageListener();
    mountSignalListener();
  }
})


</script>