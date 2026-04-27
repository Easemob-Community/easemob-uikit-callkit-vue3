import { useChatClientStore } from "../../store/chatClient";
import { CALL_TYPE } from "../../types/callstate.types";
import type { CallUserRole } from "./types";

/**
 * 获取当前登录用户的 userId
 */
export function getCurrentUserId(): string {
  const chatClientStore = useChatClientStore();
  return (
    chatClientStore.getChatClient?.context?.userId ||
    chatClientStore.getChatClient?.user ||
    ""
  );
}

/**
 * 计算 conversationId
 * - 群聊：groupId
 * - 单聊：对方用户ID（直接对应 IM 会话 key）
 */
export function getConversationId(params: {
  callerUserId: string;
  calleeUserId?: string;
  groupId?: string;
}): string {
  if (params.groupId) return params.groupId;
  const currentUserId = getCurrentUserId();
  return params.callerUserId === currentUserId
    ? params.calleeUserId || ""
    : params.callerUserId;
}

/**
 * 计算当前用户的角色
 */
export function getLocalUserRole(params: {
  callerUserId: string;
  groupId?: string;
}): CallUserRole {
  if (params.groupId) return "participant";
  const currentUserId = getCurrentUserId();
  return params.callerUserId === currentUserId ? "caller" : "callee";
}

/**
 * 判断是否为群聊类型
 */
export function isGroupCallType(type: CALL_TYPE): boolean {
  return type === CALL_TYPE.VIDEO_MULTI || type === CALL_TYPE.AUDIO_MULTI;
}

/**
 * 判断消息是否已过期
 * @param messageTime 消息发送时间戳（毫秒或秒）
 * @param thresholdMs 过期阈值（毫秒），默认 60 秒
 * @returns true 表示消息已过期
 */
export function isMessageExpired(
  messageTime: number,
  thresholdMs: number = 60000
): boolean {
  const now = Date.now();

  // 兼容秒级时间戳：小于 10000000000（约 2001年）视为秒，转换为毫秒
  const messageTimeMs =
    messageTime < 10000000000 ? messageTime * 1000 : messageTime;

  // 消息时间在未来（设备时间被调慢），不判断为过期
  if (messageTimeMs > now + 60000) {
    return false;
  }
  return now - messageTimeMs > thresholdMs;
}

/**
 * 构建基础事件公共字段
 *
 * @param context 通话上下文信息
 * @param isLocal 是否由本端行为触发
 * @returns 包含 conversationId、isLocal、localUserRole 的基础字段对象
 */
export function buildBaseEventFields(
  context: {
    callId: string;
    channel: string;
    type: CALL_TYPE;
    callerUserId: string;
    calleeUserId?: string;
    groupId?: string;
  },
  isLocal: boolean
) {
  const groupId = context.groupId;
  const isGroup = groupId || isGroupCallType(context.type);
  const conversationId = isGroup
    ? groupId || ""
    : context.callerUserId === getCurrentUserId()
      ? context.calleeUserId || ""
      : context.callerUserId;

  const localUserRole: CallUserRole = isGroup
    ? "participant"
    : context.callerUserId === getCurrentUserId()
      ? "caller"
      : "callee";

  return {
    callId: context.callId,
    channel: context.channel,
    type: context.type,
    callerUserId: context.callerUserId,
    calleeUserId: context.calleeUserId,
    groupId,
    conversationId,
    isLocal,
    localUserRole,
  };
}
