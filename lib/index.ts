import { type App } from "vue";
import EasemobChatCallKitProvider from "./components/EasemobChatCallKitProvider.vue";
import EasemobChatSingleCall from "./components/singleCall/EasemobChatSingleCall.vue";
import EasemobChatMultiCall from "./components/EasemobChatMultiCall.vue";
import InvitationNotification from "./components/InvitationNotification.vue";
import { pinia, installPinia } from "./store";
import { useCallStateStore } from "./store/callState";
import { useRtcChannelStore } from "./store/rtcChannel";
import { useCallKit } from "./composables/useCallKit";
import { useEndCall } from "./composables/useEndCall";
import { useAnswerCall } from "./composables/useAnswerCall";
// 导出组件
export {
  EasemobChatCallKitProvider,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
  InvitationNotification,
};

// 导出store
export { pinia, useCallStateStore, useRtcChannelStore };
// 导出部分hook
export { useCallKit, useEndCall, useAnswerCall };

// 导出类型
export type {
  EasemobChatCallKitOptions,
  EasemobChatCallKitInstance,
  ProviderConfig,
  UseCallKitReturn,
  UseEndCallReturn,
  UseAnswerCallReturn,
} from "./types";

export default {
  install(app: App) {
    // 先安装Pinia
    installPinia(app);

    // 再注册组件
    app.component("EasemobChatCallKitProvider", EasemobChatCallKitProvider);
    app.component("EasemobChatSingleCall", EasemobChatSingleCall);
    app.component("EasemobChatMultiCall", EasemobChatMultiCall);
    app.component("InvitationNotification", InvitationNotification);
  },
};
