/**
 * @easemob/callkit-vue3
 *
 * Vue3 响应式封装层，将 @easemob/callkit-core 的事件驱动模型
 * 映射为 Vue3 ref/reactive 响应式状态。
 */

// ─── Composables ───
export { useCallKitCore } from './composables/useCallKitCore'
export type { ReactiveCallState, CallEventLog } from './composables/useCallKitCore'

// ─── Re-export core types for convenience ───
export {
  CallKitCore,
  CALL_STATUS,
  CALL_TYPE,
  HANGUP_REASON,
  MessageBuilder,
  SignalSender,
  isUIEvent,
  isRtcEvent,
} from '@easemob/callkit-core'

export type {
  CallKitCoreConfig,
  CallKitEvent,
  UIEvent,
  RtcEvent,
  InviteCallParams,
  AnswerCallParams,
  HangupParams,
  InviteGroupCallParams,
  RtcReport,
  SingleCallState,
  DomainEvent,
  EasemobConnection,
  RtcAdapter,
  JoinRtcParams,
} from '@easemob/callkit-core'
