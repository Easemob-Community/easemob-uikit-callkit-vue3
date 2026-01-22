/**
 * RTC服务 - RtcService
 * 
 * 职责：
 * 1. 封装所有与音视频相关的WebRTC操作
 * 2. 管理音视频设备的访问和控制
 * 3. 处理音视频流的发布和订阅
 * 4. 提供音视频质量控制
 * 
 * 功能范围：
 * - 初始化WebRTC连接
 * - 管理本地音视频流
 * - 发布和订阅远程流
 * - 处理音视频设备切换
 * - 网络质量监控
 */

import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  VideoEncoderConfigurationPreset,
  IAgoraRTCError
} from 'agora-rtc-sdk-ng'
import { useRtcChannelStore } from '../store/rtcChannel'
import { logger } from '../utils/logger'

export interface RtcServiceConfig {
  appId: string
  encoderConfig?: VideoEncoderConfigurationPreset
  onNetworkQualityChange?: (quality: any) => void
  onUserJoined?: (userId: string) => void
  onUserLeft?: (userId: string) => void
  onUserPublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  onUserUnpublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  onVolumeIndicator?: (volumes: any[]) => void
}

export class RtcService {
  private client: IAgoraRTCClient | null = null
  private appId: string = ''
  private agoraUid: number = 0
  private localVideoTrack: ICameraVideoTrack | null = null
  private localAudioTrack: IMicrophoneAudioTrack | null = null
  private remoteVideoTracks: Map<string, IRemoteVideoTrack> = new Map()
  private remoteAudioTracks: Map<string, IRemoteAudioTrack> = new Map()
  private localVideoStream: MediaStream | null = null
  private currentCameraDeviceId: string | null = null
  private encoderConfig: VideoEncoderConfigurationPreset = '720p'
  private isAudioEnabled: boolean = true
  private isVideoEnabled: boolean = true
  
  // 回调函数
  private onNetworkQualityChange?: (quality: any) => void
  private onUserJoined?: (userId: string) => void
  private onUserLeft?: (userId: string) => void
  private onUserPublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  private onUserUnpublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  private onVolumeIndicator?: (volumes: any[]) => void
  
  private rtcChannelStore = useRtcChannelStore()

  constructor(config: RtcServiceConfig) {
    this.appId = config.appId
    this.encoderConfig = config.encoderConfig || '720p'
    this.onNetworkQualityChange = config.onNetworkQualityChange
    this.onUserJoined = config.onUserJoined
    this.onUserLeft = config.onUserLeft
    this.onUserPublished = config.onUserPublished
    this.onUserUnpublished = config.onUserUnpublished
    this.onVolumeIndicator = config.onVolumeIndicator
  }

  /**
   * 初始化RTC客户端
   */
  async initialize(): Promise<void> {
    try {
      AgoraRTC.setLogLevel(4)
      this.client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' })
      this.client.setClientRole('host')
      
      // 添加事件监听
      this.addEventListeners()
      
      logger.info('RtcService initialized successfully')
    } catch (error) {
      logger.error('RtcService initialization failed:', error)
      throw error
    }
  }

  /**
   * 更新 appId（支持动态更新）
   */
  setAppId(appId: string): void {
    this.appId = appId
    logger.debug('RtcService: appId 已更新为', appId)
  }

  /**
   * 加入频道
   */
  async joinChannel(
    channelName: string,
    token: string | null,
    uid: number,
    appId?: string  // 支持传入动态 appId
  ): Promise<number> {
    if (!this.client) {
      throw new Error('RTC client not initialized')
    }

    // 如果传入了 appId，更新本地 appId
    if (appId) {
      this.setAppId(appId)
    }

    try {
      this.agoraUid = await this.client.join(
        this.appId,
        channelName,
        token,
        uid
      )
      
      logger.info('Joined RTC channel:', { channelName, uid: this.agoraUid, appId: this.appId })
      return this.agoraUid
    } catch (error) {
      logger.error('Failed to join channel:', error)
      throw error
    }
  }

