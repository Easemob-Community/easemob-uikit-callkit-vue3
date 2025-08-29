<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { provide, ref } from 'vue'
import type { ProviderConfig } from '../types'

interface Props {
  initConfig: {
    appKey: string
    userId?: string
    accessToken?: string
    debug?: boolean
  }
  chatClient?: any
  enableRingtone?: boolean
  resizable?: boolean
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enableRingtone: true,
  resizable: true,
  draggable: true
})

// 创建callKit实例
const callKitRef = ref()

// 提供全局配置
provide('easemob-callkit-config', {
  ...props.initConfig,
  enableRingtone: props.enableRingtone,
  resizable: props.resizable,
  draggable: props.draggable,
  chatClient: props.chatClient
})

provide('easemob-callkit-ref', callKitRef)

// 暴露方法给父组件
const openCall = (targetId: string, type: 'audio' | 'video') => {
  console.log('打开通话:', targetId, type)
}

const openChat = (targetId: string) => {
  console.log('打开聊天:', targetId)
}

// 暴露给ref
const callKitInstance = {
  openCall,
  openChat,
  config: props.initConfig
}

defineExpose(callKitInstance)
</script>