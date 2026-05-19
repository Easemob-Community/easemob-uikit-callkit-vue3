import { useChatClientStore } from '../store/chatClient'
import { useCallStateStore } from '../store/callState'
import { useRtcChannelStore } from '../store/rtcChannel'
import { useSignalManager } from '../composables/useSignalManager'
import { useJoinChannel } from '../composables/useJoinChannel'
import { CallService } from '../services/CallService'
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from '../types/callstate.types'
import { logger } from '../utils/logger'
import { callKitEventBus } from '../core/events/CallKitEventBus'
import { buildBaseEventFields } from '../core/events/helpers'
import type { CmdMsgBody } from '../composables/useListenerManager'
import type { SignalHandler } from './SignalRouter'

/**
 * SingleCallSignalHandler
 * 单聊域信令处理器（同时承载 confirmCallee 等共用逻辑）
 * 职责：处理所有与 callStateStore 状态流转相关的信令
 */
export class SingleCallSignalHandler implements SignalHandler {
  private chatClientStore = useChatClientStore()
  private callStateStore = useCallStateStore()
  private rtcChannelStore = useRtcChannelStore()
  private signalManager = useSignalManager()
  private joinRtcChannel = useJoinChannel().joinChannel

  handle(message: CmdMsgBody) {
    const action = message.ext?.action
    switch (action) {
      case 'alert':
        this.handleAlert(message)
        break
      case 'confirmRing':
        this.handleConfirmRing(message)
        break
      case 'answerCall':
        this.handleAnswerCall(message)
        break
      case 'cancelCall':
        this.handleCancelCall(message)
        break
      case 'leaveCall':
        this.handleLeaveCall(message)
        break
      case 'confirmCallee':
        this.handleConfirmCallee(message)
        break
    }
  }

  /**
   * 收到 alert 信令（被叫方已响铃）
   */
  private handleAlert(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    logger.signal('recv', 'alert', {
      from: message.from,
      callId: ext?.callId,
      callerDevId: ext?.callerDevId,
    })

    if (this.callStateStore.getInviteTimeoutTimer) {
      this.callStateStore.clearTimeoutTimer()
    }

    const confirmRingSignalMessage = this.buildConfirmRingSignalMessage(message)
    if (confirmRingSignalMessage) {
      this.signalManager
        .sendConfirmRingMessage(
          confirmRingSignalMessage.to as string,
          confirmRingSignalMessage.ext
        )
        .then(() => {
          if (
            this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
            this.callStateStore.type !== CALL_TYPE.AUDIO_MULTI
          ) {
            this.callStateStore.startTimeoutTimer(() => {
              logger.info(`确认响铃信令超时，通话已取消`)
            })
          }
        })
        .catch(() => {})
    }
  }

  /**
   * 构建 confirmRing 信令消息
   */
  private buildConfirmRingSignalMessage(message: CmdMsgBody) {
    const currentCallInfo = this.callStateStore.getCallState
    if (!currentCallInfo) return

    const { from, ext } = message

    if (ext?.callerDevId !== this.chatClientStore.getClientDeviceId) {
      logger.warn(
        `[buildConfirmRingSignalMessage] 主叫有两个设备，接收到的callerDevId:${ext?.callerDevId}不等于当前客户端设备ID:${this.chatClientStore.getClientDeviceId}`
      )
      return
    }

    let status = true
    if (ext?.callId !== currentCallInfo.callId) {
      status = false
      logger.warn(
        `确认响铃信令消息通话ID与当前通话callId不一致，不做处理:ext.callId:${ext?.callId}, currentCallInfo.callId:${currentCallInfo.callId}`
      )
    }

    if (
      currentCallInfo.state !== undefined &&
      currentCallInfo.state > CALL_STATUS.RECEIVED_CONFIRM_RING &&
      currentCallInfo.type !== CALL_TYPE.VIDEO_MULTI
    ) {
      status = false
      logger.warn(
        `确认响铃信令消息通话状态与当前通话状态不一致，不做处理:currentCallInfo.state:${currentCallInfo.state}`
      )
    }

    logger.debug('>>>>>>开始构建确认响铃信令消息')

    return {
      to: from,
      action: 'confirmRing',
      ext: {
        status,
        callId: message.ext?.callId,
        calleeDevId: message.ext?.calleeDevId,
      },
    }
  }

