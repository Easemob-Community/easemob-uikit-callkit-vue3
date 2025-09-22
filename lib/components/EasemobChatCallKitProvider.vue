<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { provide, watchEffect } from 'vue'
import type { ProviderConfig } from '../types'
import { useListenerManager } from '../composables/useListenerManager';
import { useChatClientStore } from '../store/chatClient';

const props = withDefaults(defineProps<ProviderConfig>(), {
  enableRingtone: true,
  resizable: true,
  draggable: true
})

// 提供全局配置
provide('easemob-callkit-config', {
  enableRingtone: props.enableRingtone,
  resizable: props.resizable,
  draggable: props.draggable,
  chatClient: props.chatClient
})
//接收外部传入的环信实例
const chatClientStore = useChatClientStore();
watchEffect(() => {
  if (props.chatClient) {
    chatClientStore.setClient(props.chatClient);
  }
})
watchEffect(() => {
  if (chatClientStore.getChatClient) {
    const { mountTextMessageListener, mountSignalListener } = useListenerManager();
    mountTextMessageListener();
    mountSignalListener();
  }
})


</script>