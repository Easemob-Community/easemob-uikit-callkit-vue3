<template>
  <div class="easemob-chat-member-list-modal">
    <div class="member-list-container">
      <div class="member-list-header">
        <h3>邀请成员</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="member-list-content">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="members.length === 0" class="empty">暂无可选成员</div>
        <div v-else class="list">
          <div 
            v-for="member in members" 
            :key="member.userId" 
            class="member-item"
            :class="{ 
              selected: selectedUsers.includes(member.userId), 
              disabled: existingUserIds.includes(member.userId),
              inviting: invitingUserIds?.includes(member.userId)
            }"
            @click="toggleSelect(member.userId)"
          >
            <img :src="member.avatar || defaultAvatar" class="avatar" />
            <span class="name">{{ member.userName }}</span>
            <div class="checkbox">
              <span v-if="existingUserIds.includes(member.userId)">已在通话中</span>
              <span v-else-if="invitingUserIds?.includes(member.userId)" class="inviting-status">
                <span class="mini-spinner"></span>
                邀请中
              </span>
              <input 
                v-else
                type="checkbox" 
                :checked="selectedUsers.includes(member.userId)" 
                readonly
              />
            </div>
          </div>
        </div>
      </div>
      <div class="member-list-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button 
          class="invite-btn" 
          :disabled="selectedUsers.length === 0"
          @click="handleInvite"
        >
          确定 ({{ selectedUsers.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatClientStore } from '../../store/chatClient'
import { logger } from '../../utils/logger'

interface Member {
  userId: string
  userName: string
  avatar?: string
}

const props = defineProps<{
  groupId: string
  existingUserIds: string[] // 已经在通话中的用户ID
  invitingUserIds?: string[] // 邀请中的用户ID
}>()

const emit = defineEmits<{
  close: []
  invite: [userIds: string[]]
}>()

const chatClientStore = useChatClientStore()
const members = ref<Member[]>([])
const selectedUsers = ref<string[]>([])
const loading = ref(false)
const defaultAvatar = '/lib/callkit-static-assets/images/default_avatar.png'

const fetchGroupMembers = async () => {
  const client = chatClientStore.getChatClient
  if (!client || !props.groupId) {
    logger.warn('EasemobChatGroupMemberList: 无法获取群成员，client或groupId未提供', {
      hasClient: !!client,
      groupId: props.groupId
    })
    return
  }

  loading.value = true
  try {
    // 环信 SDK 获取群成员列表
    // @ts-ignore
    const response = await client.listGroupMembers({
      groupId: props.groupId,
      pageNum: 1,
      pageSize: 100
    })
    
    const currentUserId = client.user
    // @ts-ignore
    members.value = (response.data || [])
      .filter((m: any) => (m.member || m.owner) !== currentUserId)
      .map((m: any) => ({
        userId: m.member || m.owner,
        userName: m.member || m.owner, // 实际应用中可能需要获取用户昵称
      }))
  } catch (error) {
    logger.error('EasemobChatGroupMemberList: 获取群成员失败', error)
  } finally {
    loading.value = false
  }
}

const toggleSelect = (userId: string) => {
  // 已在通话中的用户不能选择
  if (props.existingUserIds.includes(userId)) return
  // 邀请中的用户可以重新选择（重新邀请）
  
  const index = selectedUsers.value.indexOf(userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(userId)
  }
}

const handleInvite = () => {
  emit('invite', [...selectedUsers.value])
  emit('close')
}

onMounted(() => {
  fetchGroupMembers()
})
</script>

<style scoped>
.easemob-chat-member-list-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.member-list-container {
  width: 400px;
  max-height: 80vh;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.member-list-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-list-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.member-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 200px;
}

.member-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.member-item:hover:not(.disabled) {
  background: #f5f5f5;
}

.member-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.member-item.inviting {
  cursor: pointer;
  opacity: 0.8;
  background: rgba(0, 145, 255, 0.05);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eee;
}

.name {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.checkbox {
  color: #999;
  font-size: 12px;
}

.inviting-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0091ff;
}

.mini-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 145, 255, 0.3);
  border-top-color: #0091ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.member-list-footer {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
}

.invite-btn {
  padding: 8px 20px;
  background: #0091ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.invite-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading, .empty {
  text-align: center;
  padding: 40px 0;
  color: #999;
}
</style>
