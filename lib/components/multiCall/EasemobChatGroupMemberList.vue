<template>
  <div class="easemob-chat-member-list-modal" @click.self="$emit('close')">
    <div class="member-list-container">
      <div class="member-list-header">
        <h3>邀请成员</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="member-list-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner" />
          <span>加载中...</span>
        </div>
        <div v-else-if="members.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>暂无可选成员</span>
        </div>
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
            <div class="member-avatar-wrap">
              <img v-if="member.avatar" :src="member.avatar" class="member-avatar" />
              <div v-else class="member-avatar-fallback" :style="{ background: getAvatarGradient(member.userId) }">
                {{ getFirstChar(member.userName) }}
              </div>
            </div>
            <span class="name">{{ member.userName }}</span>
            <div class="status">
              <span v-if="existingUserIds.includes(member.userId)" class="status-text">已在通话中</span>
              <span v-else-if="invitingUserIds?.includes(member.userId)" class="status-text inviting">
                <span class="mini-spinner" />
                邀请中
              </span>
              <div v-else class="custom-checkbox" :class="{ checked: selectedUsers.includes(member.userId) }">
                <svg v-if="selectedUsers.includes(member.userId)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
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
          确定{{ selectedUsers.length > 0 ? ` (${selectedUsers.length})` : '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatClientStore } from '../../store/chatClient'
import { logger } from '../../utils/logger'

function getFirstChar(name: string) {
  return name?.charAt(0)?.toUpperCase() || '?'
}

function getAvatarGradient(userId: string) {
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  const h1 = Math.abs(hash % 360)
  const h2 = (h1 + 40) % 360
  return `linear-gradient(135deg, hsl(${h1}, 60%, 45%) 0%, hsl(${h2}, 60%, 35%) 100%)`
}

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
