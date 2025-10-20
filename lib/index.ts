import { type App } from "vue";
import EasemobChatCallKitProvider from "./components/EasemobChatCallKitProvider.vue";
import EasemobChatSingleCall from "./components/singleCall/EasemobChatSingleCall.vue";
import EasemobChatMultiCall from "./components/EasemobChatMultiCall.vue";
import { pinia, installPinia } from "./store";
import { useCallStateStore } from "./store/callState";
import { useRtcChannelStore } from "./store/rtcChannel";
import { useCallKit } from "./composables/useCallKit";
// 导出组件
export {
  EasemobChatCallKitProvider,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
};

// 导出store
export { pinia, useCallStateStore, useRtcChannelStore };
// 导出部分hook
export { useCallKit };

// 导出类型
export type {
  EasemobChatCallKitOptions,
  EasemobChatCallKitInstance,
  ProviderConfig,
  UseCallKitReturn,
} from "./types";

export default {
  install(app: App) {
    // 先安装Pinia
    installPinia(app);

    // 再注册组件
    app.component("EasemobChatCallKitProvider", EasemobChatCallKitProvider);
    app.component("EasemobChatSingleCall", EasemobChatSingleCall);
    app.component("EasemobChatMultiCall", EasemobChatMultiCall);
  },
};
