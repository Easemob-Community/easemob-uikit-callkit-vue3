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
import { ICONS } from '../../config/assets'
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
const defaultAvatar = ICONS.DEFAULT_AVATAR

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

<style scoped src="./styles/EasemobChatGroupMemberList.css"></style>
