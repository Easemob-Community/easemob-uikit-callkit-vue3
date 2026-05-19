import { defineStore } from "pinia";
import type { ChatClientState } from "./types";
import type { Chat } from "../core/sdk/imSDK";
//调用callStateStore
import { useCallStateStore } from "./callState";
export const useChatClientStore = defineStore("chatClient", {
  state: (): ChatClientState => ({
    client: null,
    isMiniCore: false,
  }),
  actions: {
    setClient(client: Chat.Connection) {
      this.client = client;
      this.tryInitCallState(client);
    },
    tryInitCallState(client: Chat.Connection, retryCount = 0) {
      const callStateStore = useCallStateStore();
      const userId = client.user || (client as any).context?.userId;
      if (userId) {
        callStateStore.initCallState(client);
      } else if (retryCount < 10) {
        // userId 尚未就绪（如 EMClient 还在异步登录中），延迟重试
        setTimeout(() => this.tryInitCallState(client, retryCount + 1), 200);
      }
    },
    setIsMiniCore(value: boolean) {
      this.isMiniCore = value;
    },
  },
  getters: {
    getChatClient: (state) => state.client,
    getClientDeviceId: (state) => state.client?.context.jid.clientResource,
    getIsMiniCore: (state) => state.isMiniCore,
  },
});
