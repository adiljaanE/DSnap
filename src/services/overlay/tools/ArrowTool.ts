import type { FabricCanvas } from '../FabricCanvas'
import * as fabric from 'fabric'
import { Tools } from './Tools'

interface ArrowToolConfig {
  stroke: string
  strokeWidth: number
}

const DEFAULT_CONFIG: ArrowToolConfig = {
  stroke: '#FF0000',
  strokeWidth: 2,
}

export class ArrowTool extends Tools {
  private config: ArrowToolConfig
  private currentArrow: fabric.Group | null = null
  private isDrawing = false
  private startX = 0
  private startY = 0
  private arrows: fabric.Group[] = []

  private boundHandleMouseDown: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseUp: (e: fabric.TPointerEventInfo) => void

  constructor(fabricCanvas: FabricCanvas, config?: Partial<ArrowToolConfig>) {
    super(fabricCanvas)
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
  }

  setConfig(config: Partial<ArrowToolConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): ArrowToolConfig {
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
    if (!e.pointer)
      return

    if (e.target && this.arrows.includes(e.target as fabric.Group))
      return

    if (this.isDrawing)
      return

    this.isDrawing = true
    this.startX = e.pointer.x
    this.startY = e.pointer.y
  }

  private handleMouseMove(e: fabric.TPointerEventInfo) {
    if (!this.isDrawing || !e.pointer)
      return

    const endX = e.pointer.x
    const endY = e.pointer.y

    if (this.currentArrow) {
      this.canvas.remove(this.currentArrow)
    }

    this.currentArrow = this.createArrow(this.startX, this.startY, endX, endY)
    this.canvas.add(this.currentArrow)
    this.canvas.renderAll()
  }

  private handleMouseUp(_e: fabric.TPointerEventInfo) {
    if (!this.isDrawing)
      return

    this.isDrawing = false

    if (this.currentArrow) {
      this.currentArrow.set({
        selectable: false,
        evented: false,
      })

      this.arrows.push(this.currentArrow)
      this.currentArrow = null
    }

    this.canvas.renderAll()
  }

  private createArrow(x1: number, y1: number, x2: number, y2: number): fabric.Group {
    const line = new fabric.Line([x1, y1, x2, y2], {
      stroke: this.config.stroke,
      strokeWidth: this.config.strokeWidth,
    })

    const angle = Math.atan2(y2 - y1, x2 - x1)
    const headLength = 15

    const arrowHead = new fabric.Triangle({
      left: x2,
      top: y2,
      originX: 'center',
      originY: 'center',
      width: headLength,
      height: headLength,
      fill: this.config.stroke,
      angle: (angle * 180) / Math.PI + 90,
    })

    return new fabric.Group([line, arrowHead], {
      selectable: false,
      evented: false,
    })
  }

  protected onWheel(e: WheelEvent): void {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    const newStrokeWidth = Math.max(1, Math.min(20, this.config.strokeWidth + delta))
    this.config.strokeWidth = newStrokeWidth
  }

  getShortcutKey(): string {
    return '3'
  }
}