  /**
   * 离开频道
   */
  async leaveChannel(): Promise<void> {
    if (!this.client) return

    try {
      // 取消发布
      if (this.localAudioTrack || this.localVideoTrack) {
        const tracks: any[] = []
        if (this.localAudioTrack) tracks.push(this.localAudioTrack)
        if (this.localVideoTrack) tracks.push(this.localVideoTrack)
        
        if (tracks.length > 0 && this.client.connectionState === 'CONNECTED') {
          await this.client.unpublish(tracks)
        }
      }

      // 关闭本地轨道
      await this.closeLocalTracks()

      // 离开频道
      if (this.client.connectionState === 'CONNECTED') {
        await this.client.leave()
      }

      logger.info('Left RTC channel')
    } catch (error) {
      logger.error('Failed to leave channel:', error)
      throw error
    }
  }

  /**
   * 创建本地音频轨道
   */
  async createAudioTrack(): Promise<IMicrophoneAudioTrack> {
    try {
      if (this.localAudioTrack) {
        return this.localAudioTrack
      }

      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
      this.rtcChannelStore.setAudioEnabled(true)
      
      logger.info('Created local audio track')
      return this.localAudioTrack
    } catch (error) {
      logger.error('Failed to create audio track:', error)
      throw error
    }
  }

  /**
   * 创建本地视频轨道
   */
  async createVideoTrack(): Promise<ICameraVideoTrack> {
    try {
      if (this.localVideoTrack) {
        return this.localVideoTrack
      }

      const config = this.encoderConfig
        ? { encoderConfig: this.encoderConfig }
        : undefined
      
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack(config)
      this.rtcChannelStore.setVideoEnabled(true)
      
      // 创建本地视频流
      this.localVideoStream = new MediaStream([
        this.localVideoTrack.getMediaStreamTrack()
      ])
      this.rtcChannelStore.setLocalStream(this.localVideoStream)
      
      logger.info('Created local video track')
      return this.localVideoTrack
    } catch (error) {
      logger.error('Failed to create video track:', error)
      throw error
    }
  }

  /**
   * 发布本地轨道
   */
  async publishTracks(tracks: any[]): Promise<void> {
    if (!this.client) {
      throw new Error('RTC client not initialized')
    }

    try {
      await this.client.publish(tracks)
      logger.info('Published local tracks')
    } catch (error) {
      logger.error('Failed to publish tracks:', error)
      throw error
    }
  }

  /**
   * 切换音频状态
   */
  async toggleAudio(enabled: boolean): Promise<boolean> {
    try {
      if (!this.localAudioTrack) {
        if (enabled) {
          await this.createAudioTrack()
          if (this.client && this.client.connectionState === 'CONNECTED') {
            await this.client.publish([this.localAudioTrack!])
          }
        }
        this.isAudioEnabled = enabled
        this.rtcChannelStore.setAudioEnabled(enabled)
        return enabled
      }

      await this.localAudioTrack.setEnabled(enabled)
      this.isAudioEnabled = enabled
      this.rtcChannelStore.setAudioEnabled(enabled)
      
      logger.info('Audio toggled:', enabled)
      return enabled
    } catch (error) {
      logger.error('Failed to toggle audio:', error)
      return this.isAudioEnabled
    }
  }