  /**
   * 收到 confirmRing 信令（主叫方确认被叫已响铃）
   */
  private handleConfirmRing(message: CmdMsgBody) {
    const { ext } = message

    if (ext?.callerDevId !== this.chatClientStore.getClientDeviceId) {
      logger.warn(
        `[handleConfirmRingSignalMessage] 多端情况:接收到的callerDevId:${ext?.callerDevId}不等于当前客户端设备ID:${this.chatClientStore.getClientDeviceId}`
      )
      return
    }

    if (ext?.calleeDevId !== this.callStateStore.getCallState.calleeDevId) {
      logger.warn(
        `[handleConfirmRingSignalMessage] 被叫有两个设备:接收到的calleeDevId:${ext?.calleeDevId}不等于当前客户端设备ID:${this.callStateStore.getCallState.calleeDevId}`
      )
      return
    }

    if (this.callStateStore.getInviteTimeoutTimer) {
      this.callStateStore.clearTimeoutTimer()
    }

    if (!ext?.status || this.callStateStore.getCallStatus < CALL_STATUS.ALERTING) {
      logger.warn(
        `[handleConfirmRingSignalMessage] 确认响铃信令消息状态为false或当前通话状态小于ALERTING，不做处理,status:${ext?.status}, callStateStore.getCallStatus:${this.callStateStore.getCallStatus}`
      )
      return
    }

    if (this.callStateStore.getCallStatus === CALL_STATUS.RECEIVED_CONFIRM_RING) {
      logger.info(
        `[handleConfirmRingSignalMessage] 确认响铃信令消息状态为true，当前通话状态已为RECEIVED_CONFIRM_RING`
      )
      return
    }

    this.callStateStore.setCallStatus(CALL_STATUS.RECEIVED_CONFIRM_RING)
    logger.stateChange(CALL_STATUS.CONFIRM_RING, CALL_STATUS.RECEIVED_CONFIRM_RING, {
      trigger: 'confirmRing',
      from: message.from,
    })
  }

  /**
   * 收到 answerCall 信令中的单聊分支
   */
  private handleAnswerCall(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    if (ext.callId !== this.callStateStore.getCallState.callId) {
      logger.warn(
        'answerCall信令消息通话callId与当前通话callId不一致，不做处理:ext.callId:',
        ext.callId,
        ',currentCallInfo.callId:',
        this.callStateStore.getCallState.callId
      )
      return
    }

    if (this.callStateStore.getInviteTimeoutTimer) {
      this.callStateStore.clearTimeoutTimer()
    }

    if (
      this.callStateStore.getCallStatus === CALL_STATUS.IN_CALL &&
      this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI
    ) {
      logger.debug(
        '当前通话状态为IN_CALL，且通话类型不是VIDEO_MULTI，answerCall信令消息不受影响'
      )
      return
    }

    if (ext.callerDevId !== this.chatClientStore.getClientDeviceId) {
      if (message.from === this.chatClientStore.getChatClient?.context.userId) {
        const reason = ext.result === 'accept' ? '已被其他端接听' : '已被其他端拒绝'
        logger.warn(
          `answerCall信令消息已被其他端处理，${reason}，不做处理:callerDevId:`,
          ext.callerDevId,
          ',getClientDeviceId:',
          this.chatClientStore.getClientDeviceId
        )
        return
      }
      logger.warn(
        `answerCall信令消息发送方设备ID与当前客户端设备ID不一致，不做处理:callerDevId:`,
        ext.callerDevId,
        ',getClientDeviceId:',
        this.chatClientStore.getClientDeviceId
      )
      return
    }

    if (ext?.result !== 'accept') {
      // 拒绝分支
      logger.signal('recv', 'answerCall', {
        from: message.from,
        result: ext?.result,
        callId: ext?.callId,
      })
      const reason = ext?.result === 'busy' ? HANGUP_REASON.BUSY : HANGUP_REASON.REFUSE
      const callState = this.callStateStore.getCallState

      // 触发语义化事件（在挂断之前）
      if (ext?.result === 'busy') {
        callKitEventBus.emit('callBusy', {
          ...buildBaseEventFields(
            {
              callId: callState.callId,
              channel: callState.channel,
              type: callState.type,
              callerUserId: callState.callerUserId,
              calleeUserId: callState.calleeUserId,
              groupId: undefined,
            },
            false
          ),
        })
      } else {
        callKitEventBus.emit('callRefused', {
          ...buildBaseEventFields(
            {
              callId: callState.callId,
              channel: callState.channel,
              type: callState.type,
              callerUserId: callState.callerUserId,
              calleeUserId: callState.calleeUserId,
              groupId: undefined,
            },
            false
          ),
          isRemote: true,
        })
      }

      const confirmCalleePayload = {
        callId: ext.callId,
        callerDevId: ext.callerDevId,
        calleeDevId: ext.calleeDevId,
        result: ext.result,
      }

      this.signalManager
        .sendConfirmCalleeMessage(message.from as string, confirmCalleePayload)
        .catch(() => {})

      // 单聊：执行挂断
      if (
        this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
        this.callStateStore.type !== CALL_TYPE.AUDIO_MULTI
      ) {
        logger.info('收到对方拒绝，执行挂断操作')
        const callService = new CallService()
        callService.handleRemoteRefuse().catch((err) => {
          logger.error('执行挂断失败:', err)
        })
      }
    } else {
      // 接受分支：发送 confirmCallee（单聊/群聊共用）
      logger.signal('recv', 'answerCall', {
        from: message.from,
        result: 'accept',
        callId: ext?.callId,
      })
      const confirmCalleePayload = {
        callId: ext.callId,
        callerDevId: ext.callerDevId,
        calleeDevId: ext.calleeDevId,
        result: 'accept',
      }
      this.signalManager
        .sendConfirmCalleeMessage(message.from as string, confirmCalleePayload)
        .catch(() => {})

      // 单聊特有：更新状态为 IN_CALL 并加入 RTC
      if (
        this.callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
        this.callStateStore.type !== CALL_TYPE.AUDIO_MULTI
      ) {
        logger.info('一对一通话，更新状态为 IN_CALL并加入RTC频道')
        this.callStateStore.setCallStatus(CALL_STATUS.IN_CALL)
        logger.stateChange(CALL_STATUS.ANSWER_CALL, CALL_STATUS.IN_CALL, {
          trigger: 'answerCall:accept',
          from: message.from,
        })

        // 触发 callStarted（主叫方）
        const callState = this.callStateStore.getCallState
        callKitEventBus.emit('callStarted', {
          ...buildBaseEventFields(
            {
              callId: callState.callId,
              channel: callState.channel,
              type: callState.type,
              callerUserId: callState.callerUserId,
              calleeUserId: callState.calleeUserId,
              groupId: undefined,
            },
            false
          ),
          isCaller: true,
        })

        this.joinRtcChannel().catch((error: any) => {
          logger.error('主叫方加入RTC频道失败:', error)
        })
      }
    }
  }

