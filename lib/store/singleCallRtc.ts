import { defineStore } from 'pinia'
import { logger } from '../utils/logger'

export interface SingleCallRtcState {
  uidToUserIdMap: Map<string, string>
  joinedRtcUsers: Set<string>
  pendingUserIds: Set<string>
  leftUsers: Set<string>
}

/**
 * SingleCallRtcStore
 * 单聊 RTC 用户状态管理
 * 职责：管理一对一通话中的 RTC 用户映射和生命周期
 *
 * 注意：群聊场景使用 GroupCallStore 管理参与者，不使用本 store。
 */
export const useSingleCallRtcStore = defineStore('singleCallRtc', {
  state: (): SingleCallRtcState => ({
    uidToUserIdMap: new Map<string, string>(),
    joinedRtcUsers: new Set<string>(),
    pendingUserIds: new Set<string>(),
    leftUsers: new Set<string>(),
  }),

  actions: {
    /**
     * 添加 UID 到 userId 的映射
     */
    setUidToUserIdMapping(uid: string, userId: string) {
      this.uidToUserIdMap.set(uid, userId)
      logger.debug('RTC UID映射已更新:', { uid, userId })
    },

    /**
     * 根据 UID 获取 userId
     */
    getUserIdByUid(uid: string): string | null {
      return this.uidToUserIdMap.get(uid) || null
    },

    /**
     * 标记用户已加入 RTC 频道
     */
    markUserJoinedRtc(userId: string) {
      this.joinedRtcUsers.add(userId)
      // 从离开列表中移除（用户重新加入）
      if (this.leftUsers.has(userId)) {
        this.leftUsers.delete(userId)
        logger.debug('用户重新加入RTC，从leftUsers中移除:', userId)
      }
      // 强制触发响应式更新
      this.joinedRtcUsers = new Set(this.joinedRtcUsers)
      logger.debug('用户已加入RTC频道:', userId)
    },

    /**
     * 标记用户离开 RTC 频道
     */
    markUserLeftRtc(userId: string) {
      this.joinedRtcUsers.delete(userId)
      // 标记为已明确离开（避免挂断后显示"邀请中"）
      this.leftUsers.add(userId)
      // 强制触发响应式更新
      this.joinedRtcUsers = new Set(this.joinedRtcUsers)
      this.leftUsers = new Set(this.leftUsers)
      logger.debug('用户已离开RTC频道并标记为leftUser:', userId)
    },

    /**
     * 检查用户是否已加入 RTC 频道
     */
    isUserInRtc(userId: string): boolean {
      return this.joinedRtcUsers.has(userId)
    },

    /**
     * 检查用户是否已明确离开
     */
    hasUserLeft(userId: string): boolean {
      return this.leftUsers.has(userId)
    },

    /**
     * 清空已离开用户列表（新通话开始时调用）
     */
    clearLeftUsers() {
      this.leftUsers.clear()
      logger.debug('已清空leftUsers列表')
    },

    /**
     * 添加待加入 RTC 的 userId
     */
    addPendingUserId(userId: string) {
      this.pendingUserIds.add(userId)
      logger.debug('用户已标记为待加入RTC:', userId)
    },

    /**
     * 移除待加入 RTC 的 userId
     */
    removePendingUserId(userId: string) {
      this.pendingUserIds.delete(userId)
      logger.debug('用户已从待加入列表移除:', userId)
    },

    /**
     * 获取第一个待加入的 userId 并移除
     */
    popPendingUserId(): string | null {
      const iter = this.pendingUserIds.values()
      const first = iter.next()
      if (!first.done) {
        const userId = first.value
        this.pendingUserIds.delete(userId)
        logger.debug('从待加入列表中取出userId:', userId)
        return userId
      }
      return null
    },

    /**
     * 重置所有状态
     */
    reset() {
      this.uidToUserIdMap.clear()
      this.joinedRtcUsers.clear()
      this.pendingUserIds.clear()
      this.leftUsers.clear()
      logger.debug('SingleCallRtcStore 已重置')
    },
  },
})
