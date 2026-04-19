import { CallService } from '../../../services/CallService'
import { useSignalManager } from '../../../composables/useSignalManager'
import { useGroupCallStore } from '../viewModel/GroupCallStore'
import { logger } from '../../../utils/logger'

/**
 * GroupCallSignalingAdapter
 * 严格复用现有 CallKit 的群通话信令实现，不新增/修改任何 IM 消息格式
 * 职责：将新模块的群组通话动作转换为现有 CallService / useSignalManager 调用
 */
export class GroupCallSignalingAdapter {
  private callService = new CallService()
  private signalManager = useSignalManager()

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
   * 复用 useCallKit().accept()，但这里只做信令层封装
   * 实际接听动作在 viewModel 中 orchestrate
   */
  async sendAnswer(userId: string, groupId: string): Promise<void> {
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
      const groupCallStore = useGroupCallStore()
      const gid = groupId || groupCallStore.session?.groupId || ''
      await this.signalManager.sendCancelMessage(gid, 'groupChat', [userId])
      logger.info('[GroupCallSignalingAdapter] 取消邀请信令已发送', userId)
    } catch (error) {
      logger.error('[GroupCallSignalingAdapter] 取消邀请失败', error)
    }
  }
}
