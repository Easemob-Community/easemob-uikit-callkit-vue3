import { useCallKitCore } from '../../../composables/useCallKitCore'
import { useGroupCallStore } from '../viewModel/GroupCallStore'
import { CALL_TYPE } from '../../../types/callstate.types'
import { logger } from '../../../utils/logger'

/**
 * GroupCallSignalingAdapter
 * 基于 callkit-core 的群通话信令适配器
 * 职责：将新模块的群组通话动作转换为 useCallKitCore API 调用
 */
export class GroupCallSignalingAdapter {
  private core = useCallKitCore()

  /**
   * 发送邀请（通话中追加新成员）
   * 复用 useCallKitCore.inviteMoreParticipants（不会创建新通话）
   */
  async sendInvite(
    userIds: string[],
    groupId: string,
    message: string,
    callType: CALL_TYPE = CALL_TYPE.VIDEO_MULTI
  ): Promise<void> {
    // 从当前 session 读取真实 callType，避免音频群聊追加成员时错误使用视频类型
    const groupCallStore = useGroupCallStore()
    const actualCallType = groupCallStore.session?.callType === 'audio'
      ? CALL_TYPE.AUDIO_MULTI
      : callType
    await this.core.inviteMoreParticipants(userIds)
    logger.info('[GroupCallSignalingAdapter] 发送邀请', { userIds, groupId, callType: actualCallType })
  }

  /**
   * 接受邀请（被叫方）
   * 通过 core.answerCall 发送接听信令
   */
  async sendAnswer(userId: string, groupId: string): Promise<void> {
    const callState = this.core.callState
    await this.core.answerCall({ callId: callState.callId || '', result: 'accept' })
    logger.info('[GroupCallSignalingAdapter] 发送接听信令', { userId, groupId })
  }

  /**
   * 挂断 / 离开通话 / 取消邀请
   * 区分：有成员已加入时发 leaveCall，仅邀请阶段发 cancelCall
   */
  async hangup(): Promise<void> {
    const groupCallStore = useGroupCallStore()
    const hasJoinedMembers = groupCallStore.participantList.some(
      (p) => !p.isLocal && p.state !== 'invited' && p.state !== 'left'
    )
    if (hasJoinedMembers) {
      await this.core.hangup({ reason: 'normal' })
      logger.info('[GroupCallSignalingAdapter] 挂断完成（leaveCall）')
    } else {
      await this.core.hangup({ reason: 'cancel' })
      logger.info('[GroupCallSignalingAdapter] 取消完成（cancelCall）')
    }
  }

  /**
   * 取消邀请（邀请超时或主动取消）
   * 仅从本地会话移除该参与者，不发送全局 hangup
   */
  async cancelInvitation(userId: string, groupId?: string): Promise<void> {
    try {
      const groupCallStore = useGroupCallStore()
      groupCallStore.removeParticipant(userId)
      logger.info('[GroupCallSignalingAdapter] 取消邀请（本地移除参与者）', { userId, groupId })
    } catch (error) {
      logger.error('[GroupCallSignalingAdapter] 取消邀请失败', error)
    }
  }
}
