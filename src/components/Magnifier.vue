<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
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
  // 像素颜色（从 MagnifierHelper 传入）
  pixelColor?: { hex: string, rgb: string } | null
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
  pixelColor: null,
})

// 放大镜与鼠标的间距
const MOUSE_OFFSET = 15

// 获取窗口尺寸
const { width: windowWidth } = useWindowSize()

// 计算放大镜位置
const magnifierPos = computed(() => {
  const diameter = props.radius * 2

  // 默认：右上角（鼠标在放大镜左下角附近）
  let translateX = props.x + MOUSE_OFFSET
  let translateY = props.y - diameter - MOUSE_OFFSET

  // 检测上边缘：超出则移到下方
  if (props.y - diameter - MOUSE_OFFSET < 0) {
    translateY = props.y + MOUSE_OFFSET
  }

  // 检测右边缘：超出则移到左侧
  if (props.x + MOUSE_OFFSET + diameter > windowWidth.value) {
    translateX = props.x - diameter - MOUSE_OFFSET
  }

  return { translateX, translateY }
})

// 放大镜中心始终显示鼠标位置
const magnifierCenterX = computed(() => props.radius)
const magnifierCenterY = computed(() => props.radius)

// 计算放大镜的样式
const magnifierStyle = computed(() => {
  const diameter = props.radius * 2
  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    borderRadius: '50%',
    border: `${props.borderWidth}px solid ${props.borderColor}`,
    boxShadow: `0 ${props.borderWidth * 5}px ${props.borderWidth * 10}px rgba(0, 0, 0, 0.3)`,
    transform: `translate3d(${magnifierPos.value.translateX}px, ${magnifierPos.value.translateY}px, 0)`,
    display: props.show ? 'block' : 'none',
  }
})

// 十字线宽度（根据缩放比例变化）
const crosshairWidth = computed(() => {
  // 限制最大宽度，避免太大的线
  return Math.min(props.zoomLevel, 30)
})

// 十字线长度：从边缘向内延伸的距离
const crosshairLength = computed(() => {
  // 线条长度 = 半径 - (放大比例 / 2)
  return props.radius - props.zoomLevel / 2
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

  // 使用 Math.round 找到最近的像素块（减少快速移动时跳过像素的问题）
  const pixelX = Math.round(originalX)
  const pixelY = Math.round(originalY)

  // 计算像素块的中心点（在原图坐标中）
  const pixelCenterX = pixelX + 0.5
  const pixelCenterY = pixelY + 0.5

  // 计算背景位置，使像素块中心显示在放大镜中心
  const bgPosX = pixelCenterX * props.zoomLevel - magnifierCenterX.value
  const bgPosY = pixelCenterY * props.zoomLevel - magnifierCenterY.value

  // 使用 Math.floor 确保背景位置为整数，避免 sub-pixel 渲染
  const bgPosXInt = Math.floor(bgPosX)
  const bgPosYInt = Math.floor(bgPosY)

  return {
    backgroundImage: `url(${props.backgroundImageUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${bgWidth}px ${bgHeight}px`,
    backgroundPosition: `-${bgPosXInt}px -${bgPosYInt}px`,
  }
})

// 像素坐标
const pixelCoord = computed(() => {
  const originalX = (props.x - props.bgLeft) / props.bgScale
  const originalY = (props.y - props.bgTop) / props.bgScale
  const pixelX = Math.round(originalX)
  const pixelY = Math.round(originalY)
  return { x: pixelX, y: pixelY }
})

// 像素颜色（从 MagnifierHelper 传入，已缓存优化）
const pixelColor = computed(() => props.pixelColor)

