/**
 * IM SDK 兼容适配层
 *
 * 通过外层传入的 isMiniCore 标志显式切换调用方式：
 * - isMiniCore = false (默认): 使用 full 版 API，直接挂在 Connection 实例上
 * - isMiniCore = true: 使用 miniCore 插件模式 API，挂在命名空间下
 */

import { logger } from "./logger";

/**
 * 获取用户资料（昵称、头像等）
 * full: client.fetchUserInfoById(userIds, properties)
 * miniCore(插件): client.contact.fetchUserInfoById(userIds, properties)
 */
export async function fetchUserInfoById(
  client: any,
  userIds: string[],
  properties?: string[],
  isMiniCore?: boolean
): Promise<any> {
  if (isMiniCore) {
    if (typeof client.contact?.fetchUserInfoById === "function") {
      logger.debug("[IMSdkAdapter] miniCore: contact.fetchUserInfoById");
      return client.contact.fetchUserInfoById(userIds, properties);
    }
    throw new Error(
      "[IMSdkAdapter] miniCore 模式下无法获取用户资料：client.contact.fetchUserInfoById 不存在，" +
        "请确认 miniCore 已正确注册用户资料插件"
    );
  }
  if (typeof client.fetchUserInfoById === "function") {
    logger.debug("[IMSdkAdapter] full: fetchUserInfoById");
    return client.fetchUserInfoById(userIds, properties);
  }
  throw new Error(
    "[IMSdkAdapter] full 模式下无法获取用户资料：client.fetchUserInfoById 不存在，" +
      "请确认 easemob-websdk 已正确安装"
  );
}

/**
 * 获取群成员列表
 * full: client.getGroupMembers(params)
 * miniCore(插件): client.group.getGroupMembers(params)
 */
export async function getGroupMembers(
  client: any,
  params: { groupId: string; pageSize: number; cursor?: string | null },
  isMiniCore?: boolean
): Promise<any> {
  if (isMiniCore) {
    if (typeof client.group?.getGroupMembers === "function") {
      logger.debug("[IMSdkAdapter] miniCore: group.getGroupMembers");
      return client.group.getGroupMembers(params);
    }
    throw new Error(
      "[IMSdkAdapter] miniCore 模式下无法获取群成员列表：client.group.getGroupMembers 不存在，" +
        "请确认 miniCore 已正确注册群组插件"
    );
  }
  if (typeof client.getGroupMembers === "function") {
    logger.debug("[IMSdkAdapter] full: getGroupMembers");
    return client.getGroupMembers(params);
  }
  throw new Error(
    "[IMSdkAdapter] full 模式下无法获取群成员列表：client.getGroupMembers 不存在，" +
      "请确认 easemob-websdk 已正确安装"
  );
}

/**
 * 获取好友列表（如需扩展）
 * full: client.getContacts(params)
 * miniCore(插件): client.contact.getContacts(params)
 */
export async function getContacts(
  client: any,
  params?: any,
  isMiniCore?: boolean
): Promise<any> {
  if (isMiniCore) {
    if (typeof client.contact?.getContacts === "function") {
      return client.contact.getContacts(params);
    }
    throw new Error(
      "[IMSdkAdapter] miniCore 模式下无法获取好友列表：client.contact.getContacts 不存在"
    );
  }
  if (typeof client.getContacts === "function") {
    return client.getContacts(params);
  }
  throw new Error(
    "[IMSdkAdapter] full 模式下无法获取好友列表：client.getContacts 不存在"
  );
}
