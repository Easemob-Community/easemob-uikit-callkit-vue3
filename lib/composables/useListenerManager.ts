import { useChatClientStore } from '../store/chatClient'
import { useCallStateStore } from '../store/callState'
import { logger } from '../utils/logger'
import type { Chat } from '../core/sdk/imSDK'
import {
  CALL_STATUS,
  CALL_TYPE,
  type CALLKIT_CMD_MSG_ACTION_TYPE,
} from '../types/callstate.types'
import type { SignalingExt } from '../types/signal.types'
import { useSignalManager } from './useSignalManager'
import { useGlobalCallStore } from '../store/globalCall'
import { resolveUserProfiles } from '../services/UserProfileService'
import { SignalRouter } from '../signaling/SignalRouter'
import { SingleCallSignalHandler } from '../signaling/SingleCallSignalHandler'
import { GroupCallSignalHandler } from '../signaling/GroupCallSignalHandler'
import { callKitEventBus } from '../core/events/CallKitEventBus'
import { buildBaseEventFields, isMessageExpired } from '../core/events/helpers'

// 定义CmdMsgBody接口以替代不存在的Chat.CmdMsgBody
export interface CmdMsgBody {
  from?: string
  to?: string
  id?: string
  action?: string
  ext?: SignalingExt & { [key: string]: any }
  [key: string]: any
}

export interface ListenerManagerReturn {
  mountTextMessageListener: () => void
  mountSignalListener: () => void
  unmountListeners: () => void
}

/**
 * 监听器管理器 - 薄壳
 * 职责：
 * 1. 挂载 IM 文本消息监听（invite / userAttributes）
 * 2. 挂载 IM cmd 消息监听，通过 SignalRouter 分发给域 Handler
 */
