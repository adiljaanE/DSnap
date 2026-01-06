import type { FabricCanvas } from '../FabricCanvas'
import * as fabric from 'fabric'
import { Tools } from './Tools'

export class MaskTool extends Tools {
  private selectionRect: fabric.Rect | null = null
  private isDrawing = false
  private startX = 0
  private startY = 0

  private boundHandleMouseDown: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseUp: (e: fabric.TPointerEventInfo) => void

  constructor(fabricCanvas: FabricCanvas) {
    super(fabricCanvas)

    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
  }

  protected onActivate(): void {
    if (this.selectionRect) {
      this.selectionRect.set({
        selectable: true,
        evented: true,
      })
      this.canvas.setActiveObject(this.selectionRect)
      this.canvas.renderAll()
    }

    this.canvas.on('mouse:down', this.boundHandleMouseDown)
    this.canvas.on('mouse:move', this.boundHandleMouseMove)
    this.canvas.on('mouse:up', this.boundHandleMouseUp)
  }

  protected onDeactivate(): void {
    if (this.selectionRect) {
      this.selectionRect.set({
        selectable: false,
        evented: false,
      })
      this.canvas.discardActiveObject()
      this.canvas.renderAll()
    }

    this.canvas.off('mouse:down', this.boundHandleMouseDown)
    this.canvas.off('mouse:move', this.boundHandleMouseMove)
    this.canvas.off('mouse:up', this.boundHandleMouseUp)
  }

  private handleMouseDown(e: fabric.TPointerEventInfo) {
    if (!e.scenePoint)
      return

    // 如果点击的是选择框，让 Fabric.js 处理拖动/调整大小
    if (e.target === this.selectionRect)
      return

    this.clearSelection()
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

    if (this.selectionRect) {
      this.selectionRect.set({ left, top, width, height })
    }
    else {
      this.selectionRect = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: 'transparent',
        stroke: '#409EFF',
        strokeWidth: 2,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      })
      this.canvas.add(this.selectionRect)
    }

    this.updateMaskClipPath(left, top, width, height)
    this.canvas.renderAll()
  }

  private handleMouseUp(_e: fabric.TPointerEventInfo) {
    if (!this.isDrawing)
      return

    this.isDrawing = false

    if (this.selectionRect) {
      this.selectionRect.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        lockUniScaling: false,
        borderColor: '#409EFF',
        borderScaleFactor: 1,
        cornerColor: '#409EFF',
        cornerStrokeColor: '#409EFF',
        cornerSize: 8,
        transparentCorners: false,
        cornerStyle: 'circle',
      })

      this.selectionRect.setControlsVisibility({
        tl: true,
        tr: true,
        bl: true,
        br: true,
        ml: true,
        mr: true,
        mt: true,
        mb: true,
        mtr: false,
      })

      this.selectionRect.on('modified', () => {
        this.syncMaskWithSelection()
      })

      this.selectionRect.on('moving', () => {
        this.syncMaskWithSelection()
      })

      this.selectionRect.on('scaling', () => {
        this.syncMaskWithSelection()
      })

      this.canvas.setActiveObject(this.selectionRect)
    }

    this.canvas.renderAll()
  }

  private syncMaskWithSelection() {
    if (!this.selectionRect)
      return

    const scaleX = this.selectionRect.scaleX || 1
    const scaleY = this.selectionRect.scaleY || 1
    const width = (this.selectionRect.width || 0) * scaleX
    const height = (this.selectionRect.height || 0) * scaleY

    this.selectionRect.set({
      scaleX: 1,
      scaleY: 1,
      width,
      height,
    })

    this.updateMaskClipPath(
      this.selectionRect.left || 0,
      this.selectionRect.top || 0,
      width,
      height,
    )

    this.canvas.renderAll()
  }

  private updateMaskClipPath(left: number, top: number, width: number, height: number) {
    const maskOverlay = this.fabricCanvas.maskOverlay
    if (!maskOverlay)
      return

    const canvasWidth = this.canvas.width || 0
    const canvasHeight = this.canvas.height || 0

    const pathData = `M 0 0 L ${canvasWidth} 0 L ${canvasWidth} ${canvasHeight} L 0 ${canvasHeight} Z M ${left} ${top} L ${left + width} ${top} L ${left + width} ${top + height} L ${left} ${top + height} Z`

    const clipPath = new fabric.Path(pathData, {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      absolutePositioned: true,
      fillRule: 'evenodd',
    })

    maskOverlay.set({ clipPath })
  }

  private clearSelection() {
    if (this.selectionRect) {
      this.canvas.remove(this.selectionRect)
      this.selectionRect = null
    }

    const maskOverlay = this.fabricCanvas.maskOverlay
    if (maskOverlay) {
      maskOverlay.set({ clipPath: undefined })
    }
  }

  getShortcutKey(): string {
    return '1'
  }
}
