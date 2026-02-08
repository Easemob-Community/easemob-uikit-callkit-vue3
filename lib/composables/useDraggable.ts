import { ref, computed, onMounted, onUnmounted, type Ref, type CSSProperties } from 'vue'

export interface DraggableOptions {
  /** 初始 X 坐标 */
  initialX?: number
  /** 初始 Y 坐标 */
  initialY?: number
  /** 是否初始居中（优先级高于 initialX/initialY） */
  centered?: boolean
  /** 元素宽度（用于居中和边界计算） */
  width?: number
  /** 元素高度（用于居中和边界计算） */
  height?: number
  /** 是否启用边界限制 */
  boundary?: boolean
  /** 边界内边距（像素） */
  boundaryPadding?: number
  /** 拖拽开始时回调 */
  onDragStart?: () => void
  /** 拖拽结束时回调 */
  onDragEnd?: () => void
}

export interface DraggableReturn {
  /** 元素引用 */
  elementRef: Ref<HTMLElement | null>
  /** 是否正在拖拽 */
  isDragging: Ref<boolean>
  /** 是否发生过拖拽 */
  hasDragged: Ref<boolean>
  /** 当前位置（左上角坐标） */
  position: Ref<{ x: number; y: number }>
  /** 样式对象（用于绑定到元素） */
  style: Ref<CSSProperties>
  /** 开始拖拽事件处理 */
  startDrag: (e: MouseEvent | TouchEvent) => void
  /** 停止拖拽 */
  stopDrag: () => void
}

/**
 * 拖拽组合式函数
 * @param options - 拖拽配置选项
 * @returns 拖拽相关状态和操作方法
 * 
 * @example
 * ```vue
 * <template>
 *   <div 
 *     ref="elementRef"
 *     :style="style"
 *     @mousedown="startDrag"
 *   >
 *     可拖拽内容
 *   </div>
 * </template>
 * 
 * <script setup>
 * import { useDraggable } from './useDraggable'
 * 
 * // 居中显示
 * const { elementRef, style, startDrag } = useDraggable({
 *   centered: true,
 *   width: 360,
 *   height: 640,
 *   boundary: true
 * })
 * 
 * // 固定位置
 * const { elementRef, style, startDrag } = useDraggable({
 *   initialX: 100,
 *   initialY: 100,
 *   boundary: true
 * })
 * </script>
 * ```
 */
