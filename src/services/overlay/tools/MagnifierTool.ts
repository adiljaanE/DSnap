import type { FabricImage } from 'fabric'
import type { FabricCanvas } from '../FabricCanvas'

import * as fabric from 'fabric'
import { createApp, h, reactive } from 'vue'

import Magnifier from '@/components/Magnifier.vue'
import { Tools } from './Tools'

interface MagnifierConfig {
  zoomLevel: number
  radius: number
  borderWidth: number
  borderColor: string
}

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
}

const DEFAULT_CONFIG: MagnifierConfig = {
  zoomLevel: 2,
  radius: 100,
  borderWidth: 2,
  borderColor: '#409EFF',
}

export class MagnifierTool extends Tools {
  private config: MagnifierConfig
  private backgroundImage: FabricImage | null = null
  private animationFrameId: number | null = null
  private lastMousePosition = { x: 0, y: 0 }

  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseLeave: () => void

  // Vue 组件相关
  private app: ReturnType<typeof createApp> | null = null
  private container: HTMLElement | null = null
  private reactiveState: MagnifierState

  constructor(
    fabricCanvas: FabricCanvas,
    config?: Partial<MagnifierConfig>,
  ) {
    super(fabricCanvas)
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 初始化响应式状态
    this.reactiveState = reactive({
      show: false,
      x: 0,
      y: 0,
      zoomLevel: this.config.zoomLevel,
      radius: this.config.radius,
      borderWidth: this.config.borderWidth,
      borderColor: this.config.borderColor,
      backgroundImageUrl: '',
      bgLeft: 0,
      bgTop: 0,
      bgScale: 1,
      originalImageWidth: 0,
      originalImageHeight: 0,
    })

    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this)
  }

  setConfig(config: Partial<MagnifierConfig>): void {
    this.config = { ...this.config, ...config }
    // 更新响应式状态
    this.reactiveState.zoomLevel = this.config.zoomLevel
    this.reactiveState.radius = this.config.radius
    this.reactiveState.borderWidth = this.config.borderWidth
    this.reactiveState.borderColor = this.config.borderColor
  }

  protected onActivate(): void {
    // 从 FabricCanvas 获取背景图 URL
    if (this.fabricCanvas.backgroundImageUrl) {
      this.reactiveState.backgroundImageUrl = this.fabricCanvas.backgroundImageUrl
    }

    this.createMagnifierComponent()
    this.cacheBackgroundInfo()
    // 显示放大镜
    this.updateState({ show: true })
    // 注册事件
    this.canvas.on('mouse:move', this.boundHandleMouseMove)
    this.canvas.on('mouse:out', this.boundHandleMouseLeave)
  }

  protected onDeactivate(): void {
    // 隐藏放大镜
    this.updateState({ show: false })
    // 取消事件
    this.canvas.off('mouse:move', this.boundHandleMouseMove)
    this.canvas.off('mouse:out', this.boundHandleMouseLeave)
    // 停止动画
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    // 销毁 Vue 组件
    this.destroyMagnifierComponent()
  }

  private createMagnifierComponent(): void {
    if (this.app)
      return

    // 创建容器
    this.container = document.createElement('div')
    this.container.id = 'magnifier-container'
    document.body.appendChild(this.container)

    // 保存响应式状态的引用

    // 创建 Vue 应用并挂载，使用响应式状态
    this.app = createApp({
      setup: () => {
        // 返回渲染函数，使用响应式状态
        return () => h(Magnifier, { ...this.reactiveState })
      },
    })
    this.app.mount(this.container)
  }

  private destroyMagnifierComponent(): void {
    if (this.app) {
      this.app.unmount()
      this.app = null
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
      this.container = null
    }
  }

  private updateState(partialState: Partial<MagnifierState>): void {
    // 直接更新响应式状态，Vue 会自动更新组件
    Object.assign(this.reactiveState, partialState)
  }

  private cacheBackgroundInfo(): void {
    const objects = this.canvas.getObjects()
    this.backgroundImage = objects.find(obj => obj instanceof fabric.FabricImage) as fabric.FabricImage || null

    if (this.backgroundImage) {
      // 背景图片变换信息
      const bgLeft = this.backgroundImage.left || 0
      const bgTop = this.backgroundImage.top || 0
      const bgScale = this.backgroundImage.scaleX || 1
      const originalImageWidth = this.backgroundImage.width || 0
      const originalImageHeight = this.backgroundImage.height || 0

      // 更新组件状态
      this.updateState({
        bgLeft,
        bgTop,
        bgScale,
        originalImageWidth,
        originalImageHeight,
      })
    }
  }

  private handleMouseMove(e: fabric.TPointerEventInfo): void {
    if (!e.scenePoint)
      return
    this.lastMousePosition = { x: e.scenePoint.x, y: e.scenePoint.y }

    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.updateState({
          show: true,
          x: this.lastMousePosition.x,
          y: this.lastMousePosition.y,
        })
        this.animationFrameId = null
      })
    }
  }

  private handleMouseLeave(): void {
    this.updateState({ show: false })
  }

  protected onWheel(e: WheelEvent): void {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoomLevel = Math.max(1.5, Math.min(5, this.config.zoomLevel + delta))
    this.config.zoomLevel = Math.round(newZoomLevel * 10) / 10
    this.updateState({ zoomLevel: this.config.zoomLevel })
  }

  getShortcutKey(): string {
    return '4'
  }
}
