/**
 * 用户状态管理 - UserState
 * 
 * 职责：
 * 1. 管理当前用户的基本信息和状态
 * 2. 提供响应式的用户信息供组件使用
 * 3. 管理用户权限和角色
 * 4. 处理用户状态同步
 * 
 * 状态数据：
 * - 基本信息：用户ID、昵称、头像等
 * - 在线状态：在线、离线、忙碌等
 * - 权限信息：通话权限、群组权限等
 * - 设备信息：摄像头、麦克风状态
 * 
 * 使用方式：
 * ```typescript
 * const userState = useUserState()
 * 
 * // 获取用户信息
 * const { userId, nickname, avatar } = userState.currentUser
 * 
 * // 监听用户状态变化
 * watch(() => userState.onlineStatus, (newStatus) => {
 *   console.log('用户状态变化', newStatus)
 * })
 * 
 * // 更新用户信息
 * userState.updateUserInfo({ nickname: '新昵称' })
 * ```
 */

export interface UserState {
  // TODO: 定义用户状态接口
}