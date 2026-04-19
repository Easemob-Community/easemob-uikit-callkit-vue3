import { useChatClientStore } from '../store/chatClient'
import { useCallStateStore } from '../store/callState'
import { useSingleCallRtcStore } from '../store/singleCallRtc'
import { useGroupCallStore } from '../modules/groupCall'
import { CallService } from '../services/CallService'
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from '../types/callstate.types'
import { logger } from '../utils/logger'
import type { CmdMsgBody } from '../composables/useListenerManager'
import type { Chat } from '../core/sdk/imSDK'
import type { SignalHandler } from './SignalRouter'

/**
 * GroupCallSignalHandler
 * 群聊域信令处理器
 * 只处理与 GroupCallStore 相关的信令逻辑
 */
export class GroupCallSignalHandler implements SignalHandler {
  private chatClientStore = useChatClientStore()
  private callStateStore = useCallStateStore()
  private singleCallRtcStore = useSingleCallRtcStore()
  private groupCallStore = useGroupCallStore()

  handle(message: CmdMsgBody) {
    const action = message.ext?.action
    switch (action) {
      case 'answerCall':
        this.handleAnswerCall(message)
        break
      case 'cancelCall':
        this.handleCancelCall(message)
        break
      case 'leaveCall':
        this.handleLeaveCall(message)
        break
    }
  }

  /**
   * 处理 invite 文本消息中的群聊初始化
   * 由 useListenerManager 在收到 invite 文本消息时调用
   */
  handleInviteTextMessage(message: Chat.TextMsgBody) {
    const ext = message.ext as any
    const currentUserId =
      this.chatClientStore.getChatClient?.context?.userId ||
      this.chatClientStore.getChatClient?.user ||
      ''
    const callerUserId = ext?.callerIMName || message.from || ''
    const groupId = ext?.callkitGroupInfo?.groupId || ''
    const groupName = ext?.callkitGroupInfo?.groupName || ''
    const channel = ext?.channelName || ''
    const callType = ext?.type === CALL_TYPE.VIDEO_MULTI ? 'video' : 'audio'
    const invitedMembers: string[] = ext?.invitedMembers || []

    this.groupCallStore.initSession({
      sessionId: channel,
      groupId,
      groupName,
      callType,
      isActive: true,
      startTime: Date.now(),
    })

    // 本地用户
    this.groupCallStore.addParticipant({
      userId: currentUserId,
      nickname: currentUserId,
      state: 'invited',
      isLocal: true,
      videoTrack: null,
      audioTrack: null,
      localStream: null,
      isMuted: false,
      isCameraOn: callType === 'video',
      isSpeaking: false,
    })

    // 主叫方
    if (callerUserId && callerUserId !== currentUserId) {
      this.groupCallStore.addParticipant({
        userId: callerUserId,
        nickname: callerUserId,
        state: 'joinedRtc',
        isLocal: false,
        videoTrack: null,
        audioTrack: null,
        localStream: null,
        isMuted: false,
        isCameraOn: false,
        isSpeaking: false,
      })
    }

    // 其他被邀请成员
    invitedMembers.forEach((m: string) => {
      if (m !== currentUserId && m !== callerUserId) {
        this.groupCallStore.addParticipant({
          userId: m,
          nickname: m,
          state: 'invited',
          isLocal: false,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: false,
          isSpeaking: false,
        })
      }
    })

    logger.info('[GroupCallSignalHandler] GroupCallStore 已初始化', {
      groupId,
      participants: this.groupCallStore.participantList.map((p) => p.userId),
    })
  }

  /**
   * 处理 answerCall 信令中的群聊分支
   */
  private handleAnswerCall(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    // 只处理群聊类型
    if (
      this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
      this.callStateStore.type !== CALL_TYPE.AUDIO_MULTI
    ) {
      return
    }

    if (ext.callId !== this.callStateStore.getCallState.callId) {
      logger.warn(
        '[GroupCallSignalHandler] answerCall callId 不匹配，忽略',
        ext.callId,
        this.callStateStore.getCallState.callId
      )
      return
    }

    if (ext?.result !== 'accept') {
      // 群聊拒绝：从 GroupCallStore 移除
      logger.info('[GroupCallSignalHandler] 群聊成员拒绝，移除参与者', message.from)
      this.groupCallStore.removeParticipant(message.from as string)
    } else {
      // 群聊接受：标记为 accepted，添加到 pending RTC 列表
      logger.info('[GroupCallSignalHandler] 群聊成员接受，标记为 accepted', message.from)
      if (message.from) {
        this.singleCallRtcStore.addPendingUserId(message.from)
      }
      this.groupCallStore.markAccepted(message.from as string)
    }
  }

