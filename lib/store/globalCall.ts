import { defineStore } from 'pinia'

/**
 * GlobalCallStore
 * 跨通话域的共享状态：用户资料映射、窗口模式等
 * 单聊/群聊共用，但不属于任何特定通话域
 */
export const useGlobalCallStore = defineStore('globalCall', {
  state: () => ({
    userInfoMap: new Map<string, { nickname?: string; avatarURL?: string }>(),
    isMinimized: false,
  }),

  actions: {
    setUserInfo(
      userId: string,
      userInfo: { nickname?: string; avatarURL?: string }
    ) {
      this.userInfoMap.set(userId, userInfo)
    },

    setMinimized(value: boolean) {
      this.isMinimized = value
    },
  },

  getters: {
    getUserInfo(): (userId: string) => {
      nickname?: string
      avatarURL?: string
    } {
      return (userId: string) => {
        return this.userInfoMap.get(userId) || {}
      }
    },

    getIsMinimized(): boolean {
      return this.isMinimized || false
    },
  },
})