export function useListenerManager(): ListenerManagerReturn {
  const chatClientStore = useChatClientStore()
  const callStateStore = useCallStateStore()
  const { sendBusyAnswerMessage, sendAlertMessage } = useSignalManager()

  // 初始化信令路由
  const router = new SignalRouter()
  const singleCallHandler = new SingleCallSignalHandler()
  const groupCallHandler = new GroupCallSignalHandler()

  router.register('alert', singleCallHandler)
  router.register('confirmRing', singleCallHandler)
  router.register('answerCall', singleCallHandler)
  router.register('answerCall', groupCallHandler)
  router.register('cancelCall', singleCallHandler)
  router.register('cancelCall', groupCallHandler)
  router.register('leaveCall', singleCallHandler)
  router.register('leaveCall', groupCallHandler)
  router.register('confirmCallee', singleCallHandler)

  /**
   * 处理通话邀请消息（文本消息）
   */
  const handleInvitationMessage = async (message: Chat.TextMsgBody) => {
    const client = chatClientStore.getChatClient as Chat.Connection
    if (!client) {
      logger.warn('ChatClient 未初始化，无法处理邀请')
      return
    }

    logger.info(`开始处理通话邀请，发送方: ${message.from || '未知'}`)
    logger.verbose(`通话邀请详情:`, message.ext || '无扩展信息')
    logger.signal('recv', 'invite', {
      from: message.from,
      to: message.to,
      callId: message.ext?.callId,
      type: message.ext?.type,
      channel: message.ext?.channelName,
    })

    if (message.from === chatClientStore.getChatClient?.context.jid.name) {
      logger.warn('该条通话邀请文本消息是自己发送的，忽略')
      return
    }

    const ext = message.ext as any
    const currentUserId =
      chatClientStore.getChatClient?.context?.userId ||
      chatClientStore.getChatClient?.user

    const isGroupCall =
      ext?.type === CALL_TYPE.VIDEO_MULTI || ext?.type === CALL_TYPE.AUDIO_MULTI

    // 校验当前用户是否为该邀请的预期接收者
    if (currentUserId) {
      if (!isGroupCall) {
        if (message.to && message.to !== currentUserId) {
          logger.warn(
            `[邀请处理] 单聊邀请接收者(${message.to})与当前用户(${currentUserId})不一致，忽略该离线邀请`
          )
          return
        }
      } else {
        const invitedMembers = ext?.invitedMembers || []
        if (invitedMembers.length > 0 && !invitedMembers.includes(currentUserId)) {
          logger.warn(
            `[邀请处理] 当前用户不在群聊邀请列表中，忽略该离线邀请，当前用户: ${currentUserId}`
          )
          return
        }
      }
    }

    // 单聊场景：校验 calleeDevId 是否匹配当前设备（防止 resourceId 固定导致的多设备离线消息重投）
    if (!isGroupCall && ext?.calleeDevId) {
      const currentDeviceId = chatClientStore.getClientDeviceId
      if (currentDeviceId && ext.calleeDevId !== currentDeviceId) {
        logger.warn(
          `[邀请处理] calleeDevId 不匹配，忽略该邀请。消息 calleeDevId: ${ext.calleeDevId}, 当前设备: ${currentDeviceId}`
        )
        return
      }
    }

    // 校验消息是否已过期（防止重新登录后收到过期离线 invite）
    if (message.time && isMessageExpired(message.time, callStateStore.inviteTimeout + 10000)) {
      logger.warn(
        `[邀请处理] 邀请消息已过期，忽略。消息时间: ${message.time}, 当前时间: ${Date.now()}, 差值: ${Date.now() - message.time}ms`
      )
      return
    }

    // 校验当前用户的通话状态是否为 idle
    const currentStatus = callStateStore.getCallStatus
    logger.info(
      `[邀请处理] 当前通话状态: ${currentStatus}, 目标状态IDLE: ${CALL_STATUS.IDLE}`
    )

    if (currentStatus > CALL_STATUS.IDLE) {
      logger.warn(
        `[邀请处理] 当前通话状态不是idle (${currentStatus})，应答拒绝通话邀请，callId: ${ext?.callId}`
      )
      if (message.from) {
        const newInvitationInfo = {
          callerUserId: message.from,
          callerDevId: ext?.callerDevId,
          callId: ext?.callId,
        }
        logger.debug('当前通话状态不是idle，应答拒绝通话邀请', newInvitationInfo)
        sendBusyAnswerMessage(message.from, newInvitationInfo).catch(() => {})
      }
      return
    }

    // 更新 store 中的 state 属性（单聊字段）
    callStateStore.updateCallState({
      callId: ext?.callId,
      channel: ext?.channelName,
      type: ext?.type,
      callerDevId: ext?.callerDevId,
      callerUserId: ext?.callerIMName || message.from,
      calleeUserId:
        ext?.type === CALL_TYPE.VIDEO_MULTI || ext?.type === CALL_TYPE.AUDIO_MULTI
          ? ext?.callkitGroupInfo?.groupId || ext?.groupId
          : message.to,
      inviteMessageId: message.id,
    })
    logger.info('通话邀请已更新至store', callStateStore.getCallState)

    // 群聊初始化：委托给 GroupCallSignalHandler
    if (
      ext?.type === CALL_TYPE.VIDEO_MULTI ||
      ext?.type === CALL_TYPE.AUDIO_MULTI
    ) {
      groupCallHandler.handleInviteTextMessage(message)
    }

    // 发送 alerting 信令
    sendAlertMessage(message.from as string).catch(() => {})
    callStateStore.setCallStatus(CALL_STATUS.ALERTING)
    logger.info(`通话状态已更新至ALERTING`)

    // 设置日志 sessionId（使用 callId 作为会话标识），后续日志自动关联当前通话
    logger.setSessionId(ext?.callId || ext?.channelName || '')

    // 触发 incomingCall 事件
    const currentCallState = callStateStore.getCallState
    callKitEventBus.emit('incomingCall', {
      ...buildBaseEventFields(
        {
          callId: currentCallState.callId,
          channel: currentCallState.channel,
          type: currentCallState.type,
          callerUserId: currentCallState.callerUserId,
          calleeUserId: currentCallState.calleeUserId,
          groupId: ext?.callkitGroupInfo?.groupId,
        },
        false
      ),
      callerDevId: currentCallState.callerDevId,
      calleeDevId: currentCallState.calleeDevId,
      groupName: ext?.callkitGroupInfo?.groupName,
      groupAvatar: ext?.callkitGroupInfo?.groupAvatar,
      invitedMembers: ext?.invitedMembers,
    })

    // 如果消息 ext 中没有用户属性，尝试通过 Provider 查询主叫方资料
    const userAttributes = ext?.ease_chat_uikit_user_info
    if (!userAttributes && message.from) {
      try {
        await resolveUserProfiles([message.from])
        logger.info(`[邀请处理] 已通过 Provider 查询主叫方资料: ${message.from}`)
      } catch (err) {
        logger.warn(`[邀请处理] Provider 查询主叫方资料失败: ${message.from}`, err)
      }
    }

    // 设置超时计时器
    callStateStore.startTimeoutTimer(() => {
      logger.warn('callee timeout,hangup call,reason:NO_RESPONSE')
    })
  }

  /**
   * 处理消息体内的用户属性
   */
  const handleUserAttributes = (message: Chat.TextMsgBody) => {
    const userAttributes = message.ext?.ease_chat_uikit_user_info
    if (!userAttributes) {
      logger.warn('消息体中无用户属性')
      return
    }
    const callerName = userAttributes?.nickname || message.from
    const callerAvatar = userAttributes?.avatarURL || ''
    const callerUserId = message.from as string

    const globalCallStore = useGlobalCallStore()
    globalCallStore.setUserInfo(callerUserId, {
      nickname: callerName,
      avatarURL: callerAvatar,
    })
    logger.info(`用户属性已更新至store，用户ID: ${callerUserId}`)
    logger.debug(`用户属性详情:`, userAttributes)
  }

  /**
   * 注册文本消息监听
   */
  const mountTextMessageListener = () => {
    logger.info('正在挂载文本消息监听器')

    const client = chatClientStore.getChatClient
    if (!client) {
      logger.warn('ChatClient未初始化，无法挂载文本消息监听器')
      return
    }

    try {
      client.addEventHandler('onTextMessage', {
        onTextMessage: (message) => {
          logger.info(`收到文本消息，发送方: ${message.from || '未知'}`)
          logger.verbose(`文本消息详情:`, message)
          // 兼容 ext 在 message.ext 或 message.body?.ext 中的情况（与 callkit-core 对齐）
          const msgAny = message as any
          const ext = msgAny.ext || msgAny.body?.ext
          if (ext && ext.action === 'invite') {
            handleInvitationMessage(message)
            handleUserAttributes(message)
          }
        },
      })
      logger.debug('文本消息监听器挂载成功')
    } catch (error) {
      logger.error('挂载文本消息监听器失败:', error)
    }
  }

  /**
   * 注册信令监听（通过 SignalRouter 分发）
   */
  const mountSignalListener = () => {
    logger.info('正在挂载信令消息监听器')

    const client = chatClientStore.getChatClient
    if (!client) {
      logger.warn('ChatClient未初始化，无法挂载信令消息监听器')
      return
    }

    try {
      client.addEventHandler('onSignalMessage', {
        onCmdMessage(message) {
          if (message.action === 'rtcCall') {
            // 校验 cmd 信令是否已过期（防止重新登录后收到过期离线信令）
            if (message.time && isMessageExpired(message.time, 60000)) {
              logger.warn(
                `[信令处理] cmd 信令已过期，忽略。消息时间: ${message.time}, 当前时间: ${Date.now()}, 差值: ${Date.now() - message.time}ms`
              )
              return
            }
            const messageType =
              message.ext?.action || message.action || '未知'
            logger.debug(`接收到信令消息类型: ${messageType}`)
            logger.verbose(`接收到信令消息详情:`, message)
            router.dispatch(message as unknown as CmdMsgBody)
          }
        },
      })
      logger.debug('信令消息监听器挂载成功')
    } catch (error) {
      logger.error('挂载信令消息监听器失败:', error)
    }
  }

  /**
   * 卸载所有监听器
   */
  const unmountListeners = () => {
    logger.info('正在卸载消息监听器')

    const client = chatClientStore.getChatClient
    if (!client) {
      logger.warn('ChatClient未初始化，无需卸载监听器')
      return
    }

    try {
      client.removeEventHandler('onTextMessage')
      client.removeEventHandler('onSignalMessage')
      logger.debug('消息监听器卸载成功')
    } catch (error) {
      logger.error('卸载消息监听器失败:', error)
    }
  }

  return {
    mountTextMessageListener,
    mountSignalListener,
    unmountListeners,
  }
}
