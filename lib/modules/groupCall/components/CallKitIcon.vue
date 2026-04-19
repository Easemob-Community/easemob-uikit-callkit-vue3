<template>
  <span class="callkit-icon" :style="spanStyle" v-html="svgContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { iconRegistry } from './iconRegistry'

interface Props {
  name: string
  width?: number | string
  height?: number | string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 24,
  height: 24,
  color: 'currentColor',
})

const svgContent = computed(() => {
  const raw = iconRegistry[props.name]
  if (!raw) {
    console.warn(`[CallKitIcon] unknown icon: ${props.name}`)
    return ''
  }
  // 替换 svg 标签上的 width/height，确保响应式
  return raw
    .replace(/width="\d+"/, `width="${props.width}"`)
    .replace(/height="\d+"/, `height="${props.height}"`)
})

const spanStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  color: props.color,
}))
</script>

<style scoped>
.callkit-icon {
  line-height: 0;
}
.callkit-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
