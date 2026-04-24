/**
 * RingtoneService
 * 铃声播放服务（当前为桩函数占位）
 *
 * TODO: 接入实际音频资源后实现真正的铃声播放
 * 当前行为：仅在控制台打印 debug 日志，不实际播放任何声音
 */
export class RingtoneService {
  private static instance: RingtoneService
  private enabled = false

  static getInstance(): RingtoneService {
    if (!RingtoneService.instance) {
      RingtoneService.instance = new RingtoneService()
    }
    return RingtoneService.instance
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /** 播放来电铃声 */
  async playIncomingRingtone(): Promise<void> {
    if (!this.enabled) return
    // TODO: 接入实际音频文件
    console.debug('[RingtoneService] 播放来电铃声（桩函数）')
  }

  /** 播放去电铃声 */
  async playOutgoingRingtone(): Promise<void> {
    if (!this.enabled) return
    // TODO: 接入实际音频文件
    console.debug('[RingtoneService] 播放去电铃声（桩函数）')
  }

  /** 停止铃声 */
  stopRingtone(): void {
    // TODO: 接入实际音频停止逻辑
    console.debug('[RingtoneService] 停止铃声（桩函数）')
  }
}
