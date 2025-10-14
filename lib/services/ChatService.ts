import { ChatSDK } from "../core/sdk/imSDK";
import type { Chat } from "../core/sdk/imSDK";
import type {
  CancelCallSignalingExt,
  LeaveCallSignalingExt,
  InviteSignalingExt,
  SignalingExt,
  SignalingMessageOptions,
  CALLKIT_SIGNALING_CMD_ACTION,
} from "../types/signal.types";
import { useCallStateStore } from "../store/callState";
import {
  CALL_TYPE,
  type CALLKIT_CMD_MSG_ACTION_TYPE,
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
    const callState = this.callStateStore.getCallState;
    const ext: InviteSignalingExt = {
      action: "invite",
      callId: callState.callId || "",
      callerIMName: callState.callerUserId || "",
      calleeIMName: callState.calleeUserId || "暂未取到calleeUserId",
      callerDevId:
        this.chatClient?.context.jid.clientResource || "暂未取到callerDevId",
      channelName: callState.channel || "",
      chatType: callState.type || CALL_TYPE.AUDIO_1V1,
      type: callState.type || CALL_TYPE.AUDIO_1V1,
      ts: Date.now(),
      msgType: "rtcCallWithAgora",
      em_push_ext: {
        type: "call",
        custom: {
          action: "invite",
          channelName: callState.channel || "",
          type: callState.type || CALL_TYPE.AUDIO_1V1,
          callerDevId: this.chatClient?.context.jid.clientResource || "",
          callId: callState.callId || "",
          ts: Date.now(),
          msgType: "rtcCallWithAgora",
          callerIMName: callState.callerUserId || "",
          calleeIMName: callState.calleeUserId || "暂未取到calleeUserId",
          callerNickname: callState.callerNickname || "",
          chatType: callState.type || CALL_TYPE.AUDIO_1V1,
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
          calleeDevId:
            this.chatClient?.context.jid.clientResource ||
            "未成功获取当前用户calleeDevId",
          callerDevId: ext?.callerDevId || callState.callerDevId || "",
          callId: ext?.callId || callState.callId || "",
        };
      }
      case "confirmRing": {
        return {
          action: "confirmRing",
          ts: Date.now(),
          msgType: "rtcCallWithAgora",
          calleeDevId: ext?.calleeDevId || "暂未取到有效calleeDevId",
          callerDevId: this.chatClient?.context.jid.clientResource || "",
          callId: ext?.callId || "",
          status: (ext as { status?: boolean })?.status || false,
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
   * @param ext 信令消息扩展字段
   * @param isDirectToOnlineUser 是否直投在线用户
   * @param result 通话结果
   */
  sendSignalMessage(
    targetId: string,
    action: CALLKIT_CMD_MSG_ACTION_TYPE,
    chatType: SignalingMessageOptions["chatType"],
    ext?: Partial<SignalingExt>,
    //是否直投在线用户
    isDirectToOnlineUser?: boolean,
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
      deliverOnlineOnly: isDirectToOnlineUser || false,
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
