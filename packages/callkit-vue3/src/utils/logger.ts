import { CallKitLogDB, type LogCategory } from './loggerDb'

// 日志级别枚举
export const LogLevel = {
  ERROR: 0, // 错误日志
  WARN: 1, // 警告日志
  INFO: 2, // 信息日志
  DEBUG: 3, // 调试日志
  VERBOSE: 4, // 详细日志
} as const

export type LogLevel = typeof LogLevel[keyof typeof LogLevel]

// ANSI颜色代码
export const ANSI_COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  GRAY: '\x1b[90m',
}

// 日志级别名称映射
export const LogLevelNames = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.VERBOSE]: 'VERBOSE',
}

// 日志级别对应的颜色
export const LogLevelColors = {
  [LogLevel.ERROR]: ANSI_COLORS.RED,
  [LogLevel.WARN]: ANSI_COLORS.YELLOW,
  [LogLevel.INFO]: ANSI_COLORS.GREEN,
  [LogLevel.DEBUG]: ANSI_COLORS.BLUE,
  [LogLevel.VERBOSE]: ANSI_COLORS.GRAY,
}

// 日志管理配置
export interface LoggerConfig {
  level: LogLevel // 控制台日志级别
  enableConsole: boolean // 是否启用控制台输出
  enablePrefix: boolean // 是否启用日志前缀
  prefix?: string // 自定义前缀
  debug?: boolean // 是否启用调试模式
  enableIDB?: boolean // 是否启用 IndexedDB 持久化
  idbLevel?: LogLevel // IDB 日志级别（默认 VERBOSE，独立于控制台级别）
  idbRetentionDays?: number // IDB 日志保留天数，默认 7
  idbMaxSizeMB?: number // IDB 日志容量上限（MB），默认 20
}

