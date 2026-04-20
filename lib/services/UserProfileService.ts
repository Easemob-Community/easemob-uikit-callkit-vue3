import { logger } from '../utils/logger'

export interface UserProfile {
  userId: string
  nickname?: string
  avatarUrl?: string
}

export interface GroupProfile {
  groupId: string
  groupName?: string
  groupAvatar?: string
}

export type UserInfoProvider = (userIds: string[]) => Promise<UserProfile[]>
export type GroupInfoProvider = (groupIds: string[]) => Promise<GroupProfile[]>

let _userInfoProvider: UserInfoProvider | undefined
let _groupInfoProvider: GroupInfoProvider | undefined

/**
 * 注册用户信息查询 Provider
 * 由 EasemobChatCallKitProvider.vue 在初始化时调用
 */
export function registerUserInfoProvider(provider: UserInfoProvider | undefined) {
  _userInfoProvider = provider
}

export function getUserInfoProvider(): UserInfoProvider | undefined {
  return _userInfoProvider
}

/**
 * 注册群组信息查询 Provider
 */
export function registerGroupInfoProvider(provider: GroupInfoProvider | undefined) {
  _groupInfoProvider = provider
}

export function getGroupInfoProvider(): GroupInfoProvider | undefined {
  return _groupInfoProvider
}

/**
 * 通过 Provider 批量解析用户信息
 * @returns 解析后的用户信息，失败时返回 userId 兜底
 */
export async function resolveUserProfiles(userIds: string[]): Promise<UserProfile[]> {
  if (!userIds.length) return []
  if (!_userInfoProvider) {
    return userIds.map(id => ({ userId: id }))
  }
  try {
    const profiles = await _userInfoProvider(userIds)
    const profileMap = new Map(profiles.map(p => [p.userId, p]))
    return userIds.map(id => profileMap.get(id) || { userId: id })
  } catch (error) {
    logger.warn('[UserProfileService] 获取用户信息失败', error)
    return userIds.map(id => ({ userId: id }))
  }
}

/**
 * 通过 Provider 批量解析群组信息
 * @returns 解析后的群组信息，失败时返回 groupId 兜底
 */
export async function resolveGroupProfiles(groupIds: string[]): Promise<GroupProfile[]> {
  if (!groupIds.length) return []
  if (!_groupInfoProvider) {
    return groupIds.map(id => ({ groupId: id }))
  }
  try {
    const profiles = await _groupInfoProvider(groupIds)
    const profileMap = new Map(profiles.map(p => [p.groupId, p]))
    return groupIds.map(id => profileMap.get(id) || { groupId: id })
  } catch (error) {
    logger.warn('[UserProfileService] 获取群组信息失败', error)
    return groupIds.map(id => ({ groupId: id }))
  }
}

/**
 * 清理已注册的 Provider（Provider 卸载时调用）
 */
export function clearProfileProviders() {
  _userInfoProvider = undefined
  _groupInfoProvider = undefined
}
