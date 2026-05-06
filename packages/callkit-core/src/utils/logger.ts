/**
 * 轻量级日志接口
 * 核心库不依赖外部日志库（如 dexie），通过接口允许上层注入自定义 logger。
 */

export interface Logger {
  error(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
  verbose(message: string, ...args: any[]): void
  signal?(direction: 'send' | 'recv', action: string, meta?: Record<string, any>): void
  stateChange?(from: any, to: any, meta?: Record<string, any>): void
  rtc?(event: string, meta?: Record<string, any>): void
  event?(event: string, meta?: Record<string, any>): void
}

const defaultLogger: Logger = {
  error: (msg, ...args) => console.error(`[CallKitCore] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[CallKitCore] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[CallKitCore] ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[CallKitCore] ${msg}`, ...args),
  verbose: () => {}, // 默认关闭 verbose
}

let globalLogger: Logger = defaultLogger

export function setLogger(logger: Logger): void {
  globalLogger = logger
}

export function getLogger(): Logger {
  return globalLogger
}
