import { ChatSDK } from "../core/sdk/imSDK";
import type { Chat } from "../core/sdk/imSDK";
import type { SignalMessageInviteExt } from "../types/signal.types";

export class ChatService {
  private chatClient: Chat.Connection | null = null;
  constructor(chatClient: Chat.Connection) {
    this.chatClient = chatClient;
  }
  //构建邀请信息的ext
  buildInviteMessageExt() {
    const ext: SignalMessageInviteExt = {
      action: "invite",
    };
    return ext;
  }
  /**
   * 发送文本消息
   * @param targetId 接收方ID
   * @param message 消息内容
   * @param chatType 聊天类型
   */
  sendTextMessage(targetId: string, chatType: Chat.ChatType, message: string) {
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
      ext: {
        action: "invite",
        channelName: "YJIGz2MB",
        type: 0,
        callerDevId: "webim_web_1756119033109",
        callId: "tIxHcxhLFN",
        ts: 1758191074490,
        msgType: "rtcCallWithAgora",
        callerIMName: "pfh",
        calleeIMName: "ppp",
        chatType: 0,
        em_push_ext: {
          type: "call",
          custom: {
            action: "invite",
            channelName: "YJIGz2MB",
            type: 0,
            callerDevId: "webim_web_1756119033109",
            callId: "tIxHcxhLFN",
            ts: 1758191074490,
            msgType: "rtcCallWithAgora",
            callerIMName: "pfh",
            calleeIMName: "ppp",
            callerNickname: "国服第一前端",
            chatType: 0,
          },
        },
        em_apns_ext: {
          em_push_type: "voip",
        },
        ease_chat_uikit_user_info: {
          nickname: "国服第一前端",
          avatarURL: "",
        },
      },
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