  /**
   * 收到 cancelCall 信令中的单聊分支
   */
  private handleCancelCall(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    if (ext.callId !== this.callStateStore.getCallState.callId) {
      logger.warn(
        'cancelCall信令消息通话callId与当前通话callId不一致，不做处理:ext.callId:',
        ext.callId,
        ',currentCallInfo.callId:',
        this.callStateStore.getCallState.callId
      )

      if (this.callStateStore.getCallStatus === CALL_STATUS.IDLE) {
        logger.info('当前状态 IDLE，不做处理')
        return
      }

      const currentStatus = this.callStateStore.getCallStatus
      const isFromCaller = message.from === this.callStateStore.getCallState.callerUserId

      if (
        this.callStateStore.type === CALL_TYPE.VIDEO_MULTI ||
        this.callStateStore.type === CALL_TYPE.AUDIO_MULTI
      ) {
        // 群聊容错已在 GroupCallSignalHandler 中处理，此处不重复处理
        logger.debug('群聊 cancelCall 由 GroupCallSignalHandler 处理')
        return
      }

      if (isFromCaller && (currentStatus === CALL_STATUS.ALERTING || currentStatus === CALL_STATUS.INVITING)) {
        logger.info('一对一通话中收到主叫方取消，执行挂断')
        const callState = this.callStateStore.getCallState
        callKitEventBus.emit('callCanceled', {
          ...buildBaseEventFields(
            {
              callId: callState.callId,
              channel: callState.channel,
              type: callState.type,
              callerUserId: callState.callerUserId,
              calleeUserId: callState.calleeUserId,
              groupId: undefined,
            },
            false
          ),
          isRemote: true,
        })
        const callService = new CallService()
        callService.handleRemoteCancel().catch((err) => {
          logger.error('执行挂断失败:', err)
        })
      }
      return
    }

    logger.signal('recv', 'cancelCall', {
      from: message.from,
      callId: ext?.callId,
    })
    logger.info('收到对方取消，执行挂断操作')
    const callState = this.callStateStore.getCallState
    const isGroupCall =
      callState.type === CALL_TYPE.VIDEO_MULTI || callState.type === CALL_TYPE.AUDIO_MULTI
    const callService = new CallService()

    if (isGroupCall) {
      // 群通话：使用 REMOTE_CANCEL，避免 callee 再次发送 cancel 信令
      callService.handleRemoteCancel().catch((err) => {
        logger.error('执行挂断失败:', err)
      })
    } else {
      callKitEventBus.emit('callCanceled', {
        ...buildBaseEventFields(
          {
            callId: callState.callId,
            channel: callState.channel,
            type: callState.type,
            callerUserId: callState.callerUserId,
            calleeUserId: callState.calleeUserId,
            groupId: undefined,
          },
          false
        ),
        isRemote: true,
      })
      callService.hangup(HANGUP_REASON.CANCEL).catch((err) => {
        logger.error('执行挂断失败:', err)
      })
    }
  }

