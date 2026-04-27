<template>
  <div class="call-info-bar">
    <div class="call-status">
      <div class="status-dot"></div>
      <span class="call-duration">{{ duration }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CallInfoBarProps {
  duration: string
}

defineProps<CallInfoBarProps>()
</script>

<style scoped src="./styles/CallInfoBar.css"></style>
