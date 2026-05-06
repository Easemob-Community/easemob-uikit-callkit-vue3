/**
 * IM 抽象接口
 *
 * 核心库通过此接口与环信 IM SDK 交互，不直接 import easemob-websdk。
 * 由于环信 Web/小程序/UniApp API 一致，此接口可直接映射到环信 SDK。
 */

export interface IMMessage {
  from?: string
  to?: string
  id?: string
  type: 'txt' | 'cmd'
  body?: any
  ext?: Record<string, any>
  [key: string]: any
}

export interface IMProvider {
  /** 发送消息 */
  sendMessage(msg: IMMessage): Promise<any>

  /** 获取当前登录用户 ID */
  getCurrentUserId(): string

  /** 获取当前设备 ID */
  getCurrentDeviceId(): string

  /** 获取 RTC Token 和 AppId（环信 SDK 特有方法） */
  getRtcToken(channel: string): Promise<{ token: string; appId: string }>

  /** UID → UserId 映射查询（环信 SDK 特有方法） */
  getUserIdByRtcUids(uids: (string | number)[]): Promise<Record<string, string>>

  /** 挂载消息监听 */
  onTextMessage(handler: (msg: IMMessage) => void): () => void

  /** 挂载 CMD 消息监听 */
  onCmdMessage(handler: (msg: IMMessage) => void): () => void
}
