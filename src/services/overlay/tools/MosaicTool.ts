import type { FabricCanvas } from '../FabricCanvas'
import * as fabric from 'fabric'
import { Tools } from './Tools'

interface MosaicToolConfig {
  blockSize: number
}

const DEFAULT_CONFIG: MosaicToolConfig = {
  blockSize: 10,
}

export class MosaicTool extends Tools {
  private config: MosaicToolConfig
  private currentRect: fabric.Rect | null = null
  private isDrawing = false
  private startX = 0
  private startY = 0
  private mosaicRegions: fabric.FabricImage[] = []

  private boundHandleMouseDown: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseUp: (e: fabric.TPointerEventInfo) => void

  constructor(fabricCanvas: FabricCanvas, config?: Partial<MosaicToolConfig>) {
    super(fabricCanvas)
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
  }

  setBlockSize(size: number): void {
    this.config.blockSize = Math.max(4, Math.min(50, size))
  }

  getBlockSize(): number {
    return this.config.blockSize
  }

  setConfig(config: Partial<MosaicToolConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): MosaicToolConfig {
    return { ...this.config }
  }

  protected onActivate(): void {
    this.canvas.defaultCursor = 'crosshair'
    this.canvas.hoverCursor = 'crosshair'
    this.canvas.on('mouse:down', this.boundHandleMouseDown)
    this.canvas.on('mouse:move', this.boundHandleMouseMove)
    this.canvas.on('mouse:up', this.boundHandleMouseUp)
  }

  protected onDeactivate(): void {
    this.canvas.defaultCursor = 'default'
    this.canvas.off('mouse:down', this.boundHandleMouseDown)
    this.canvas.off('mouse:move', this.boundHandleMouseMove)
    this.canvas.off('mouse:up', this.boundHandleMouseUp)

    if (this.currentRect) {
      this.canvas.remove(this.currentRect)
      this.currentRect = null
      this.canvas.renderAll()
    }
  }

  private handleMouseDown(e: fabric.TPointerEventInfo) {
    if (!e.scenePoint)
      return

    if (this.isDrawing)
      return

    this.isDrawing = true
    this.startX = e.scenePoint.x
    this.startY = e.scenePoint.y
  }

  private handleMouseMove(e: fabric.TPointerEventInfo) {
    if (!this.isDrawing || !e.scenePoint)
      return

    const currentX = e.scenePoint.x
    const currentY = e.scenePoint.y

    const left = Math.min(this.startX, currentX)
    const top = Math.min(this.startY, currentY)
    const width = Math.abs(currentX - this.startX)
    const height = Math.abs(currentY - this.startY)

    if (this.currentRect) {
      this.currentRect.set({ left, top, width, height })
    }
    else {
      this.currentRect = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: 'rgba(255, 0, 0, 0.2)',
        stroke: '#FF0000',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      })
      this.canvas.add(this.currentRect)
    }

    this.canvas.renderAll()
  }

  private async handleMouseUp(_e: fabric.TPointerEventInfo) {
    if (!this.isDrawing)
      return

    this.isDrawing = false

    if (this.currentRect) {
      const { left, top, width, height } = this.currentRect
      this.canvas.remove(this.currentRect)
      this.currentRect = null

      // 只处理有效大小的区域
      if (width > 5 && height > 5) {
        const mosaicImg = await this.createMosaicRegion(left!, top!, width!, height!)
        if (mosaicImg) {
          this.mosaicRegions.push(mosaicImg)
        }
      }

      this.canvas.renderAll()
    }
  }

  private async createMosaicRegion(
    left: number,
    top: number,
    width: number,
    height: number,
  ): Promise<fabric.FabricImage | null> {
    // 获取背景图片 - 获取第一个对象（背景图片是最先添加的）
    const objects = this.canvas.getObjects()
    const bgImage = objects[0] as fabric.FabricImage

    if (!bgImage || bgImage.type !== 'image') {
      console.warn('未找到背景图片：画布上没有图片对象')
      return null
    }

    // 获取图片元素
    const imgElement = (bgImage as any).element || (bgImage as any)._element
    if (!imgElement) {
      console.warn('图片对象没有 element 属性')
      return null
    }

    const bgScaleX = bgImage.scaleX || 1
    const bgScaleY = bgImage.scaleY || 1
    const bgLeft = bgImage.left || 0
    const bgTop = bgImage.top || 0

    // 计算在原图上的裁剪区域
    const relativeLeft = Math.floor((left - bgLeft) / bgScaleX)
    const relativeTop = Math.floor((top - bgTop) / bgScaleY)
    const relativeWidth = Math.ceil(width / bgScaleX)
    const relativeHeight = Math.ceil(height / bgScaleY)

    // 边界检查
    if (relativeLeft < 0 || relativeTop < 0
      || relativeLeft + relativeWidth > imgElement.width
      || relativeTop + relativeHeight > imgElement.height) {
      console.warn('选区超出图片边界')
      return null
    }

    // 创建临时 canvas 裁剪图像区域
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = Math.ceil(width)
    tempCanvas.height = Math.ceil(height)
    const ctx = tempCanvas.getContext('2d')!

    // 确保绘制时使用整数坐标，避免亚像素偏移
    ctx.imageSmoothingEnabled = false

    // 从原图裁剪指定区域
    ctx.drawImage(
      imgElement,
      relativeLeft,
      relativeTop,
      relativeWidth,
      relativeHeight,
      0,
      0,
      width,
      height,
    )

    // 转换为 Fabric.Image 并应用滤镜
    const dataUrl = tempCanvas.toDataURL()

    // Fabric.js v7 中 fromURL 返回 Promise
    try {
      const img = await fabric.FabricImage.fromURL(dataUrl)

      // 应用 Pixelate 滤镜
      img.filters = [new fabric.filters.Pixelate({
        blocksize: this.config.blockSize,
      })]

      // applyFilters 是异步的
      await img.applyFilters()

      // 计算实际的显示尺寸（因为临时 canvas 使用了 ceil）
      const actualWidth = Math.ceil(width)
      const actualHeight = Math.ceil(height)

      img.set({
        left: Math.floor(left),
        top: Math.floor(top),
        originX: 'left',
        originY: 'top',
        scaleX: width / actualWidth,
        scaleY: height / actualHeight,
        selectable: true,
        evented: true,
      })

      this.canvas.add(img)
      // 将马赛克图片移到最顶层，确保在 maskGroup 之上
      this.canvas.bringObjectToFront(img)
      this.canvas.renderAll()

      return img
    }
    catch (err) {
      console.error('创建马赛克图片失败:', err)
      return null
    }
  }

  protected onWheel(e: WheelEvent): void {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -2 : 2
    const newBlockSize = Math.max(4, Math.min(50, this.config.blockSize + delta))
    this.config.blockSize = newBlockSize
  }

  getShortcutKey(): string {
    return '4'
  }
}