  /**
   * 切换视频状态
   */
  async toggleVideo(enabled: boolean): Promise<boolean> {
    try {
      if (!this.localVideoTrack) {
        if (enabled) {
          await this.createVideoTrack()
          if (this.client && this.client.connectionState === 'CONNECTED') {
            // 检查轨道是否已发布，避免重复发布
            const publishedTracks = this.client.localTracks
            const isVideoPublished = publishedTracks.some(
              track => track.trackMediaType === 'video'
            )
            if (!isVideoPublished && this.localVideoTrack) {
              await this.client.publish([this.localVideoTrack])
              logger.info('Video track published')
            }
          }
        }
        this.isVideoEnabled = enabled
        this.rtcChannelStore.setVideoEnabled(enabled)
        return enabled
      }

      if (enabled) {
        // 重新开启视频：先检查是否需要重新创建轨道
        if (!this.localVideoTrack || this.localVideoTrack.getMediaStreamTrack()?.readyState !== 'live') {
          // 轨道已被销毁或不可用，重新创建
          await this.createVideoTrack()
          if (this.client && this.client.connectionState === 'CONNECTED') {
            const publishedTracks = this.client.localTracks
            const isVideoPublished = publishedTracks.some(
              track => track.trackMediaType === 'video'
            )
            if (!isVideoPublished && this.localVideoTrack) {
              await this.client.publish([this.localVideoTrack])
              logger.info('Video track re-published')
            }
          }
          
          // 重新创建后更新本地视频流到 store
          if (this.localVideoTrack) {
            this.localVideoStream = new MediaStream([
              this.localVideoTrack.getMediaStreamTrack()
            ])
            this.rtcChannelStore.setLocalStream(this.localVideoStream)
            logger.info('Local video stream updated after recreating track')
          }
        } else {
          // 轨道仍然有效，只需开启
          await this.localVideoTrack.setEnabled(true)
        }
        this.isVideoEnabled = true
        this.rtcChannelStore.setVideoEnabled(true)
      } else {
        // 关闭视频时先取消发布，再关闭轨道
        if (this.client && this.client.connectionState === 'CONNECTED' && this.localVideoTrack) {
          try {
            await this.client.unpublish([this.localVideoTrack])
            logger.info('Video track unpublished')
          } catch (unpublishError) {
            logger.warn('Failed to unpublish video track:', unpublishError)
          }
        }
        
        // 停止并清理轨道
        const mediaStreamTrack = this.localVideoTrack.getMediaStreamTrack()
        if (mediaStreamTrack) {
          mediaStreamTrack.stop()
        }
        this.localVideoTrack.close()
        this.localVideoTrack = null
        this.localVideoStream = null
        this.rtcChannelStore.setLocalStream(null)
        this.isVideoEnabled = false
        this.rtcChannelStore.setVideoEnabled(false)
      }
      
      logger.info('Video toggled:', enabled)
      return this.isVideoEnabled
    } catch (error) {
      logger.error('Failed to toggle video:', error)
      return this.isVideoEnabled
    }
  }

  /**
   * 切换摄像头设备
   */
  async switchCamera(deviceId: string): Promise<boolean> {
    if (!this.localVideoTrack || !this.localVideoTrack.enabled) {
      logger.warn('Cannot switch camera: video track not available or disabled')
      return false
    }

    try {
      await this.localVideoTrack.setDevice(deviceId)
      this.currentCameraDeviceId = deviceId
      
      logger.info('Camera switched to:', deviceId)
      return true
    } catch (error) {
      logger.error('Failed to switch camera:', error)
      return false
    }
  }

  /**
   * 切换麦克风设备
   */
  async switchMicrophone(deviceId: string): Promise<boolean> {
    if (!this.localAudioTrack || !this.localAudioTrack.enabled) {
      logger.warn('Cannot switch microphone: audio track not available or disabled')
      return false
    }

    try {
      await this.localAudioTrack.setDevice(deviceId)
      
      logger.info('Microphone switched to:', deviceId)
      return true
    } catch (error) {
      logger.error('Failed to switch microphone:', error)
      return false
    }
  }

  /**
   * 订阅远程用户
   */
  async subscribeRemoteUser(
    user: IAgoraRTCRemoteUser,
    mediaType: 'audio' | 'video'
  ): Promise<void> {
    if (!this.client) {
      throw new Error('RTC client not initialized')
    }

    try {
      await this.client.subscribe(user, mediaType)
      
      if (mediaType === 'video' && user.videoTrack) {
        this.remoteVideoTracks.set(user.uid.toString(), user.videoTrack)
      } else if (mediaType === 'audio' && user.audioTrack) {
        this.remoteAudioTracks.set(user.uid.toString(), user.audioTrack)
        user.audioTrack.play()
      }
      
      logger.info('Subscribed to remote user:', { uid: user.uid, mediaType })
    } catch (error) {
      logger.error('Failed to subscribe remote user:', error)
      throw error
    }
  }

  /**
   * 获取本地视频流
   */
  getLocalVideoStream(): MediaStream | null {
    if (this.localVideoStream) {
      return this.localVideoStream
    }

    if (this.localVideoTrack) {
      this.localVideoStream = new MediaStream([
        this.localVideoTrack.getMediaStreamTrack()
      ])
      return this.localVideoStream
    }

    return null
  }

  /**
   * 获取远程视频轨道
   */
  getRemoteVideoTrack(userId: string): IRemoteVideoTrack | null {
    return this.remoteVideoTracks.get(userId) || null
  }