  /**
   * 处理 cancelCall 信令中的群聊容错分支
   */
  private handleCancelCall(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    // 只处理群聊类型
    if (
      this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
      this.callStateStore.type !== CALL_TYPE.AUDIO_MULTI
    ) {
      return
    }

    // 校验 callId
    if (ext.callId !== this.callStateStore.getCallState.callId) {
      const currentStatus = this.callStateStore.getCallStatus
      const isFromCaller = message.from === this.callStateStore.getCallState.callerUserId

      // 群聊容错：ALERTING/INVITING 状态且来自主叫方，执行挂断
      if (
        isFromCaller &&
        (currentStatus === CALL_STATUS.ALERTING || currentStatus === CALL_STATUS.INVITING)
      ) {
        logger.info(
          '[GroupCallSignalHandler] 群组通话中收到主叫方取消，执行挂断（callId 可能不一致）'
        )
        const callService = new CallService()
        callService.handleRemoteCancel().catch((err) => {
          logger.error('[GroupCallSignalHandler] 执行挂断失败:', err)
        })
      }
      return
    }

    // callId 匹配时，群聊 cancelCall 不执行挂断（由单聊 Handler 处理或忽略）
    logger.debug('[GroupCallSignalHandler] 群聊 cancelCall callId 匹配，不额外处理')
  }

  /**
   * 处理 leaveCall 信令中的群聊分支
   */
  private handleLeaveCall(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    // 只处理群聊类型
    if (
      this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
      this.callStateStore.type !== CALL_TYPE.AUDIO_MULTI
    ) {
      return
    }

    // callId 不匹配时的容错处理
    if (ext.callId !== this.callStateStore.getCallState.callId) {
      if (this.callStateStore.getCallStatus === CALL_STATUS.IDLE) {
        logger.info('[GroupCallSignalHandler] 当前状态 IDLE，忽略 leaveCall')
        return
      }
      if (this.callStateStore.getCallStatus === CALL_STATUS.IN_CALL) {
        logger.info('[GroupCallSignalHandler] 通话中对方离开，继续处理（callId 可能不一致）')
        // 继续执行下方逻辑
      } else if (
        this.callStateStore.getCallStatus === CALL_STATUS.ALERTING &&
        message.from === this.callStateStore.getCallState.callerUserId
      ) {
        logger.info('[GroupCallSignalHandler] ALERTING 状态收到主叫方 leaveCall，继续处理')
        // 继续执行下方逻辑
      } else {
        logger.warn('[GroupCallSignalHandler] leaveCall callId 不匹配且状态不符，忽略')
        return
      }
    }

    const currentStatus = this.callStateStore.getCallStatus
    const isFromCaller = message.from === this.callStateStore.getCallState.callerUserId

    // 被叫方在 ALERTING/INVITING 状态收到主叫方 leaveCall，挂断整个通话
    if (
      (currentStatus === CALL_STATUS.ALERTING || currentStatus === CALL_STATUS.INVITING) &&
      isFromCaller
    ) {
      logger.info(
        `[GroupCallSignalHandler] 被叫方收到主叫方(${message.from})离开信令，挂断整个通话`
      )
      const callService = new CallService()
      callService.hangup(HANGUP_REASON.HANGUP).catch((err) => {
        logger.error('[GroupCallSignalHandler] 执行挂断失败:', err)
      })
      return
    }

    // 通话中状态：只移除离开的成员，不挂断整个通话
    logger.info(`[GroupCallSignalHandler] 群聊成员 ${message.from} 离开`)

    // 标记用户已离开 RTC
    this.singleCallRtcStore.markUserLeftRtc(message.from as string)

    // 标记用户为 left
    this.groupCallStore.setParticipantState(message.from as string, 'left')
    setTimeout(() => this.groupCallStore.removeParticipant(message.from as string), 2000)

    logger.debug(`[GroupCallSignalHandler] 成员 ${message.from} 已从通话中移除`)
  }
}
