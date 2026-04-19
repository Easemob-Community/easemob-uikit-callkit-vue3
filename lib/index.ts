import { type App } from "vue";
import "./style.css";
import EasemobChatCallKitProvider from "./components/EasemobChatCallKitProvider.vue";
import EasemobChatSingleCall from "./components/singleCall/EasemobChatSingleCall.vue";
import EasemobChatMultiCall from "./components/multiCall/EasemobChatMultiCall.vue";
import InvitationNotification from "./components/InvitationNotification.vue";
import EasemobChatMiniWindow from "./components/EasemobChatMiniWindow.vue";
import { GroupCallShell } from "./modules/groupCall";
import { useCallStateStore } from "./store/callState";
import { useRtcChannelStore } from "./store/rtcChannel";
import { useSingleCallRtcStore } from "./store/singleCallRtc";
import { useCallTimerStore } from "./store/callTimer";
import { useGlobalCallStore } from "./store/globalCall";
import { useCallKit } from "./composables/useCallKit";
import { useEndCall } from "./composables/useEndCall";
import { useAnswerCall } from "./composables/useAnswerCall";
import { useRtcService } from "./composables/useRtcService";
import { useJoinChannel } from "./composables/useJoinChannel";
import { useParticipants } from "./composables/useParticipants";
import { useDraggable, useCenteredDraggable, useCornerDraggable } from "./composables/useDraggable";
import { RtcService } from "./services/RtcService";
// 导出组件
export {
  EasemobChatCallKitProvider,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
  InvitationNotification,
  EasemobChatMiniWindow,
  GroupCallShell,
};

// 导出store
export { useCallStateStore, useRtcChannelStore, useGlobalCallStore, useSingleCallRtcStore, useCallTimerStore };
// 导出部分hook
export { useCallKit, useEndCall, useAnswerCall, useRtcService, useJoinChannel, useParticipants };
// 导出拖拽hook
export { useDraggable, useCenteredDraggable, useCornerDraggable };
// 导出RTC服务
export { RtcService };

// 导出类型
export type {
  EasemobChatCallKitOptions,
  EasemobChatCallKitInstance,
  ProviderConfig,
  UseCallKitReturn,
  UseEndCallReturn,
  UseAnswerCallReturn,
} from "./types";

export type { Participant } from "./composables/useParticipants";

// 导出常量与类型
export { HANGUP_REASON, CALL_STATUS, CALL_TYPE } from "./types/callstate.types";

// 导出静态资源配置
export { DEFAULT_BACKGROUND_IMAGE, ICONS, getAssetUrl } from "./config/assets";

export default {
  install(app: App) {
    // 注册组件
    app.component("EasemobChatCallKitProvider", EasemobChatCallKitProvider);
    app.component("EasemobChatSingleCall", EasemobChatSingleCall);
    app.component("EasemobChatMultiCall", EasemobChatMultiCall);
    app.component("InvitationNotification", InvitationNotification);
    app.component("EasemobChatMiniWindow", EasemobChatMiniWindow);
    app.component("GroupCallShell", GroupCallShell);
  },
};