// 信息面板位置（在放大镜下方）
const infoStyle = computed(() => {
  const diameter = props.radius * 2
  const infoHeight = 50 // 信息面板高度
  const gap = 8 // 间距

  // 放大镜位置
  const magX = magnifierPos.value.translateX
  const magY = magnifierPos.value.translateY

  // 计算信息面板位置（水平居中，垂直在放大镜下方）
  let infoLeft = magX + props.radius - 60 // 大致居中，假设面板宽约120px
  let infoTop = magY + diameter + gap

  // 检测右边缘
  const infoWidth = 120
  if (infoLeft + infoWidth > windowWidth.value) {
    infoLeft = windowWidth.value - infoWidth - 10
  }
  if (infoLeft < 10) {
    infoLeft = 10
  }

  // 检测下边缘
  const { height: windowHeight } = useWindowSize()
  if (infoTop + infoHeight > windowHeight.value) {
    // 如果下方空间不足，显示在放大镜上方
    infoTop = magY - infoHeight - gap
  }

  return {
    transform: `translate3d(${infoLeft}px, ${infoTop}px, 0)`,
    display: props.show ? 'block' : 'none',
  }
})
</script>

<template>
  <div
    class="magnifier"
    :style="{ ...magnifierStyle, ...backgroundStyle }"
  >
    <!-- 十字线（四个独立线段，中心留空） -->
    <div class="crosshair-top" :style="{ width: `${crosshairWidth}px`, height: `${crosshairLength}px`, top: 0 }" />
    <div class="crosshair-bottom" :style="{ width: `${crosshairWidth}px`, height: `${crosshairLength}px`, bottom: 0 }" />
    <div class="crosshair-left" :style="{ width: `${crosshairLength}px`, height: `${crosshairWidth}px`, left: 0 }" />
    <div class="crosshair-right" :style="{ width: `${crosshairLength}px`, height: `${crosshairWidth}px`, right: 0 }" />
  </div>

  <!-- 信息面板 -->
  <div class="magnifier-info" :style="infoStyle">
    <div class="info-row">
      <span class="info-label">坐标:</span>
      <span class="info-value">({{ pixelCoord.x }}, {{ pixelCoord.y }})</span>
    </div>
    <div v-if="pixelColor" class="info-row">
      <span class="info-label">颜色:</span>
      <span class="info-value color-preview">
        <span class="color-swatch" :style="{ backgroundColor: pixelColor.hex }" />
        {{ pixelColor.hex }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.magnifier {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;

  /* 为子元素提供定位上下文 */
  overflow: hidden;
  pointer-events: none;

  /* 禁用图像平滑，保持像素清晰（适合高倍放大） */
  image-rendering: pixelated;

  /* 锐化滤镜：增加对比度让像素边缘更清晰 */

  /* 确保 transform 有独立的合成层 */
  backface-visibility: hidden;

  /* 提示浏览器该元素会变换，优化性能 */
  will-change: transform;
}

/* 十字线（四个独立线段，中心留空） */
.crosshair-top,
.crosshair-bottom,
.crosshair-left,
.crosshair-right {
  position: absolute;
  pointer-events: none;
  background-color: #0091ff90;
}

/* 上方线段 */
.crosshair-top {
  left: 50%;
  transform: translateX(-50%);
}

/* 下方线段 */
.crosshair-bottom {
  left: 50%;
  transform: translateX(-50%);
}

/* 左侧线段 */
.crosshair-left {
  top: 50%;
  transform: translateY(-50%);
}

/* 右侧线段 */
.crosshair-right {
  top: 50%;
  transform: translateY(-50%);
}

/* 信息面板 */
.magnifier-info {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  padding: 6px 10px;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Code', monospace;
  font-size: 12px;
  color: white;
  white-space: nowrap;
  pointer-events: none;
  background: rgb(0 0 0 / 85%);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 30%);
}

.info-row {
  display: flex;
  gap: 8px;
  align-items: center;
  line-height: 1.5;
}

.info-label {
  color: #9ca3af;
  user-select: none;
}

.info-value {
  font-weight: 500;
  color: #f3f4f6;
}

.color-preview {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 20%);
}
</style>
