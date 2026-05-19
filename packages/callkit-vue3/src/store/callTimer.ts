import { defineStore } from 'pinia'
import { logger } from '../utils/logger'

export interface CallTimerState {
  callDuration: number
  callStartTime: number
  _timer: any
}

/**
 * CallTimerStore
 * 通话计时器状态（单聊域）
 * 职责：管理一对一通话的时长计时
 */
export const useCallTimerStore = defineStore('callTimer', {
  state: (): CallTimerState => ({
    callDuration: 0,
    callStartTime: 0,
    _timer: null,
  }),

  getters: {
    /**
     * 获取格式化的通话时长
     */
    formattedCallDuration(): string {
      const hours = Math.floor(this.callDuration / 3600)
      const minutes = Math.floor((this.callDuration % 3600) / 60)
      const seconds = this.callDuration % 60

      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      }
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    },
  },

  actions: {
    /**
     * 开始通话计时
     */
    startCallTimer() {
      if (this._timer) {
        clearInterval(this._timer)
      }
      this.callStartTime = Date.now()
      this.callDuration = 0

      this._timer = setInterval(() => {
        this.updateCallDuration()
      }, 1000)
      logger.debug('通话计时器已启动')
    },

    /**
     * 更新通话时长（内部调用）
     */
    updateCallDuration() {
      if (this.callStartTime === 0) return
      this.callDuration = Math.floor((Date.now() - this.callStartTime) / 1000)
    },

    /**
     * 停止通话计时
     */
    stopCallTimer() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
      this.callStartTime = 0
      this.callDuration = 0
      logger.debug('通话计时器已停止')
    },

    /**
     * 重置计时器状态
     */
    reset() {
      this.stopCallTimer()
    },
  },
})
