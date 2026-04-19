import { callKitEventBus } from "../core/events/CallKitEventBus";
import type {
  CallKitEventType,
  CallKitEventPayloads,
  CallKitEventHandler,
} from "../core/events/types";

/**
 * useCallKitEvents
 * 优雅的 CallKit 事件订阅 Composable
 *
 * 使用示例：
 * ```ts
 * const { onCallEnded, onCallStarted, onIncomingCall } = useCallKitEvents()
 *
 * onCallStarted((e) => {
 *   console.log('通话开始', e.callId, e.channel)
 * })
 *
 * onCallEnded((e) => {
 *   console.log('通话结束', e.reason, '时长:', e.duration, 'ms')
 *   // 可在此发送系统消息通知
 * })
 *
 * onIncomingCall((e) => {
 *   console.log('收到来电', e.callerUserId)
 * })
 * ```
 *
 * 所有订阅都返回解绑函数，推荐在 onUnmounted 中调用：
 * ```ts
 * const unbind = onCallEnded(handler)
 * onUnmounted(() => unbind())
 * ```
 */
export function useCallKitEvents() {
  /**
   * 通用事件订阅
   */
  const on = <T extends CallKitEventType>(
    event: T,
    handler: CallKitEventHandler<T>
  ): (() => void) => {
    return callKitEventBus.on(event, handler);
  };

  /**
   * 通用一次性订阅
   */
  const once = <T extends CallKitEventType>(
    event: T,
    handler: CallKitEventHandler<T>
  ): (() => void) => {
    return callKitEventBus.once(event, handler);
  };

  /**
   * 通用取消订阅
   */
  const off = <T extends CallKitEventType>(
    event: T,
    handler: CallKitEventHandler<T>
  ): void => {
    callKitEventBus.off(event, handler);
  };

  // ─── 语义化便捷方法 ───

  /** 通话状态变化 */
  const onStatusChanged = (
    handler: CallKitEventHandler<"statusChanged">
  ): (() => void) => on("statusChanged", handler);

  /** 收到来电邀请 */
  const onIncomingCall = (
    handler: CallKitEventHandler<"incomingCall">
  ): (() => void) => on("incomingCall", handler);

  /** 通话开始（双方/多方接通） */
  const onCallStarted = (
    handler: CallKitEventHandler<"callStarted">
  ): (() => void) => on("callStarted", handler);

  /** 通话结束 */
  const onCallEnded = (
    handler: CallKitEventHandler<"callEnded">
  ): (() => void) => on("callEnded", handler);

  /** 通话被取消 */
  const onCallCanceled = (
    handler: CallKitEventHandler<"callCanceled">
  ): (() => void) => on("callCanceled", handler);

  /** 通话被拒绝 */
  const onCallRefused = (
    handler: CallKitEventHandler<"callRefused">
  ): (() => void) => on("callRefused", handler);

  /** 通话邀请超时 */
  const onCallTimeout = (
    handler: CallKitEventHandler<"callTimeout">
  ): (() => void) => on("callTimeout", handler);

  /** 对方忙线 */
  const onCallBusy = (
    handler: CallKitEventHandler<"callBusy">
  ): (() => void) => on("callBusy", handler);

  /** 群通话成员加入 */
  const onParticipantJoined = (
    handler: CallKitEventHandler<"participantJoined">
  ): (() => void) => on("participantJoined", handler);

  /** 群通话成员离开 */
  const onParticipantLeft = (
    handler: CallKitEventHandler<"participantLeft">
  ): (() => void) => on("participantLeft", handler);

  return {
    // 通用 API
    on,
    once,
    off,
    // 语义化便捷方法
    onStatusChanged,
    onIncomingCall,
    onCallStarted,
    onCallEnded,
    onCallCanceled,
    onCallRefused,
    onCallTimeout,
    onCallBusy,
    onParticipantJoined,
    onParticipantLeft,
  };
}

/**
 * useCallKitEvents 返回类型
 */
export type UseCallKitEventsReturn = ReturnType<typeof useCallKitEvents>;
