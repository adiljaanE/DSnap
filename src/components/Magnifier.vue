<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show?: boolean
  x?: number
  y?: number
  zoomLevel?: number
  radius?: number
  borderWidth?: number
  borderColor?: string
  backgroundImageUrl?: string
  // 背景图片在画布上的变换信息
  bgLeft?: number
  bgTop?: number
  bgScale?: number
  originalImageWidth?: number
  originalImageHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  x: 0,
  y: 0,
  zoomLevel: 2,
  radius: 100,
  borderWidth: 2,
  borderColor: '#409EFF',
  backgroundImageUrl: '',
  bgLeft: 0,
  bgTop: 0,
  bgScale: 1,
  originalImageWidth: 0,
  originalImageHeight: 0,
})

// 放大镜与鼠标的间距
const MOUSE_OFFSET = 15

// 计算放大镜的样式
const magnifierStyle = computed(() => {
  const diameter = props.radius * 2
  // 使用 transform 代替 left/top，性能更好（GPU 加速，避免重排）
  const translateX = props.x - props.radius
  const translateY = props.y - props.radius * 2 - MOUSE_OFFSET
  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    borderRadius: '50%',
    border: `${props.borderWidth}px solid ${props.borderColor}`,
    boxShadow: `0 ${props.borderWidth * 5}px ${props.borderWidth * 10}px rgba(0, 0, 0, 0.3)`,
    transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
    display: props.show ? 'block' : 'none',
  }
})

// 计算背景图的样式
const backgroundStyle = computed(() => {
  if (!props.backgroundImageUrl)
    return {}

  const bgWidth = props.originalImageWidth * props.zoomLevel
  const bgHeight = props.originalImageHeight * props.zoomLevel

  // 计算鼠标在原图上的位置
  const originalX = (props.x - props.bgLeft) / props.bgScale
  const originalY = (props.y - props.bgTop) / props.bgScale

  // 放大镜在鼠标上方，鼠标在放大镜内部的位置是 (radius, radius + MOUSE_OFFSET)
  // 计算放大的背景位置，使鼠标位置对应放大镜内的这个点
  const bgPosX = originalX * props.zoomLevel - props.radius
  const bgPosY = originalY * props.zoomLevel - (props.radius + MOUSE_OFFSET)

  return {
    backgroundImage: `url(${props.backgroundImageUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${bgWidth}px ${bgHeight}px`,
    backgroundPosition: `-${bgPosX}px -${bgPosY}px`,
  }
})
</script>

<template>
  <div
    class="magnifier"
    :style="{ ...magnifierStyle, ...backgroundStyle }"
  />
</template>

<style scoped>
.magnifier {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  pointer-events: none;

  /* 确保 transform 有独立的合成层 */
  backface-visibility: hidden;

  /* 提示浏览器该元素会变换，优化性能 */
  will-change: transform;
}
</style>