  /**
   * 获取远程音频轨道
   */
  getRemoteAudioTrack(userId: string): IRemoteAudioTrack | null {
    return this.remoteAudioTracks.get(userId) || null
  }

  /**
   * 检查音频是否静音
   */
  isMuted(): boolean {
    return !this.isAudioEnabled
  }

  /**
   * 检查摄像头是否开启
   */
  isCameraEnabled(): boolean {
    return this.isVideoEnabled
  }

  /**
   * 获取RTC客户端
   */
  getClient(): IAgoraRTCClient | null {
    return this.client
  }

  /**
   * 关闭本地轨道
   */
  private async closeLocalTracks(): Promise<void> {
    if (this.localAudioTrack) {
      const mediaStreamTrack = this.localAudioTrack.getMediaStreamTrack()
      if (mediaStreamTrack && mediaStreamTrack.readyState === 'live') {
        mediaStreamTrack.stop()
      }
      this.localAudioTrack.close()
      this.localAudioTrack = null
    }

    if (this.localVideoTrack) {
      const mediaStreamTrack = this.localVideoTrack.getMediaStreamTrack()
      if (mediaStreamTrack) {
        mediaStreamTrack.stop()
      }
      this.localVideoTrack.close()
      this.localVideoTrack = null
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach(track => track.stop())
      this.localVideoStream = null
    }

    this.rtcChannelStore.setLocalStream(null)
  }

  /**
   * 添加事件监听
   */
  private addEventListeners(): void {
    if (!this.client) return

    // 用户加入
    this.client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
      logger.info('User joined:', user.uid)
      this.onUserJoined?.(user.uid.toString())
    })

    // 用户离开
    this.client.on('user-left', (user: IAgoraRTCRemoteUser, reason: string) => {
      logger.info('User left:', user.uid, reason)
      
      // 清理远程轨道
      this.remoteVideoTracks.delete(user.uid.toString())
      this.remoteAudioTracks.delete(user.uid.toString())
      
      this.onUserLeft?.(user.uid.toString())
    })

    // 用户发布 - 自动订阅远程用户
    this.client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      logger.info('User published:', user.uid, mediaType)
      
      // 自动订阅远程用户
      try {
        await this.subscribeRemoteUser(user, mediaType)
        logger.info('自动订阅远程用户成功:', { uid: user.uid, mediaType })
      } catch (error) {
        logger.error('自动订阅远程用户失败:', error)
      }
      
      // 触发回调
      this.onUserPublished?.(user, mediaType)
    })

    // 用户取消发布
    this.client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      logger.info('User unpublished:', user.uid, mediaType)
      
      if (mediaType === 'video') {
        this.remoteVideoTracks.delete(user.uid.toString())
      } else if (mediaType === 'audio') {
        this.remoteAudioTracks.delete(user.uid.toString())
      }
      
      this.onUserUnpublished?.(user, mediaType)
    })

    // 网络质量
    this.client.on('network-quality', (quality: any) => {
      this.onNetworkQualityChange?.(quality)
    })

    // 音量指示器
    this.client.on('volume-indicator', (volumes: any[]) => {
      this.onVolumeIndicator?.(volumes)
    })
  }

  /**
   * 销毁RTC服务
   */
  async destroy(): Promise<void> {
    try {
      await this.leaveChannel()
      
      // 清理并停止所有远程轨道
      this.remoteVideoTracks.forEach((track, userId) => {
        try {
          track.stop()
          logger.debug('远程视频轨道已停止:', userId)
        } catch (error) {
          logger.warn('停止远程视频轨道失败:', error)
        }
      })
      this.remoteVideoTracks.clear()
      
      this.remoteAudioTracks.forEach((track, userId) => {
        try {
          track.stop()
          logger.debug('远程音频轨道已停止:', userId)
        } catch (error) {
          logger.warn('停止远程音频轨道失败:', error)
        }
      })
      this.remoteAudioTracks.clear()
      
      if (this.client) {
        this.client.removeAllListeners()
        this.client = null
      }
      
      // 重置状态标志
      this.isAudioEnabled = true
      this.isVideoEnabled = true
      this.agoraUid = 0
      this.currentCameraDeviceId = null
      
      logger.info('RtcService destroyed')
    } catch (error) {
      logger.error('Failed to destroy RtcService:', error)
    }
  }
}