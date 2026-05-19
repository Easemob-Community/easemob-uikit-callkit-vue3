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
   * 发送邀请（主叫方添加新成员）
   * 复用 useCallKitCore.inviteGroupCall
   */
  async sendInvite(
    userIds: string[],
    groupId: string,
    message: string,
    callType: CALL_TYPE = CALL_TYPE.VIDEO_MULTI
  ): Promise<void> {
    await this.core.inviteGroupCall({
      groupId,
      participantIds: userIds,
      callType,
      ext: { message },
    })
    logger.info('[GroupCallSignalingAdapter] 发送邀请', { userIds, groupId, callType })
  }

  /**
   * 接受邀请（被叫方）
   * 实际接听动作在 viewModel 中 orchestrate
   */
  async sendAnswer(userId: string, groupId: string): Promise<void> {
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
   */
  async cancelInvitation(userId: string, groupId?: string): Promise<void> {
    try {
      const groupCallStore = useGroupCallStore()
      const gid = groupId || groupCallStore.session?.groupId || ''
      await this.core.hangup({
        reason: 'cancel',
      })
      logger.info('[GroupCallSignalingAdapter] 取消邀请信令已发送', userId)
    } catch (error) {
      logger.error('[GroupCallSignalingAdapter] 取消邀请失败', error)
    }
  }
}