export function useDraggable(options: DraggableOptions = {}): DraggableReturn {
  const {
    initialX = 0,
    initialY = 0,
    centered = false,
    width = 0,
    height = 0,
    boundary = false,
    boundaryPadding = 0,
    onDragStart,
    onDragEnd
  } = options

  const elementRef = ref<HTMLElement | null>(null)
  const isDragging = ref(false)
  const hasDragged = ref(false)
  const position = ref({ x: initialX, y: initialY })
  const dragOffset = ref({ x: 0, y: 0 })
  const isInitialized = ref(false)

  // 计算居中位置
  const getCenterPosition = () => {
    if (!width || !height) return { x: initialX, y: initialY }
    return {
      x: (window.innerWidth - width) / 2,
      y: (window.innerHeight - height) / 2
    }
  }

  // 限制在边界内
  const clampPosition = (x: number, y: number): { x: number; y: number } => {
    if (!boundary) return { x, y }
    
    const elemWidth = width || elementRef.value?.offsetWidth || 0
    const elemHeight = height || elementRef.value?.offsetHeight || 0
    
    if (!elemWidth || !elemHeight) return { x, y }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const minX = boundaryPadding
    const maxX = viewportWidth - elemWidth - boundaryPadding
    const minY = boundaryPadding
    const maxY = viewportHeight - elemHeight - boundaryPadding

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    }
  }

  // 初始化位置（立即执行，确保首次渲染就在正确位置）
  const initPosition = () => {
    if (isInitialized.value) return
    
    if (centered && width && height) {
      const center = getCenterPosition()
      position.value = clampPosition(center.x, center.y)
    } else {
      position.value = clampPosition(initialX, initialY)
    }
    
    isInitialized.value = true
  }
  
  // 立即初始化位置（用于 SSR/首次渲染）
  initPosition()

  // 计算样式 - 统一使用 left/top，不使用 transform
  const style = computed(() => {
    return {
      position: 'fixed' as const,
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
      cursor: isDragging.value ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      // 拖拽时禁用过渡，避免延迟感
      transition: isDragging.value ? 'none' : undefined
    }
  })

  // 获取事件坐标（兼容鼠标和触摸）
  const getEventCoords = (e: MouseEvent | TouchEvent): { clientX: number; clientY: number } => {
    if ('touches' in e) {
      return {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      }
    }
    return {
      clientX: (e as MouseEvent).clientX,
      clientY: (e as MouseEvent).clientY
    }
  }

  // 处理拖拽移动
  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return

    const { clientX, clientY } = getEventCoords(e)
    
    let newX = clientX - dragOffset.value.x
    let newY = clientY - dragOffset.value.y

    // 应用边界限制
    const clamped = clampPosition(newX, newY)
    position.value = clamped
    
    if (!hasDragged.value) {
      hasDragged.value = true
    }
  }

  // 开始拖拽
  const startDrag = (e: MouseEvent | TouchEvent) => {
    // 只有左键可以拖拽（鼠标事件）
    if ('button' in e && e.button !== 0) return

    isDragging.value = true

    const { clientX, clientY } = getEventCoords(e)
    dragOffset.value = {
      x: clientX - position.value.x,
      y: clientY - position.value.y
    }

    onDragStart?.()

    // 添加全局事件监听
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', stopDrag)
  }

  // 停止拖拽
  const stopDrag = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', stopDrag)

    onDragEnd?.()
  }

  // 窗口大小变化时重新计算边界
  const handleResize = () => {
    if (!isInitialized.value) return
    
    // 如果启用居中且尚未拖拽过，重新居中
    if (centered && !hasDragged.value && width && height) {
      const center = getCenterPosition()
      position.value = clampPosition(center.x, center.y)
    } else if (boundary) {
      // 否则只在超出边界时调整
      position.value = clampPosition(position.value.x, position.value.y)
    }
  }

  onMounted(() => {
    // 确保 DOM 已渲染后再计算初始位置
    initPosition()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    stopDrag()
  })

  return {
    elementRef,
    isDragging,
    hasDragged,
    position,
    style,
    startDrag,
    stopDrag
  }
}

/**
 * 居中定位的拖拽 Hook
 * 适用于需要初始居中的弹窗类组件
 * @deprecated 直接使用 useDraggable({ centered: true, width, height })
 */
export function useCenteredDraggable(
  elementWidth: number,
  elementHeight: number,
  options: Omit<DraggableOptions, 'centered' | 'width' | 'height'> = {}
): DraggableReturn {
  return useDraggable({
    centered: true,
    width: elementWidth,
    height: elementHeight,
    ...options
  })
}

/**
 * 角落定位的拖拽 Hook
 * 适用于悬浮窗、通知等组件
 */
export function useCornerDraggable(
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  elementWidth: number,
  elementHeight: number,
  offset: number = 20,
  options: Omit<DraggableOptions, 'initialX' | 'initialY' | 'centered' | 'width' | 'height'> = {}
): DraggableReturn {
  const getCornerPosition = () => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    switch (corner) {
      case 'top-right':
        return { x: viewportWidth - elementWidth - offset, y: offset }
      case 'bottom-left':
        return { x: offset, y: viewportHeight - elementHeight - offset }
      case 'bottom-right':
        return { x: viewportWidth - elementWidth - offset, y: viewportHeight - elementHeight - offset }
      case 'top-left':
      default:
        return { x: offset, y: offset }
    }
  }

  const initialPos = getCornerPosition()

  return useDraggable({
    initialX: initialPos.x,
    initialY: initialPos.y,
    width: elementWidth,
    height: elementHeight,
    ...options
  })
}

export default useDraggable
