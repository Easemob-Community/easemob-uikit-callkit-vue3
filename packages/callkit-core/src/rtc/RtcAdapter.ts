/**
 * RTC 抽象接口
 *
 * 核心库不直接调用任何 RTC SDK，只通过此接口定义期望的 RTC 能力。
 * 上层（Vue3/UniApp/React）自行实现此接口，接入对应的 RTC SDK。
 */

export interface JoinRtcParams {
  channel: string
  token: string
  uid: string | number
  appId?: string
}

export interface RtcAdapter {
  /**
   * 加入 RTC 频道
   */
  joinChannel(params: JoinRtcParams): Promise<void>

  /**
   * 离开 RTC 频道
   */
  leaveChannel(): Promise<void>

  /**
   * 创建并发布本地轨道
   * @param types 要发布的轨道类型
   */
  publishLocalTracks(types: ('audio' | 'video')[]): Promise<void>

  /**
   * 取消发布本地轨道
   */
  unpublishLocalTracks(types: ('audio' | 'video')[]): Promise<void>

  /**
   * 订阅远程用户
   */
  subscribeRemoteUser(userId: string, mediaType: 'audio' | 'video'): Promise<void>

  /**
   * 取消订阅远程用户
   */
  unsubscribeRemoteUser(userId: string, mediaType: 'audio' | 'video'): Promise<void>

  /**
   * 静音/取消静音
   */
  setAudioEnabled(enabled: boolean): Promise<void>

  /**
   * 开启/关闭摄像头
   */
  setVideoEnabled(enabled: boolean): Promise<void>

  /**
   * 切换摄像头设备
   */
  switchCamera?(deviceId: string): Promise<void>

  /**
   * 切换麦克风设备
   */
  switchMicrophone?(deviceId: string): Promise<void>
}
