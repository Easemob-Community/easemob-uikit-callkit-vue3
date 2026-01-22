import { defineStore } from 'pinia'
import type { RtcChannelState, RtcChannelInfo } from './types'
import { RtcService } from '../services/RtcService'
import { logger } from '../utils/logger'

export const useRtcChannelStore = defineStore('rtcChannel', {
  /**
   * RTC频道状态数据
   */
  state: (): RtcChannelState => ({
    channels: {},
    activeChannelId: null,
    isConnected: false,
    localStream: null,
    remoteStreams: {},
    audioEnabled: true,
    videoEnabled: true,
    rtcService: null as RtcService | null, // RTC服务实例
    agoraAppId: null as string | null, // Agora AppId
    callDuration: 0, // 通话时长（秒）
    callStartTime: 0, // 通话开始时间戳
    _timer: null as any // 内部定时器
  }),
  
  /**
   * 计算属性
   */
  getters: {
    /**
     * 获取当前活跃频道信息
     */
    activeChannel(): RtcChannelInfo | null {
      return this.activeChannelId ? this.channels[this.activeChannelId] : null
    },
    
    /**
     * 获取当前频道的参与者数量
     */
    activeChannelParticipantCount(): number {
      return this.activeChannel ? this.activeChannel.participants.length : 0
    },
    
    /**
     * 获取所有频道ID列表
     */
    channelIds(): string[] {
      return Object.keys(this.channels)
    },
    
    /**
     * 获取RTC服务实例
     */
    getRtcService(): any {
      return this.rtcService
    },
    
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
    }
  },
  
  /**
   * 频道管理方法
   */
  actions: {
    /**
     * 初始化RTC服务
     */
    async initializeRtcService(agoraAppId: string) {
      if (this.rtcService) {
        logger.warn('RTC服务已经初始化,无需重复初始化')
        return
      }
      
      try {
        logger.info('初始化RTC服务...')
        this.agoraAppId = agoraAppId
        const service = new RtcService({ appId: agoraAppId })
        await service.initialize()
        this.rtcService = service
        logger.info('RTC服务初始化成功')
      } catch (error) {
        logger.error('RTC服务初始化失败:', error)
        throw error
      }
    },
    
    /**
     * 销毁RTC服务
     */
    async destroyRtcService() {
      if (this.rtcService) {
        logger.info('销毁RTC服务...')
        await this.rtcService.destroy()
        this.rtcService = null
        this.agoraAppId = null
      }
    },
    
    /**
     * 创建新的RTC频道
     */
    createChannel(channelId: string, callId: string, isGroup: boolean = false) {
      if (!this.channels[channelId]) {
        this.channels[channelId] = {
          channelId,
          callId,
          participants: [],
          joinTime: Date.now(),
          lastActiveTime: Date.now(),
          isGroup
        }
      }
    },
    
    /**
     * 设置当前活跃频道
     */
    setActiveChannel(channelId: string | null) {
      this.activeChannelId = channelId
    },
    
    /**
     * 加入频道
     */
    joinChannel(channelId: string, userId: string) {
      if (this.channels[channelId]) {
        const channel = this.channels[channelId]
        if (!channel.participants.includes(userId)) {
          channel.participants.push(userId)
          channel.lastActiveTime = Date.now()
        }
        this.activeChannelId = channelId
        this.isConnected = true
      }
    },
    
    /**
     * 离开频道
     */
    leaveChannel(channelId: string, userId: string) {
      if (this.channels[channelId]) {
        const channel = this.channels[channelId]
        const index = channel.participants.indexOf(userId)
        if (index > -1) {
          channel.participants.splice(index, 1)
        }
        
        // 如果频道为空，则移除该频道
        if (channel.participants.length === 0) {
          this.removeChannel(channelId)
        } else {
          channel.lastActiveTime = Date.now()
        }
        
        // 如果离开的是当前活跃频道，则清空活跃频道
        if (this.activeChannelId === channelId) {
          this.activeChannelId = null
          this.isConnected = false
        }
      }
    },
    
    /**
     * 移除频道
     */
    removeChannel(channelId: string) {
      if (this.channels[channelId]) {
        delete this.channels[channelId]
        
        // 如果移除的是当前活跃频道，则清空活跃频道
        if (this.activeChannelId === channelId) {
          this.activeChannelId = null
          this.isConnected = false
        }
      }
    },
    
    /**
     * 设置本地媒体流
     */
    setLocalStream(stream: MediaStream | null) {
      this.localStream = stream
    },
    
    /**
     * 添加远程媒体流
     */
    addRemoteStream(userId: string, stream: MediaStream) {
      this.remoteStreams[userId] = stream
    },
    
    /**
     * 移除远程媒体流
     */
    removeRemoteStream(userId: string) {
      if (this.remoteStreams[userId]) {
        delete this.remoteStreams[userId]
      }
    },
    
    /**
     * 启用/禁用音频
     */
    setAudioEnabled(enabled: boolean) {
      this.audioEnabled = enabled
    },
    
    /**
     * 启用/禁用视频
     */
    setVideoEnabled(enabled: boolean) {
      this.videoEnabled = enabled
    },
    
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
    },
    
    /**
     * 重置所有RTC频道状态
     */
    reset() {
      // 停止并清理本地流的所有轨道
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop()
          logger.debug('本地轨道已停止:', track.kind)
        })
      }
      
      // 停止并清理所有远程流的轨道
      Object.entries(this.remoteStreams).forEach(([userId, stream]) => {
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach(track => {
            track.stop()
            logger.debug(`远程轨道已停止 (${userId}):`, track.kind)
          })
        }
      })
      
      this.channels = {}
      this.activeChannelId = null
      this.isConnected = false
      this.localStream = null
      this.remoteStreams = {}
      this.videoEnabled = true
      this.callDuration = 0
      this.callStartTime = 0
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    }
  }
})