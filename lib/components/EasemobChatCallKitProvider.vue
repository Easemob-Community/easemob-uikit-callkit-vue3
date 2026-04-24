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
import { logger, LogLevel, Logger } from '../utils/logger';
import { RingtoneService } from '../utils/ringtone';
import { registerUserInfoProvider, registerGroupInfoProvider, clearProfileProviders, type UserInfoProvider } from '../services/UserProfileService';
import { fetchUserInfoById } from '../utils/imSdkAdapter';

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

  // 设置日志级别（logLevel 优先级高于 debug）
  if (effectiveInitConfig.logLevel !== undefined) {
    logger.setLevel(effectiveInitConfig.logLevel);
  } else {
    logger.setDebug(effectiveInitConfig.debug);
  }

  // 初始化 IndexedDB 日志存储（默认开启，不受控制台日志级别影响）
  if (effectiveInitConfig.enableIDBLog !== false) {
    try {
      Logger.getInstance({ enableIDB: true, idbLevel: LogLevel.VERBOSE, idbMaxSizeMB: 20 })
      // 强制打印到控制台，不受 logger level 限制
      console.info(
        `%c[EasemobChatCallKit] IndexedDB 日志存储已启用（上限 20MB，callId 维度，VERBOSE 级别）`,
        'color: #3b82f6; font-weight: bold;'
      )
    } catch (err) {
      console.warn(
        `%c[EasemobChatCallKit] IndexedDB 日志存储初始化失败`,
        'color: #f59e0b; font-weight: bold;',
        err
      )
    }
  } else {
    console.info(
      `%c[EasemobChatCallKit] IndexedDB 日志存储已禁用（enableIDBLog=false）`,
      'color: #6b7280;'
    )
  }

  // 初始化铃声服务（当前为桩函数，不实际播放音频）
  RingtoneService.getInstance().setEnabled(effectiveInitConfig.enableRingtone ?? true)
  logger.debug(`铃声服务已初始化: enabled=${effectiveInitConfig.enableRingtone ?? true}（桩函数占位）`)

  // 实际应用场景日志
  logger.info(`CallKit Provider 初始化完成，配置: debug=${effectiveInitConfig.debug}, logLevel=${effectiveInitConfig.logLevel ?? 'auto'}, enableRingtone=${effectiveInitConfig.enableRingtone}`);
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
      await rtcChannelStore.initializeRtcService(placeholderAppId, props.agoraClient);
      if (props.agoraClient) {
        logger.info('RTC服务已初始化（使用外部传入的 Agora 客户端实例）')
      } else {
        logger.info('RTC服务已初始化，appId 将在加入频道时从环信服务器动态获取')
      }
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

// 同步 isMiniCore 配置到 store
watchEffect(() => {
  chatClientStore.setIsMiniCore(!!props.isMiniCore);
  if (props.isMiniCore) {
    logger.info('CallKit Provider: 已启用 miniCore 兼容模式');
  }
})

// 构建默认用户资料 Provider（基于环信 SDK fetchUserInfoById，兼容 full/miniCore）
function createDefaultUserInfoProvider(chatClient: any, isMiniCore: boolean): UserInfoProvider {
  return async (userIds: string[]) => {
    const response = await fetchUserInfoById(chatClient, userIds, ['nickname', 'avatarurl'], isMiniCore)
    const data = response.data || {}
    return Object.entries(data).map(([userId, info]: [string, any]) => ({
      userId,
      nickname: info?.nickname,
      avatarUrl: info?.avatarurl,
    }))
  }
}

// 注册用户/群组资料 Provider
watchEffect(() => {
  if (props.getUserInfo) {
    registerUserInfoProvider(props.getUserInfo)
    logger.debug('CallKit Provider 已注册用户资料 Provider')
  } else if (chatClientStore.getChatClient) {
    // 未传入自定义 provider，使用环信 SDK 内置接口作为默认实现
    const defaultProvider = createDefaultUserInfoProvider(chatClientStore.getChatClient, !!props.isMiniCore)
    registerUserInfoProvider(defaultProvider)
    logger.debug('CallKit Provider 已注册默认用户资料 Provider（基于环信 SDK）')
  }
  if (props.getGroupInfo) {
    registerGroupInfoProvider(props.getGroupInfo)
    logger.debug('CallKit Provider 已注册群组资料 Provider')
  }
})

// 组件挂载完成
onMounted(() => {
  mounted.value = true
  // HMR 安全：延迟检查 RtcService 是否被旧实例销毁，需要重新初始化。
  // webpack/vue-cli HMR 时，旧组件的 async destroyRtcService 可能在新组件 mount 后才完成，
  // 导致 watchEffect 中的条件判断为 false（RtcService 当时还存在），之后被销毁却不再触发初始化。
  setTimeout(async () => {
    if (!rtcChannelStore.getRtcService()) {
      try {
        const placeholderAppId = props.agoraAppId || 'placeholder'
        await rtcChannelStore.initializeRtcService(placeholderAppId, props.agoraClient)
        logger.info('HMR 后 RtcService 延迟初始化成功')
      } catch (error) {
        logger.error('HMR 后 RtcService 延迟初始化失败:', error)
      }
    }
  }, 50)
})

// 组件卸载时清理RTC服务和Provider
onUnmounted(async () => {
  await rtcChannelStore.destroyRtcService();
  clearProfileProviders();
});

</script>