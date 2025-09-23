import { ChatSDK } from "../core/sdk/imSDK";
import type { Chat } from "../core/sdk/imSDK";
import type { SignalMessageInviteExt } from "../types/signal.types";
import { useCallStateStore } from "../store/callState";
export class ChatService {
  private chatClient: Chat.Connection | null = null;
  private callStateStore = useCallStateStore();
  constructor(chatClient: Chat.Connection) {
    this.chatClient = chatClient;
  }
  //构建邀请信息的ext
  private buildInviteMessageExt() {
    const ext: SignalMessageInviteExt = {
      action: "invite",
      callId: this.callStateStore.callId,
      callerIMName: this.callStateStore.callerUserId,
      calleeIMName: this.callStateStore.calleeUserId || "暂未取到calleeUserId",
      callerDevId: this.callStateStore.callerDevId,
      channelName: this.callStateStore.channel,
      chatType: this.callStateStore.type,
      type: this.callStateStore.type,
      ts: Date.now(),
      msgType: "rtcCallWithAgora",
      em_push_ext: {
        type: "call",
        custom: {
          action: "invite",
          channelName: this.callStateStore.channel,
          type: this.callStateStore.type,
          callerDevId: this.callStateStore.callerDevId,
          callId: this.callStateStore.callId,
          ts: Date.now(),
          msgType: "rtcCallWithAgora",
          callerIMName: this.callStateStore.callerUserId,
          calleeIMName:
            this.callStateStore.calleeUserId || "暂未取到calleeUserId",
          callerNickname: this.callStateStore.callerNickname || "",
          chatType: this.callStateStore.type,
        },
      },
      em_apns_ext: {
        em_push_type: "voip",
      },
    };
    return ext;
  }
  /**
   * 发送文本消息
   * @param targetId 接收方ID
   * @param message 消息内容
   * @param chatType 聊天类型
   */
  sendTextMessage(
    targetId: string,
    chatType: Chat.ChatType,
    message: string
  ): Promise<Chat.SendMsgResult> {
    if (!this.chatClient) {
      throw new Error("ChatClient未初始化");
    }
    interface ITextInviteMessage extends Chat.CreateTextMsgParameters {
      ext: SignalMessageInviteExt;
    }
    const options: ITextInviteMessage = {
      type: "txt",
      to: targetId,
      msg: message,
      chatType,
      ext: this.buildInviteMessageExt(),
    };
    const msg = ChatSDK.message.create(options);
    return new Promise((resolve, reject) => {
      this.chatClient
        ?.send(msg)
        .then((msg) => {
          resolve(msg);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
