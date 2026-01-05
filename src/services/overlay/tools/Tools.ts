import type { Canvas } from 'fabric'
import type { FabricCanvas } from '../FabricCanvas'

export abstract class Tools {
  protected canvas: Canvas
  protected fabricCanvas: FabricCanvas
  protected isActive = false
  private boundHandleWheel?: (e: WheelEvent) => void

  constructor(fabricCanvas: FabricCanvas) {
    this.fabricCanvas = fabricCanvas
    this.canvas = fabricCanvas.canvas
  }

  /**
   * 激活工具 - 最终调用此方法
   */
  activate(): void {
    this.fabricCanvas.activeTools = this
    this.isActive = true
    this.onActivate()

    if (this.onWheel) {
      this.boundHandleWheel = this.onWheel.bind(this)
      window.addEventListener('wheel', this.boundHandleWheel)
    }
  }

  /**
   * 取消激活工具 - 最终调用此方法
   */
  deactivate(): void {
    if (this.fabricCanvas.activeTools === this) {
      this.fabricCanvas.activeTools = null
    }
    this.isActive = false
    this.onDeactivate()

    if (this.boundHandleWheel) {
      window.removeEventListener('wheel', this.boundHandleWheel)
      this.boundHandleWheel = undefined
    }
  }

  /**
   * 子类实现：激活时的具体逻辑
   */
  protected abstract onActivate(): void

  /**
   * 子类实现：取消激活时的具体逻辑
   */
  protected abstract onDeactivate(): void

  /**
   * 子类可选实现：处理滚轮事件
   */
  protected onWheel?(e: WheelEvent): void

  isToolActive(): boolean {
    return this.isActive
  }

  getShortcutKey(): string | undefined {
    return undefined
  }
}
