import Dexie, { type Table } from 'dexie'
import type { LogLevel } from './logger'

export type LogCategory = 'signal' | 'state' | 'rtc' | 'event' | 'error' | 'general'

/**
 * CallKit 单条日志结构
 * 设计目标：支持按通话(callId)维度还原完整信令时序与状态流转
 */
export interface CallKitLogEntry {
  id?: number
  timestamp: number
  level: LogLevel
  category: LogCategory
  tag: string
  message: string
  sessionId?: string
  meta?: Record<string, any>
}

/**
 * 估算单条日志平均字节数（用于将 MB 限制转换为条目数限制）
 * 实际测试：一条带 meta 的 JSON 日志约 300~600 bytes，取 400B 作为均值
 */
const AVG_BYTES_PER_ENTRY = 400

/**
 * CallKitLogDB
 * 基于 Dexie 的 IndexedDB 封装
 * 职责：结构化存储日志，支持按会话/时间范围导出，自带容量上限控制
 */
export class CallKitLogDB extends Dexie {
  logs!: Table<CallKitLogEntry, number>

  constructor() {
    super('CallKitLogDB')
    this.version(1).stores({
      logs: '++id, timestamp, sessionId, category, [sessionId+timestamp]',
    })
  }

  async write(entry: Omit<CallKitLogEntry, 'id'>, maxSizeMB = 20): Promise<void> {
    try {
      await this.logs.add(entry as CallKitLogEntry)
      // 写入后异步触发容量检查，不阻塞业务
      this.enforceSizeLimit(maxSizeMB).catch(() => {})
    } catch {
      // IDB 写入失败静默处理，不阻断业务
    }
  }

  /** 按容量上限清理最旧的日志 */
  async enforceSizeLimit(maxSizeMB: number): Promise<void> {
    if (maxSizeMB <= 0) return
    const maxEntries = Math.floor((maxSizeMB * 1024 * 1024) / AVG_BYTES_PER_ENTRY)
    const count = await this.logs.count()
    if (count > maxEntries) {
      const toDelete = count - maxEntries
      const oldestIds = await this.logs.orderBy('timestamp').limit(toDelete).primaryKeys()
      await this.logs.bulkDelete(oldestIds)
    }
  }

  /** 按 sessionId 导出（正序，最近 2000 条） */
  async exportBySession(sessionId: string, limit = 2000): Promise<CallKitLogEntry[]> {
    return this.logs.where('sessionId').equals(sessionId).limit(limit).sortBy('timestamp')
  }

  /** 按时间范围导出（正序） */
  async exportByTimeRange(start: number, end: number, limit = 5000): Promise<CallKitLogEntry[]> {
    return this.logs.where('timestamp').between(start, end).limit(limit).sortBy('timestamp')
  }

  /** 导出全部（倒序，最近 5000 条） */
  async exportAll(limit = 5000): Promise<CallKitLogEntry[]> {
    return this.logs.orderBy('timestamp').reverse().limit(limit).toArray()
  }

  /** 清理 N 天前的日志 */
  async clearBefore(days = 7): Promise<number> {
    const deadline = Date.now() - days * 86400000
    return this.logs.where('timestamp').below(deadline).delete()
  }

  /** 按 sessionId 清理 */
  async clearBySession(sessionId: string): Promise<number> {
    return this.logs.where('sessionId').equals(sessionId).delete()
  }

  /** 获取最近有日志的 sessionId 列表（去重） */
  async getSessions(limit = 50): Promise<string[]> {
    const items = await this.logs
      .where('sessionId')
      .notEqual('')
      .reverse()
      .limit(limit * 10)
      .toArray()
    const set = new Set<string>()
    items.forEach((i) => i.sessionId && set.add(i.sessionId))
    return Array.from(set).slice(0, limit)
  }
}
