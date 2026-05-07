import type { UseCallKitReturn, CallParams, GroupCallParams } from "../types";
import { useCallKitCore } from "./useCallKitCore";
import { logger } from "../utils/logger";
import { resolveUserProfiles } from "../services/UserProfileService";

/**
 * useCallKit —— 统一的通话控制入口
 *
 * 内部完全委托给 CallKitCore（@easemob/callkit-core）。
 * 此 wrapper 仅保留极少量的 Vue3 特有增值逻辑（如用户资料 enrich）。
 */
export function useCallKit(): UseCallKitReturn {
  logger.warn('🟡 [useCallKit] Vue3 适配层已加载 → 将委托给 CallKitCore');
  const core = useCallKitCore();

  // ─── 发起单聊 ───
  const call = async (params: CallParams) => {
    await core.call(params);

    // 批量获取被叫方资料（先查缓存 → 未命中调 Provider → 回写缓存）
    try {
      await resolveUserProfiles([params.targetId]);
      logger.info("call: 已 enrich 被叫方资料");
    } catch (err) {
      logger.warn("call: 获取被叫方资料失败，回退到 userId", err);
    }
  };

  // ─── 发起群聊 ───
  const groupCall = core.groupCall;

  // ─── 结束 ───
  const hangup = core.hangup;
  const cancel = core.cancel;

  // ─── 应答 ───
  const accept = core.accept;
  const reject = core.reject;
  const rejectBusy = core.rejectBusy;

  return {
    call,
    groupCall,
    hangup,
    cancel,
    accept,
    reject,
    rejectBusy,
  };
}
