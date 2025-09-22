import { type Chat, ChatSDK } from "../sdk/imSDK";
/**
 * 信令管理器 - SignalManager
 *
 * 单一职责：只负责信令的收发和分发
 *
 * 设计原则：
 * - 单一职责：只做信令的收发和分发
 * - 最小化接口：只暴露必要的方法
 * - 不可变状态：避免复杂的状态管理
 */

export class SignalManager {
  private chatClient: Chat.Connection | null = null;
  constructor(chatClient: Chat.Connection) {
    this.chatClient = chatClient || null;
  }
  //监听文本类型消息监听（邀请信息）
  addTextMessageListener(
    MESSAGE_EVENT_NAME: string,
    callback: (msg: Chat.TextMsgBody) => void
  ) {
    if (!this.chatClient) {
      return;
    }
    this.chatClient.addEventHandler(
      MESSAGE_EVENT_NAME || "TEXT_MESSAGE_RECEIVED",
      {
        onTextMessage(msg) {
          console.log(">>>>>>invite msg", msg);
          callback(msg);
        },
      }
    );
  }
  //监听命令类型消息监听（信令交互信息）
  addCommandMessageListener(
    MESSAGE_EVENT_NAME: string,
    callback: (msg: Chat.CmdMsgBody) => void
  ) {
    if (!this.chatClient) {
      return;
    }
    this.chatClient.addEventHandler(
      MESSAGE_EVENT_NAME || "COMMAND_MESSAGE_RECEIVED",
      {
        onCmdMessage(msg) {
          console.log(">>>>>>command msg", msg);
          callback(msg);
        },
      }
    );
  }
  //发送文本类型消息
  sendTextMessage(
    to: string,
    msg: string,
    chatType: Chat.ChatType,
    ext?: Record<string, string>,
    callback?: (msg: Chat.SendMsgResult) => void
  ) {
    if (!this.chatClient) {
      return;
    }
    const options: Chat.CreateTextMsgParameters = {
      type: "txt",
      chatType,
      to,
      msg,
      ext,
    };
    const textMsg = ChatSDK.message.create(options);
    this.chatClient
      .send(textMsg)
      .then((res) => {
        console.log(">>>>>>send text msg success", res);
        callback?.(res);
      })
      .catch((err) => {
        console.log(">>>>>>send text msg error", err);
        callback?.(err);
      });
  }
  //发送命令类型消息
  sendCommandMessage(
    to: string,
    action: string,
    chatType: Chat.ChatType,
    ext: Record<string, string>,
    callback?: (msg: Chat.SendMsgResult) => void
  ) {
    if (!this.chatClient) {
      return;
    }
    const options: Chat.CreateCmdMsgParameters = {
      type: "cmd",
      chatType,
      to,
      action,
      ext,
    };
    const cmdMsg = ChatSDK.message.create(options);
    this.chatClient
      .send(cmdMsg)
      .then((res) => {
        console.log(">>>>>>send command msg success", res);
        callback?.(res);
      })
      .catch((err) => {
        console.log(">>>>>>send command msg error", err);
        callback?.(err);
      });
  }
}
