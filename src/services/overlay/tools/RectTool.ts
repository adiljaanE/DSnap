import type { FabricCanvas } from '../FabricCanvas'
import * as fabric from 'fabric'
import { Tools } from './Tools'

interface RectToolConfig {
  fill?: string
  stroke: string
  strokeWidth: number
  rx?: number
  ry?: number
}

const DEFAULT_CONFIG: RectToolConfig = {
  fill: 'transparent',
  stroke: '#FF0000',
  strokeWidth: 2,
  rx: 0,
  ry: 0,
}

export class RectTool extends Tools {
  private config: RectToolConfig
  private currentRect: fabric.Rect | null = null
  private isDrawing = false
  private startX = 0
  private startY = 0
  private rects: fabric.Rect[] = []

  private boundHandleMouseDown: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseUp: (e: fabric.TPointerEventInfo) => void

  constructor(fabricCanvas: FabricCanvas, config?: Partial<RectToolConfig>) {
    super(fabricCanvas)
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
  }

  setConfig(config: Partial<RectToolConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): RectToolConfig {
    return { ...this.config }
  }

  protected onActivate(): void {
    this.canvas.on('mouse:down', this.boundHandleMouseDown)
    this.canvas.on('mouse:move', this.boundHandleMouseMove)
    this.canvas.on('mouse:up', this.boundHandleMouseUp)
  }

  protected onDeactivate(): void {
    this.canvas.off('mouse:down', this.boundHandleMouseDown)
    this.canvas.off('mouse:move', this.boundHandleMouseMove)
    this.canvas.off('mouse:up', this.boundHandleMouseUp)
  }

  private handleMouseDown(e: fabric.TPointerEventInfo) {
    if (!e.scenePoint)
      return

    if (e.target && this.rects.includes(e.target as fabric.Rect))
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
        fill: this.config.fill,
        stroke: this.config.stroke,
        strokeWidth: this.config.strokeWidth,
        rx: this.config.rx,
        ry: this.config.ry,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      })
      this.canvas.add(this.currentRect)
    }

    this.canvas.renderAll()
  }

  private handleMouseUp(_e: fabric.TPointerEventInfo) {
    if (!this.isDrawing)
      return

    this.isDrawing = false

    if (this.currentRect) {
      this.currentRect.set({
        selectable: false,
        evented: false,
      })

      this.rects.push(this.currentRect)
      this.currentRect = null
    }

    this.canvas.renderAll()
  }

  protected onWheel(e: WheelEvent): void {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    const newStrokeWidth = Math.max(1, Math.min(20, this.config.strokeWidth + delta))
    this.config.strokeWidth = newStrokeWidth
  }

  getShortcutKey(): string {
    return '2'
  }
}