  /**
   * 收到 leaveCall 信令中的单聊分支
   */
  private handleLeaveCall(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    if (ext.callId !== this.callStateStore.getCallState.callId) {
      logger.warn(
        'leaveCall信令消息通话callId与当前通话callId不一致，不做处理:ext.callId:',
        ext.callId,
        ',currentCallInfo.callId:',
        this.callStateStore.getCallState.callId
      )

      if (this.callStateStore.getCallStatus === CALL_STATUS.IDLE) {
        logger.info('当前状态 IDLE，不做处理')
        return
      }

      if (
        this.callStateStore.type === CALL_TYPE.VIDEO_MULTI ||
        this.callStateStore.type === CALL_TYPE.AUDIO_MULTI
      ) {
        // 群聊分支已在 GroupCallSignalHandler 中处理
        logger.debug('群聊 leaveCall 由 GroupCallSignalHandler 处理')
        return
      }

      if (this.callStateStore.getCallStatus === CALL_STATUS.IN_CALL) {
        logger.info('通话中对方离开，执行挂断')
        const callService = new CallService()
        callService.hangup(HANGUP_REASON.HANGUP).catch((err) => {
          logger.error('执行挂断失败:', err)
        })
      } else if (
        this.callStateStore.getCallStatus === CALL_STATUS.ALERTING &&
        message.from === this.callStateStore.getCallState.callerUserId
      ) {
        logger.info('被叫方ALERTING状态收到主叫方离开信令，执行挂断')
        const callService = new CallService()
        callService.hangup(HANGUP_REASON.HANGUP).catch((err) => {
          logger.error('执行挂断失败:', err)
        })
      }
      return
    }

    logger.signal('recv', 'leaveCall', {
      from: message.from,
      callId: ext?.callId,
    })

    if (
      this.callStateStore.type === CALL_TYPE.VIDEO_MULTI ||
      this.callStateStore.type === CALL_TYPE.AUDIO_MULTI
    ) {
      // 群聊分支已在 GroupCallSignalHandler 中处理
      logger.debug('群聊 leaveCall callId 匹配，由 GroupCallSignalHandler 处理')
      return
    }

    if (this.callStateStore.getCallStatus === CALL_STATUS.IDLE) {
      logger.info('当前状态 IDLE，不做处理')
      return
    }

    if (this.callStateStore.getCallStatus === CALL_STATUS.IN_CALL) {
      logger.info('通话中对方离开，执行挂断')
      const callService = new CallService()
      callService.hangup(HANGUP_REASON.HANGUP).catch((err) => {
        logger.error('执行挂断失败:', err)
      })
    } else if (
      this.callStateStore.getCallStatus === CALL_STATUS.ALERTING &&
      message.from === this.callStateStore.getCallState.callerUserId
    ) {
      logger.info('被叫方ALERTING状态收到主叫方离开信令，执行挂断')
      const callService = new CallService()
      callService.hangup(HANGUP_REASON.HANGUP).catch((err) => {
        logger.error('执行挂断失败:', err)
      })
    }
  }

  /**
   * 收到 confirmCallee 信令（被叫方确认 callee 已就绪）
   * 单聊/群聊共用：被叫方收到后进入 IN_CALL 并 join RTC
   */
  private handleConfirmCallee(message: CmdMsgBody) {
    const ext = message.ext
    if (!ext) return

    logger.signal('recv', 'confirmCallee', {
      from: message.from,
      callId: ext?.callId,
      result: ext?.result,
    })
    logger.info('收到 confirmCallee 信令，开始处理')

    if (ext.callId !== this.callStateStore.getCallState.callId) {
      logger.warn(
        'confirmCallee信令消息通话callId与当前通话callId不一致，不做处理:ext.callId:',
        ext.callId,
        ',currentCallInfo.callId:',
        this.callStateStore.getCallState.callId
      )
      return
    }

    if (this.callStateStore.getCallStatus !== CALL_STATUS.IN_CALL) {
      logger.info('更新通话状态为 IN_CALL')
      this.callStateStore.setCallStatus(CALL_STATUS.IN_CALL)
    } else {
      logger.info('当前状态已是 IN_CALL，继续加入RTC频道')
    }

    // 触发 callStarted（被叫方）
    const callState = this.callStateStore.getCallState
    callKitEventBus.emit('callStarted', {
      ...buildBaseEventFields(
        {
          callId: callState.callId,
          channel: callState.channel,
          type: callState.type,
          callerUserId: callState.callerUserId,
          calleeUserId: callState.calleeUserId,
          groupId: undefined,
        },
        false
      ),
      isCaller: false,
    })

    this.joinRtcChannel().catch((error: any) => {
      logger.error('被叫方加入RTC频道失败:', error)
    })
  }
}
