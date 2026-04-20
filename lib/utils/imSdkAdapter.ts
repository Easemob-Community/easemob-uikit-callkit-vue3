/**
 * IM SDK 兼容适配层
 *
 * 环信 IM SDK 存在 full 版与 miniCore 版（含插件模式）两种形态：
 * - full 版：API 直接挂在 Connection 实例上，如 client.fetchUserInfoById()
 * - miniCore 插件模式：API 挂在命名空间下，如 client.contact.fetchUserInfoById()
 *
 * 本模块通过"存在性探测"做兼容，不显式判断版本，优先尝试命名空间 API，
 * fallback 到实例 API，两者皆无时抛出明确错误。
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
  properties?: string[]
): Promise<any> {
  // 优先 miniCore 插件模式命名空间
  if (typeof client.contact?.fetchUserInfoById === "function") {
    logger.debug("[IMSdkAdapter] 使用 miniCore contact.fetchUserInfoById");
    return client.contact.fetchUserInfoById(userIds, properties);
  }
  // fallback full 版或 miniCore 未注册插件
  if (typeof client.fetchUserInfoById === "function") {
    logger.debug("[IMSdkAdapter] 使用实例 fetchUserInfoById");
    return client.fetchUserInfoById(userIds, properties);
  }
  throw new Error(
    "[IMSdkAdapter] 无法获取用户资料：当前 IM SDK 缺少 fetchUserInfoById API，" +
      "请确认 SDK 版本或手动传入 getUserInfo Provider"
  );
}

/**
 * 获取群成员列表
 * full: client.getGroupMembers(params)
 * miniCore(插件): client.group.getGroupMembers(params)
 */
export async function getGroupMembers(
  client: any,
  params: { groupId: string; pageSize: number; cursor?: string | null }
): Promise<any> {
  // 优先 miniCore 插件模式命名空间
  if (typeof client.group?.getGroupMembers === "function") {
    logger.debug("[IMSdkAdapter] 使用 miniCore group.getGroupMembers");
    return client.group.getGroupMembers(params);
  }
  // fallback full 版或 miniCore 未注册插件
  if (typeof client.getGroupMembers === "function") {
    logger.debug("[IMSdkAdapter] 使用实例 getGroupMembers");
    return client.getGroupMembers(params);
  }
  throw new Error(
    "[IMSdkAdapter] 无法获取群成员列表：当前 IM SDK 缺少 getGroupMembers API，" +
      "请确认 SDK 版本或手动传入 getGroupInfo Provider"
  );
}

/**
 * 获取好友列表（如需扩展）
 * full: client.getContacts(params)
 * miniCore(插件): client.contact.getContacts(params)
 */
export async function getContacts(client: any, params?: any): Promise<any> {
  if (typeof client.contact?.getContacts === "function") {
    return client.contact.getContacts(params);
  }
  if (typeof client.getContacts === "function") {
    return client.getContacts(params);
  }
  throw new Error(
    "[IMSdkAdapter] 无法获取好友列表：当前 IM SDK 缺少 getContacts API"
  );
}
