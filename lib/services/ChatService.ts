import { ChatSDK } from "../core/sdk/imSDK";
import type { Chat } from "../core/sdk/imSDK";
import {
  type CancelCallSignalingExt,
  type LeaveCallSignalingExt,
  type InviteSignalingExt,
  type SignalingExt,
  type SignalingMessageOptions,
  CALLKIT_SIGNALING_CMD_ACTION,
} from "../types/signal.types";
import { useCallStateStore } from "../store/callState";
import {
  CALLKIT_CMD_MSG_ACTION_TYPE,
  CALLKIT_CMD_MSG_RESULT_TYPE,
} from "../types/callstate.types";
export class ChatService {
  private chatClient: Chat.Connection | null = null;
  private callStateStore = useCallStateStore();
  constructor(chatClient: Chat.Connection) {
    this.chatClient = chatClient;
  }
  //构建邀请信息的ext
  private buildInviteMessageExt() {
    const ext: InviteSignalingExt = {
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
  //构建信令消息扩展字段
  private buildSignalingMessageExt(
    action: CALLKIT_CMD_MSG_ACTION_TYPE,
    ext?: Exclude<SignalingExt, CancelCallSignalingExt | LeaveCallSignalingExt>,
    /** 通话结果 */
    result?: CALLKIT_CMD_MSG_RESULT_TYPE
  ): SignalingExt {
    //传入的ext优先级高于store中的callState
    const callState = this.callStateStore.getCallState;
    switch (action) {
      case "alert": {
        return {
          action: "alert",
          ts: Date.now(),
          msgType: "rtcCallWithAgora",
          calleeDevId: ext?.calleeDevId || callState.calleeDevId || "",
          callerDevId: ext?.callerDevId || callState.callerDevId || "",
          callId: ext?.callId || callState.callId || "",
        };
      }
      case "answerCall": {
        console.warn(">>>>>answerCall", callState);
        return {
          action: "answerCall",
          ts: Date.now(),
          msgType: "rtcCallWithAgora",
          calleeDevId: this.chatClient?.context.jid.clientResource || "",
          callerDevId: ext?.callerDevId || "",
          callId: ext?.callId || "",
          result: result || CALLKIT_CMD_MSG_RESULT_TYPE.BUSY,
        };
      }
      default:
        throw new Error(`未知的信令消息动作: ${action}`);
    }
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
      ext: InviteSignalingExt;
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
  /**
   * 发送信令消息
   * @param targetId 接收方ID
   * @param action 消息动作
   * @param chatType 聊天类型
   */
  sendSignalMessage(
    targetId: string,
    action: CALLKIT_CMD_MSG_ACTION_TYPE,
    chatType: SignalingMessageOptions["chatType"],
    ext?: Partial<SignalingExt>,
    /** 通话结果 */
    result?: CALLKIT_CMD_MSG_RESULT_TYPE
  ): Promise<Chat.SendMsgResult> {
    if (!this.chatClient) {
      throw new Error("ChatClient未初始化");
    }
    interface ISignalMessage extends SignalingMessageOptions {
      action: CALLKIT_SIGNALING_CMD_ACTION;
      ext: SignalingExt;
    }
    const options: ISignalMessage = {
      type: "cmd",
      to: targetId,
      chatType,
      action: "rtcCall",
      ext: {
        ...this.buildSignalingMessageExt(
          action,
          ext as Exclude<
            SignalingExt,
            CancelCallSignalingExt | LeaveCallSignalingExt
          >,
          result
        ),
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
