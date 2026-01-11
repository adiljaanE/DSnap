import type { Canvas } from 'fabric'

import type * as fabric from 'fabric'
import { createApp, h, reactive } from 'vue'

import Magnifier from '@/components/Magnifier.vue'

interface MagnifierState {
  show: boolean
  x: number
  y: number
  zoomLevel: number
  radius: number
  borderWidth: number
  borderColor: string
  backgroundImageUrl: string
  bgLeft: number
  bgTop: number
  bgScale: number
  originalImageWidth: number
  originalImageHeight: number
  pixelColor?: { hex: string, rgb: string } | null
}

interface BackgroundInfo {
  bgLeft: number
  bgTop: number
  bgScale: number
  originalImageWidth: number
  originalImageHeight: number
}

interface MagnifierConfig {
  radius?: number
  zoomLevel?: number
  borderColor?: string
}

export class MagnifierHelper {
  private app: ReturnType<typeof createApp> | null = null
  private container: HTMLElement | null = null
  private state: ReturnType<typeof reactive<MagnifierState>>
  private animationFrameId: number | null = null
  private canvas: Canvas
  private isEnabled = true

  // 放大倍率范围
  private readonly MIN_ZOOM_LEVEL = 8
  private readonly MAX_ZOOM_LEVEL = 30
  private readonly ZOOM_STEP = 1

  // 颜色缓存
  private colorCacheCanvas: HTMLCanvasElement | null = null
  private colorCacheCtx: CanvasRenderingContext2D | null = null
  private colorCacheImage: HTMLImageElement | null = null

  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseLeave: () => void
  private boundHandleWheel: (opt: fabric.TEvent<WheelEvent>) => void

  constructor(
    canvas: Canvas,
    backgroundImageUrl: string,
    config?: MagnifierConfig,
  ) {
    this.canvas = canvas
    this.state = reactive({
      show: false,
      x: 0,
      y: 0,
      zoomLevel: config?.zoomLevel ?? 12,
      radius: config?.radius ?? 80,
      borderWidth: 2,
      borderColor: config?.borderColor ?? '#409EFF',
      backgroundImageUrl,
      bgLeft: 0,
      bgTop: 0,
      bgScale: 1,
      originalImageWidth: 0,
      originalImageHeight: 0,
      pixelColor: null,
    })

    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this)
    this.boundHandleWheel = this.handleWheel.bind(this)
  }

  /** 创建放大镜组件并注册事件 */
  create(): void {
    if (this.app)
      return

    this.container = document.createElement('div')
    this.container.id = 'magnifier-helper-container'
    document.body.appendChild(this.container)

    const state = this.state
    this.app = createApp({
      setup: () => () => h(Magnifier, { ...state }),
    })
    this.app.mount(this.container)

    // 注册鼠标事件
    this.canvas.on('mouse:move', this.boundHandleMouseMove)
    this.canvas.on('mouse:out', this.boundHandleMouseLeave)
    this.canvas.on('mouse:wheel', this.boundHandleWheel)

    // 异步初始化颜色缓存
    this.initColorCache()
  }

  /** 初始化颜色缓存 */
  private initColorCache(): void {
    if (this.colorCacheCanvas)
      return

    const img = new Image()
    img.src = this.state.backgroundImageUrl

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (ctx) {
        this.colorCacheImage = img
        this.colorCacheCanvas = canvas
        this.colorCacheCtx = ctx
      }
    }
  }

  /** 获取像素颜色 */
  getPixelColor(pixelX: number, pixelY: number): { hex: string, rgb: string } | null {
    if (!this.colorCacheCtx || !this.colorCacheImage)
      return null

    const { originalImageWidth, originalImageHeight } = this.state

    // 边界检查
    if (pixelX < 0 || pixelY < 0 || pixelX >= originalImageWidth || pixelY >= originalImageHeight)
      return null

    this.colorCacheCtx.drawImage(this.colorCacheImage, pixelX, pixelY, 1, 1, 0, 0, 1, 1)
    const [r, g, b] = this.colorCacheCtx.getImageData(0, 0, 1, 1).data

    return {
      hex: `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase(),
      rgb: `rgb(${r}, ${g}, ${b})`,
    }
  }

  /** 销毁放大镜组件并取消事件 */
  destroy(): void {
    // 取消事件
    this.canvas.off('mouse:move', this.boundHandleMouseMove)
    this.canvas.off('mouse:out', this.boundHandleMouseLeave)
    this.canvas.off('mouse:wheel', this.boundHandleWheel)

    // 停止动画
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // 销毁 Vue 应用
    if (this.app) {
      this.app.unmount()
      this.app = null
    }
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container)
      this.container = null
    }
  }

  /** 设置是否启用（显示）放大镜 */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    this.state.show = enabled
  }

  /** 更新背景图信息 */
  updateBackgroundInfo(info: BackgroundInfo): void {
    this.state.bgLeft = info.bgLeft
    this.state.bgTop = info.bgTop
    this.state.bgScale = info.bgScale
    this.state.originalImageWidth = info.originalImageWidth
    this.state.originalImageHeight = info.originalImageHeight
  }

  /** 设置放大倍率 */
  setZoomLevel(level: number): void {
    this.state.zoomLevel = level
  }

  /** 设置半径 */
  setRadius(radius: number): void {
    this.state.radius = radius
  }

  private handleMouseMove(e: fabric.TPointerEventInfo): void {
    if (!e.scenePoint || !this.isEnabled)
      return

    if (this.animationFrameId !== null)
      return

    this.animationFrameId = requestAnimationFrame(() => {
      this.state.x = e.scenePoint!.x
      this.state.y = e.scenePoint!.y
      this.state.show = true

      // 计算像素坐标并获取颜色
      const originalX = (e.scenePoint!.x - this.state.bgLeft) / this.state.bgScale
      const originalY = (e.scenePoint!.y - this.state.bgTop) / this.state.bgScale
      const pixelX = Math.round(originalX)
      const pixelY = Math.round(originalY)
      this.state.pixelColor = this.getPixelColor(pixelX, pixelY)

      this.animationFrameId = null
    })
  }

  private handleMouseLeave(): void {
    // 不做任何处理，放大镜状态由 setEnabled 控制
  }

  private handleWheel(opt: fabric.TEvent<WheelEvent>): void {
    if (!this.isEnabled)
      return

    const e = opt.e
    if (!e)
      return

    // 阻止默认滚轮行为（防止画布缩放）
    e.preventDefault()
    e.stopPropagation()

    // deltaY > 0: 向下滚动（缩小），deltaY < 0: 向上滚动（放大）
    const delta = e.deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP

    // 更新放大倍率，并限制在范围内
    this.state.zoomLevel = Math.max(
      this.MIN_ZOOM_LEVEL,
      Math.min(this.MAX_ZOOM_LEVEL, this.state.zoomLevel + delta),
    )
  }
}
