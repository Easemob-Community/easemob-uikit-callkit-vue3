<template>
  <div class="gcall-grid" :style="gridStyle">
    <div
      v-for="p in participants"
      :key="p.userId"
      class="gcall-grid-cell"
    >
      <ParticipantTile :participant="p" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ParticipantTile from './ParticipantTile.vue'
import type { Participant } from '../types'

interface Props {
  participants: Participant[]
}

const props = defineProps<Props>()

const gridStyle = computed(() => {
  const count = props.participants.length
  if (count <= 1) {
    return {
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
    }
  }
  if (count === 2) {
    return {
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr',
    }
  }
  if (count <= 4) {
    return {
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
    }
  }
  if (count <= 6) {
    return {
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr',
    }
  }
  if (count <= 9) {
    return {
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
    }
  }
  // 最多 16 人
  return {
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr 1fr',
  }
})
</script>

<style scoped>
.gcall-grid {
  flex: 1;
  display: grid;
  gap: 8px;
  padding: 8px;
  overflow: auto;
}

.gcall-grid-cell {
  min-width: 0;
  min-height: 0;
}
</style>
