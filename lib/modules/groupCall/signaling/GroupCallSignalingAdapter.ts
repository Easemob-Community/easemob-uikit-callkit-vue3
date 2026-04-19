import { CallService } from '../../../services/CallService'
import { useSignalManager } from '../../../composables/useSignalManager'
import { useCallStateStore } from '../../../store/callState'
import { CALL_STATUS } from '../../../types/callstate.types'
import { logger } from '../../../utils/logger'
import type { GroupCallSessionState } from '../types'

/**
 * GroupCallSignalingAdapter
 * 严格复用现有 CallKit 的群通话信令实现，不新增/修改任何 IM 消息格式
 * 职责：将新模块的群组通话动作转换为现有 CallService / useSignalManager 调用
 */
export class GroupCallSignalingAdapter {
  private callService = new CallService()
  private signalManager = useSignalManager()
  private callStateStore = useCallStateStore()

  /**
   * 初始化群组通话状态（主叫方发起前）
   */
  prepareSession(payload: {
    groupId: string
    channel: string
    callType: 'video' | 'audio'
    callerUserId: string
    invitedMembers: string[]
  }) {
    this.callStateStore.setCallState({
      status: CALL_STATUS.INVITING,
      type: payload.callType === 'video' ? 2 : 3, // VIDEO_MULTI=2, AUDIO_MULTI=3
      callerUserId: payload.callerUserId,
      calleeUserId: '',
      groupId: payload.groupId,
      channel: payload.channel,
      invitedMembers: payload.invitedMembers,
    })
    logger.info('[GroupCallSignalingAdapter] 准备会话', payload)
  }

  /**
   * 发送邀请（主叫方添加新成员）
   * 复用 useSignalManager.sendInviteMessage
   */
  async sendInvite(
    userIds: string[],
    groupId: string,
    message: string
  ): Promise<void> {
    await this.signalManager.sendInviteMessage(
      userIds,
      'groupChat',
      message,
      groupId
    )
    logger.info('[GroupCallSignalingAdapter] 发送邀请', { userIds, groupId })
  }

  /**
   * 接受邀请（被叫方）
   * 复用 useAnswerCall.acceptCall，但这里只做信令层封装
   * 实际接听动作在 viewModel 中 orchestrate
   */
  async sendAnswer(userId: string, groupId: string): Promise<void> {
    // 通过现有的 answer message 机制发送接受信令
    // 注意：这里不直接操作，而是通过现有的 useAnswerCall 来处理
    // 此 adapter 主要给 viewModel 提供一个统一的面板
    logger.info('[GroupCallSignalingAdapter] 发送接听信令', { userId, groupId })
  }

  /**
   * 挂断 / 离开通话
   * 复用 CallService.hangup
   */
  async hangup(): Promise<void> {
    await this.callService.hangup()
    logger.info('[GroupCallSignalingAdapter] 挂断完成')
  }

  /**
   * 取消邀请（邀请超时或主动取消）
   * 复用 useSignalManager.sendCancelMessage
   */
  async cancelInvitation(userId: string, groupId?: string): Promise<void> {
    try {
      await this.signalManager.sendCancelMessage(
        groupId || this.callStateStore.getCallState.groupId || '',
        'groupChat',
        [userId]
      )
      logger.info('[GroupCallSignalingAdapter] 取消邀请信令已发送', userId)
    } catch (error) {
      logger.error('[GroupCallSignalingAdapter] 取消邀请失败', error)
    }
  }
}
