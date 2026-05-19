/**
 * CallKit工具函数
 */

/**
 * 生成随机channel字符串
 * @param length 字符串长度，默认8位
 * @returns 随机字符串
 */
export const generateRandomChannel = (length: number = 8): string => {
  const CHARS =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
};

/**
 * 检查消息是否已过期
 * 与 lib/composables/useListenerManager.ts 中的 isMessageExpired 对齐
 * @param messageTime 消息时间戳（毫秒）
 * @param toleranceMs 容忍时间（毫秒），默认 40000（30s invite超时 + 10s 容差）
 * @returns 是否已过期
 */
export const isMessageExpired = (messageTime: number, toleranceMs: number = 40000): boolean => {
  if (!messageTime || messageTime <= 0) return false;
  return Date.now() - messageTime > toleranceMs;
};

/**
 * CMD 消息过期检查（与 lib 对齐，默认 60s）
 * @param messageTime 消息时间戳（毫秒）
 * @returns 是否已过期
 */
export const isCmdMessageExpired = (messageTime: number): boolean => {
  return isMessageExpired(messageTime, 60000);
};
/**
 * 格式化通话时间
 * @param seconds 秒数
 * @returns 格式化的时间字符串 (HH:MM:SS 或 MM:SS)
 */
export const formatCallDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};
