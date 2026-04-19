import { defineStore } from 'pinia'
import type { RtcChannelState, RtcChannelInfo } from './types'
import { RtcService } from '../services/RtcService'
import { logger } from '../utils/logger'
import { useChatClientStore } from './chatClient'

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
    _timer: null as any, // 内部定时器
    uidToUserIdMap: new Map<string, string>(), // Agora UID 到环信 userId 的映射
    joinedRtcUsers: new Set<string>(), // 已加入RTC频道的userId集合
    pendingUserIds: new Set<string>(), // 待加入RTC的userId集合
    leftUsers: new Set<string>() // 已明确离开的userId集合（避免挂断后显示"邀请中"）
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
        
        // 获取环信客户端
        const chatClientStore = useChatClientStore()
        const chatClient = chatClientStore.getChatClient
        
        const service = new RtcService({
          appId: agoraAppId,
          chatClient: chatClient, // 传入环信客户端用于获取userId映射
          // 状态同步回调：RtcService 内部状态变化时通知 store 更新
          onAudioEnabledChange: (enabled) => this.setAudioEnabled(enabled),
          onVideoEnabledChange: (enabled) => this.setVideoEnabled(enabled),
          onLocalStreamChange: (stream) => this.setLocalStream(stream),
          onUidToUserIdMapping: (uid, userId) => this.setUidToUserIdMapping(uid, userId),
          onUserJoinedRtc: (userId) => this.markUserJoinedRtc(userId),
          onUserLeftRtc: (userId) => this.markUserLeftRtc(userId),
          popPendingUserId: () => this.popPendingUserId(),
        })
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
     * 添加UID到userId的映射
     */
    setUidToUserIdMapping(uid: string, userId: string) {
      this.uidToUserIdMap.set(uid, userId)
      logger.debug('RTC UID映射已更新:', { uid, userId })
    },
    
    /**
     * 根据UID获取userId
     */
    getUserIdByUid(uid: string): string | null {
      return this.uidToUserIdMap.get(uid) || null
    },
    
    /**
     * 标记用户已加入RTC频道
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
     * 标记用户离开RTC频道
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
     * 检查用户是否已加入RTC频道
     */
    isUserInRtc(userId: string): boolean {
      return this.joinedRtcUsers.has(userId)
    },
    
    /**
     * 检查用户是否已明确离开（用于判断是否应该显示在参与者列表中）
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
     * 添加待加入RTC的userId（收到answerCall但尚未加入RTC）
     */
    addPendingUserId(userId: string) {
      this.pendingUserIds.add(userId)
      logger.debug('用户已标记为待加入RTC:', userId)
    },
    
    /**
     * 移除待加入RTC的userId
     */
    removePendingUserId(userId: string) {
      this.pendingUserIds.delete(userId)
      logger.debug('用户已从待加入列表移除:', userId)
    },
    
    /**
     * 获取第一个待加入的userId并移除（用于匹配RTC uid）
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
      this.uidToUserIdMap.clear()
      this.joinedRtcUsers.clear()
      this.pendingUserIds.clear()
      this.leftUsers.clear()
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    }
  }
})