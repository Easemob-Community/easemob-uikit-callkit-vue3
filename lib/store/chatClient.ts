import { defineStore } from "pinia";
import type { ChatClientState } from "./types";
import type { Chat } from "../core/sdk/imSDK";
export const useChatClientStore = defineStore("chatClient", {
  state: (): ChatClientState => ({
    client: null,
  }),
  actions: {
    setClient(client: Chat.Connection) {
      this.client = client;
    },
  },
  getters: {
    getChatClient: (state) => state.client,
  },
});
