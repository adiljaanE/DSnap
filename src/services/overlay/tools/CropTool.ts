import type { FabricCanvas } from '../FabricCanvas'
import * as fabric from 'fabric'
import { Tools } from './Tools'

export class CropTool extends Tools {
  private selectionRect: fabric.Rect | null = null
  private maskRect: fabric.Rect | null = null
  private isDrawing = false
  private startX = 0
  private startY = 0

  private boundHandleMouseDown: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseMove: (e: fabric.TPointerEventInfo) => void
  private boundHandleMouseUp: (e: fabric.TPointerEventInfo) => void
  private boundHandleSelectionModified: () => void

  constructor(fabricCanvas: FabricCanvas) {
    super(fabricCanvas)

    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
    this.boundHandleSelectionModified = this.handleSelectionModified.bind(this)
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

    // 只允许鼠标左键按下
    const mouseEvent = e.e as MouseEvent
    if (mouseEvent?.button !== 0)
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
      // 更新 selectionRect（直接在 canvas 上）
      this.selectionRect.set({
        left,
        top,
        width,
        height,
      })

      // 同步更新 maskRect（在 maskGroup 中）
      if (this.maskRect && this.fabricCanvas.maskGroup) {
        const groupPoint = fabric.util.sendPointToPlane(
          new fabric.Point(left, top),
          undefined,
          this.fabricCanvas.maskGroup.calcTransformMatrix(),
        )

        this.maskRect.set({
          left: groupPoint.x,
          top: groupPoint.y,
          width,
          height,
        })
        this.fabricCanvas.maskGroup.dirty = true
      }
    }
    else {
      // 创建 selectionRect（直接添加到 canvas）
      this.selectionRect = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: 'transparent',
        stroke: '#409EFF',
        strokeWidth: 1,
        originX: 'left',
        originY: 'top',
        selectable: false,
        hasBorders: false,
        evented: false,
        strokeUniform: true,
        objectCaching: false,
      })
      this.canvas.add(this.selectionRect)

      // 创建 maskRect（添加到 maskGroup，用于镂空）
      if (this.fabricCanvas.maskGroup) {
        const groupPoint = fabric.util.sendPointToPlane(
          new fabric.Point(left, top),
          undefined,
          this.fabricCanvas.maskGroup.calcTransformMatrix(),
        )

        this.maskRect = new fabric.Rect({
          left: groupPoint.x,
          top: groupPoint.y,
          width,
          height,
          fill: 'black',
          originX: 'left',
          originY: 'top',
          globalCompositeOperation: 'destination-out',
          selectable: false,
          hasBorders: false,
          evented: false,
        })
        this.fabricCanvas.maskGroup.add(this.maskRect)
        this.fabricCanvas.maskGroup.dirty = true
      }
    }

    this.canvas.renderAll()
  }

  private handleMouseUp(e: fabric.TPointerEventInfo) {
    if (!this.isDrawing)
      return

    // 只允许鼠标左键松开
    const mouseEvent = e.e as MouseEvent
    if (mouseEvent?.button !== 0)
      return

    this.isDrawing = false

    if (this.selectionRect) {
      this.selectionRect.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: false,
        lockRotation: true,
        lockUniScaling: false,
        borderColor: '#409EFF',
        borderScaleFactor: 1,
        cornerColor: '#409EFF',
        cornerStrokeColor: '#409EFF',
        cornerSize: 8,
        transparentCorners: false,
        cornerStyle: 'circle',
        strokeUniform: true,
        objectCaching: false,
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

      // 监听 selectionRect 的修改事件，同步到 maskRect
      this.selectionRect.on('modified', this.boundHandleSelectionModified)
      this.selectionRect.on('moving', this.boundHandleSelectionModified)
      this.selectionRect.on('scaling', this.boundHandleSelectionModified)

      this.canvas.setActiveObject(this.selectionRect)
    }

    this.canvas.renderAll()
  }

  private handleSelectionModified() {
    if (!this.selectionRect || !this.maskRect || !this.fabricCanvas.maskGroup)
      return

    const boundingRect = this.selectionRect.getBoundingRect()
    const left = boundingRect.left
    const top = boundingRect.top
    const width = boundingRect.width - 1
    const height = boundingRect.height - 1

    // 将画布坐标转换为相对于 maskGroup 的坐标
    const groupPoint = fabric.util.sendPointToPlane(
      new fabric.Point(left, top),
      undefined,
      this.fabricCanvas.maskGroup.calcTransformMatrix(),
    )

    // 同步更新 maskRect
    this.maskRect.set({
      left: groupPoint.x,
      top: groupPoint.y,
      width,
      height,
    })

    this.fabricCanvas.maskGroup.dirty = true
    this.canvas.renderAll()
  }

  private clearSelection() {
    // 移除 selectionRect 的事件监听
    if (this.selectionRect) {
      this.selectionRect.off('modified', this.boundHandleSelectionModified)
      this.selectionRect.off('moving', this.boundHandleSelectionModified)
      this.selectionRect.off('scaling', this.boundHandleSelectionModified)
    }

    // 从 canvas 移除 selectionRect
    if (this.selectionRect) {
      this.canvas.remove(this.selectionRect)
      this.selectionRect = null
    }

    // 从 maskGroup 移除 maskRect
    if (this.maskRect && this.fabricCanvas.maskGroup) {
      this.fabricCanvas.maskGroup.remove(this.maskRect)
      this.maskRect = null
      this.fabricCanvas.maskGroup.dirty = true
    }
  }

  getShortcutKey(): string {
    return '1'
  }
}
