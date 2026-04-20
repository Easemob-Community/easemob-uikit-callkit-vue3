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
      // 初始化callStateStore
      const callStateStore = useCallStateStore();
      this.client = client;
      callStateStore.initCallState(client);
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
