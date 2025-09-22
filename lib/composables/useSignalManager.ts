import type { Chat } from "../core/sdk/imSDK";
import { ChatSDK } from "../core/sdk/imSDK";
import { SignalManager } from "../core/signal/SignalManager";

export interface UseSignalManagerReturn {
  signalManager: SignalManager;
  sendInviteMessage: (targetId: string, payload: any) => Promise<void>;
  sendAnswerMessage: (targetId: string, payload: any) => Promise<void>;
  sendCancelMessage: (targetId: string, payload: any) => Promise<void>;
}

/**
 * 信令管理器 - 基础架构
 * 仅负责信令发送，监听功能由 useListenerManager 处理
 */
export function useSignalManager(
  client: Chat.Connection
): UseSignalManagerReturn {
  const signalManager = new SignalManager(client);

  return {
    signalManager,
    // 占位实现
    sendInviteMessage: async () => {},
    sendAnswerMessage: async () => {},
    sendCancelMessage: async () => {},
  };
}