// 日志管理类
export class Logger {
  private static instance: Logger
  private config: LoggerConfig
  private db: CallKitLogDB | null = null
  private sessionId: string | undefined

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.ERROR, // 默认只输出错误日志到控制台
      enableConsole: true,
      enablePrefix: true,
      prefix: '[Vue3 CallKit]',
      enableIDB: false,
      idbLevel: LogLevel.VERBOSE, // IDB 默认记录所有级别
      idbRetentionDays: 7,
      idbMaxSizeMB: 20,
      ...config,
    }

    // 根据debug配置设置控制台日志级别
    if (this.config.debug !== undefined) {
      this.setDebug(this.config.debug)
    }

    // 初始化 IDB
    if (this.config.enableIDB) {
      this.initDB()
    }
  }

  // 获取单例实例
  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config)
    } else if (config) {
      // 更新现有实例的配置
      Logger.instance.updateConfig(config)
    }
    return Logger.instance
  }

  // 更新配置
  public updateConfig(config: Partial<LoggerConfig>): void {
    const prevEnableIDB = this.config.enableIDB
    this.config = { ...this.config, ...config }

    // 如果配置中包含debug字段，则更新控制台日志级别
    if (config.debug !== undefined) {
      this.setDebug(config.debug)
    }

    // IDB 开关变化时重新初始化
    if (config.enableIDB !== undefined && config.enableIDB !== prevEnableIDB) {
      if (config.enableIDB) {
        this.initDB()
      } else {
        this.db = null
      }
    }
  }

  // 根据debug模式设置控制台日志级别
  public setDebug(debug: boolean): void {
    this.config.debug = debug
    this.config.level = debug ? LogLevel.VERBOSE : LogLevel.ERROR
  }

  // 获取当前配置
  public getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // 设置控制台日志级别
  public setLevel(level: LogLevel): void {
    this.config.level = level
  }

  // 启用/禁用控制台输出
  public setConsoleEnabled(enabled: boolean): void {
    this.config.enableConsole = enabled
  }

  // 启用/禁用前缀
  public setPrefixEnabled(enabled: boolean): void {
    this.config.enablePrefix = enabled
  }

  // 设置自定义前缀
  public setPrefix(prefix: string): void {
    this.config.prefix = prefix
  }

  // 启用/禁用 IDB
  public setIDBEnabled(enabled: boolean): void {
    this.updateConfig({ enableIDB: enabled })
  }

  // 设置 IDB 日志级别（独立于控制台）
  public setIDBLevel(level: LogLevel): void {
    this.config.idbLevel = level
  }

  // 设置当前会话 ID（用于关联日志，建议传入 callId）
  public setSessionId(id: string | undefined): void {
    this.sessionId = id
  }

  // 获取当前会话 ID
  public getSessionId(): string | undefined {
    return this.sessionId
  }

  // 检查是否应该输出到控制台（受 level 控制）
  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level
  }

  // 检查是否应该写入 IDB（受 idbLevel 控制，独立于控制台）
  private shouldWriteToIDB(level: LogLevel): boolean {
    return !!(this.config.enableIDB && level <= (this.config.idbLevel ?? LogLevel.VERBOSE))
  }

  // 格式化日志消息
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const levelName = LogLevelNames[level]
    const levelColor = LogLevelColors[level]

    let formattedMessage = ''

    if (this.config.enablePrefix) {
      formattedMessage += `${this.config.prefix} `
    }

    // 添加带颜色的日志级别名称
    formattedMessage += `[${timestamp}] ${levelColor}[${levelName}]${ANSI_COLORS.RESET} ${message}`

    return formattedMessage
  }

  // 初始化 IDB
  private initDB(): void {
    if (this.db) return
    try {
      this.db = new CallKitLogDB()
      // 异步清理旧日志，不阻塞
      this.db.clearBefore(this.config.idbRetentionDays ?? 7).catch(() => {})
    } catch {
      this.db = null
    }
  }

  // 提取 meta：如果第一个 args 是 plain object，则作为 meta；否则整体打包
  private extractMeta(args: any[]): Record<string, any> | undefined {
    if (args.length === 0) return undefined
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !(args[0] instanceof Error)) {
      return args[0]
    }
    return { args }
  }

  // 写入 IDB（异步，不阻塞；独立于控制台 level）
  private writeToIDB(
    level: LogLevel,
    category: LogCategory,
    tag: string,
    message: string,
    meta?: Record<string, any>
  ): void {
    if (!this.db || !this.shouldWriteToIDB(level)) return
    this.db
      .write(
        {
          timestamp: Date.now(),
          level,
          category,
          tag,
          message,
          sessionId: this.sessionId,
          meta,
        },
        this.config.idbMaxSizeMB
      )
      .catch(() => {})
  }

  // 错误日志
  public error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage(LogLevel.ERROR, message)
      if (this.config.enableConsole) {
        console.error(formattedMessage, ...args)
      }
    }
    this.writeToIDB(LogLevel.ERROR, 'error', '[ERROR]', message, this.extractMeta(args))
  }

  // 警告日志
  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage(LogLevel.WARN, message)
      if (this.config.enableConsole) {
        console.warn(formattedMessage, ...args)
      }
    }
    this.writeToIDB(LogLevel.WARN, 'general', '[WARN]', message, this.extractMeta(args))
  }

  // 信息日志
  public info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message)
      if (this.config.enableConsole) {
        console.info(formattedMessage, ...args)
      }
    }
    this.writeToIDB(LogLevel.INFO, 'general', '[INFO]', message, this.extractMeta(args))
  }

  // 调试日志
  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage(LogLevel.DEBUG, message)
      if (this.config.enableConsole) {
        console.log(formattedMessage, ...args)
      }
    }
    this.writeToIDB(LogLevel.DEBUG, 'general', '[DEBUG]', message, this.extractMeta(args))
  }

  // 详细日志
  public verbose(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      const formattedMessage = this.formatMessage(LogLevel.VERBOSE, message)
      if (this.config.enableConsole) {
        console.log(formattedMessage, ...args)
      }
    }
    this.writeToIDB(LogLevel.VERBOSE, 'general', '[VERBOSE]', message, this.extractMeta(args))
  }

  // 兼容性方法：直接输出到控制台（不受级别控制）
  public log(message: string, ...args: any[]): void {
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message)
      console.log(formattedMessage, ...args)
    }
    this.writeToIDB(LogLevel.INFO, 'general', '[LOG]', message, this.extractMeta(args))
  }

  // 兼容性方法：直接输出到控制台（不受级别控制）
  public console(message: string, ...args: any[]): void {
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message)
      console.log(formattedMessage, ...args)
    }
    this.writeToIDB(LogLevel.INFO, 'general', '[CONSOLE]', message, this.extractMeta(args))
  }

  // 获取当前日志级别名称
  public getCurrentLevelName(): string {
    return LogLevelNames[this.config.level]
  }

  // 检查是否启用了指定级别的控制台日志
  public isLevelEnabled(level: LogLevel): boolean {
    return this.shouldLog(level)
  }

  // ────────────────────────────────────────────────
  // 结构化日志方法（用于通话还原）
  // ────────────────────────────────────────────────

  /**
   * 信令日志
   * @param direction 'send' | 'recv'
   * @param action 信令 action
   * @param meta 结构化数据（from/to/callId/result 等）
   */
  public signal(direction: 'send' | 'recv', action: string, meta?: Record<string, any>): void {
    const msg = `[SIG:${direction}] ${action}`
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage(LogLevel.INFO, msg), meta)
    }
    this.writeToIDB(LogLevel.INFO, 'signal', `[SIG:${direction}]`, action, meta)
  }

  /**
   * 状态变更日志
   * @param from 原状态
   * @param to 新状态
   * @param meta 触发上下文
   */
  public stateChange(from: any, to: any, meta?: Record<string, any>): void {
    const msg = `[STATE] ${from} -> ${to}`
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage(LogLevel.INFO, msg), meta)
    }
    this.writeToIDB(LogLevel.INFO, 'state', '[STATE]', `${from} -> ${to}`, meta)
  }

  /**
   * RTC 事件日志
   * @param event 事件名
   * @param meta 结构化数据
   */
  public rtc(event: string, meta?: Record<string, any>): void {
    const msg = `[RTC] ${event}`
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage(LogLevel.INFO, msg), meta)
    }
    this.writeToIDB(LogLevel.INFO, 'rtc', '[RTC]', event, meta)
  }

  /**
   * 业务事件日志
   * @param event 事件名
   * @param meta 结构化数据
   */
  public event(event: string, meta?: Record<string, any>): void {
    const msg = `[EVENT] ${event}`
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage(LogLevel.INFO, msg), meta)
    }
    this.writeToIDB(LogLevel.INFO, 'event', '[EVENT]', event, meta)
  }

  // ────────────────────────────────────────────────
  // 导出/查询 API
  // ────────────────────────────────────────────────

  /** 按 sessionId 导出日志（不传则导出全部） */
  public exportLogsBySession(sessionId?: string): Promise<import('./loggerDb').CallKitLogEntry[]> {
    if (!this.db) return Promise.resolve([])
    return sessionId ? this.db.exportBySession(sessionId) : this.db.exportAll()
  }

  /** 按时间范围导出日志 */
  public exportLogsByTimeRange(start: number, end: number): Promise<import('./loggerDb').CallKitLogEntry[]> {
    if (!this.db) return Promise.resolve([])
    return this.db.exportByTimeRange(start, end)
  }

  /** 获取最近有日志的 sessionId 列表 */
  public getSessions(): Promise<string[]> {
    return this.db?.getSessions() ?? Promise.resolve([])
  }

  /** 清理日志（默认按配置中的保留天数） */
  public clearLogs(days?: number): Promise<number> {
    if (!this.db) return Promise.resolve(0)
    return this.db.clearBefore(days ?? this.config.idbRetentionDays ?? 7)
  }

  /** 导出为 JSON 字符串（便于下载/上报） */
  public async exportLogsAsJSON(sessionId?: string): Promise<string> {
    const logs = await this.exportLogsBySession(sessionId)
    return JSON.stringify(
      {
        exportTime: new Date().toISOString(),
        sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        logs,
      },
      null,
      2
    )
  }

  /** 导出为纯文本字符串（便于直接阅读） */
  public async exportLogsAsText(sessionId?: string): Promise<string> {
    const logs = await this.exportLogsBySession(sessionId)
    const lines: string[] = []
    lines.push(`# CallKit Log Export`)
    lines.push(`# Time: ${this.formatReadableTime(Date.now())}`)
    lines.push(`# Session: ${sessionId || 'ALL'}`)
    lines.push(`# UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`)
    lines.push(`# Total: ${logs.length} entries`)
    lines.push('')

    for (const log of logs) {
      const time = this.formatReadableTime(log.timestamp)
      const level = LogLevelNames[log.level] ?? 'UNKNOWN'
      const tag = log.tag || ''
      const msg = log.message || ''
      let line = `[${time}] [${level}] ${tag} ${msg}`
      if (log.sessionId) {
        line += ` | session=${log.sessionId}`
      }
      if (log.meta && Object.keys(log.meta).length > 0) {
        const metaStr = Object.entries(log.meta)
          .map(([k, v]) => {
            if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`
            return `${k}=${v}`
          })
          .join(', ')
        line += ` | ${metaStr}`
      }
      lines.push(line)
    }

    return lines.join('\n')
  }

  /** 格式化为易读的本地时间 */
  private formatReadableTime(timestamp: number): string {
    const d = new Date(timestamp)
    const yyyy = d.getFullYear()
    const MM = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const HH = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}.${ms}`
  }
}

// 导出默认实例
export const logger = Logger.getInstance()

// 便捷方法
export const logError = (message: string, ...args: any[]) => logger.error(message, ...args)
export const logWarn = (message: string, ...args: any[]) => logger.warn(message, ...args)
export const logInfo = (message: string, ...args: any[]) => logger.info(message, ...args)
export const logDebug = (message: string, ...args: any[]) => logger.debug(message, ...args)
export const logVerbose = (message: string, ...args: any[]) => logger.verbose(message, ...args)
export const log = (message: string, ...args: any[]) => logger.log(message, ...args)
