import { defineStore } from "pinia";
import type { ChatClientState } from "./types";
import type { Chat } from "../core/sdk/imSDK";
export const useChatClientStore = defineStore("chatClient", {
  state: (): ChatClientState => ({
    client: null,
    isMiniCore: false,
  }),
  actions: {
    setClient(client: Chat.Connection) {
      this.client = client;
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
