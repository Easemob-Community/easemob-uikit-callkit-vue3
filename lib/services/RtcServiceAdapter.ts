/**
 * RtcServiceAdapter
 * 将现有 RtcService 适配为 callkit-core 的 RtcAdapter 接口。
 *
 * 用途：
 * 1. 供 CallKitCore 直接注入使用（替代事件驱动的 RTC 控制）
 * 2. 为上层提供框架无关的 RTC 操作入口
 */

import type { RtcAdapter, JoinRtcParams } from '@easemob/callkit-core'
import type { RtcService } from './RtcService'
import { logger } from '../utils/logger'

export class RtcServiceAdapter implements RtcAdapter {
  private rtcService: RtcService

  constructor(rtcService: RtcService) {
    this.rtcService = rtcService
  }

  async joinChannel(params: JoinRtcParams): Promise<void> {
    await this.rtcService.joinChannel(
      params.channel,
      params.token,
      params.uid,
      params.appId
    )
  }

  async leaveChannel(): Promise<void> {
    await this.rtcService.leaveChannel()
  }

  async publishLocalTracks(types: ('audio' | 'video')[]): Promise<void> {
    const tracks: any[] = []
    for (const type of types) {
      if (type === 'audio') {
        tracks.push(await this.rtcService.createAudioTrack())
      } else if (type === 'video') {
        tracks.push(await this.rtcService.createVideoTrack())
      }
    }
    if (tracks.length > 0) {
      await this.rtcService.publishTracks(tracks)
    }
  }

  async unpublishLocalTracks(types: ('audio' | 'video')[]): Promise<void> {
    const tracks: any[] = []
    for (const type of types) {
      if (type === 'audio') {
        const track = this.rtcService.getLocalAudioTrack?.()
        if (track) tracks.push(track)
      } else if (type === 'video') {
        const track = this.rtcService.getLocalVideoTrack()
        if (track) tracks.push(track)
      }
    }
    if (tracks.length > 0) {
      await this.rtcService.unpublishTracks(tracks)
    }
  }

  async subscribeRemoteUser(userId: string, mediaType: 'audio' | 'video'): Promise<void> {
    await this.rtcService.subscribeRemoteUser(userId, mediaType)
  }

  async unsubscribeRemoteUser(userId: string, mediaType: 'audio' | 'video'): Promise<void> {
    await this.rtcService.unsubscribeRemoteUser(userId, mediaType)
  }

  async setAudioEnabled(enabled: boolean): Promise<void> {
    await this.rtcService.toggleAudio(enabled)
  }

  async setVideoEnabled(enabled: boolean): Promise<void> {
    await this.rtcService.toggleVideo(enabled)
  }

  async switchCamera(deviceId: string): Promise<void> {
    const ok = await this.rtcService.switchCamera(deviceId)
    if (!ok) {
      logger.warn('[RtcServiceAdapter] switchCamera 失败')
    }
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    const ok = await this.rtcService.switchMicrophone(deviceId)
    if (!ok) {
      logger.warn('[RtcServiceAdapter] switchMicrophone 失败')
    }
  }
}
