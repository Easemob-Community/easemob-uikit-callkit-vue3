import { useChatClientStore } from "../store/chatClient";

export interface ListenerManagerReturn {
  mountTextMessageListener: () => void;
  mountSignalListener: () => void;
}

/**
 * 监听器管理器 - 基础架构
 * 负责全局监听，通过Pinia store管理状态
 */
export function useListenerManager(): ListenerManagerReturn {
  // 获取Pinia store实例
  const chatClientStore = useChatClientStore();
  //注册文本消息监听
  const mountTextMessageListener = () => {
    const client = chatClientStore.getChatClient;
    if (!client) {
      return;
    }
    client.addEventHandler("onTextMessage", {
      onTextMessage: (message) => {
        console.log("收到文本消息:", message);
      },
    });
  };
  //注册信令监听
  const mountSignalListener = () => {
    const client = chatClientStore.getChatClient;
    if (!client) {
      return;
    }
    client.addEventHandler("onSignalMessage", {
      onCmdMessage(message) {
        console.log("收到信令消息:", message);
      },
    });
  };
  return {
    mountTextMessageListener,
    mountSignalListener,
  };
}
