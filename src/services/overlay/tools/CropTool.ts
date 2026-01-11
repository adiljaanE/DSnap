import type { FabricCanvas } from '../FabricCanvas'

import * as fabric from 'fabric'

import { MagnifierHelper } from '../MagnifierHelper'
import { Tools } from './Tools'

export class CropTool extends Tools {
  private selectionRect: fabric.Rect | null = null
  private maskRect: fabric.Rect | null = null
  private isDrawing = false
  private startX = 0
  private startY = 0
  private magnifier: MagnifierHelper | null = null

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
    // 设置鼠标指针为十字
    this.canvas.defaultCursor = 'crosshair'
    this.canvas.hoverCursor = 'crosshair'

    // 创建放大镜
    if (!this.magnifier) {
      this.magnifier = new MagnifierHelper(
        this.canvas,
        this.fabricCanvas.backgroundImageUrl || '',
        { radius: 80, borderColor: '#409EFF' },
      )
      this.magnifier.create()
      const bgInfo = this.getBackgroundInfo()
      if (bgInfo)
        this.magnifier.updateBackgroundInfo(bgInfo)
    }

    // 启用放大镜
    this.magnifier?.setEnabled(true)

    if (this.selectionRect) {
      this.selectionRect.set({
        selectable: true,
        evented: true,
      })
      this.canvas.setActiveObject(this.selectionRect)
      this.canvas.renderAll()
      this.setupSelectionRectEvents()
    }

    this.canvas.on('mouse:down', this.boundHandleMouseDown)
    this.canvas.on('mouse:move', this.boundHandleMouseMove)
    this.canvas.on('mouse:up', this.boundHandleMouseUp)
  }

  protected onDeactivate(): void {
    // 恢复默认鼠标指针
    this.canvas.defaultCursor = 'default'

    // 销毁放大镜
    this.magnifier?.destroy()
    this.magnifier = null

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

    const mouseEvent = e.e as MouseEvent
    if (mouseEvent?.button !== 0)
      return

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
      this.selectionRect.set({
        left,
        top,
        width,
        height,
      })

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

      this.selectionRect.on('modified', this.boundHandleSelectionModified)
      this.selectionRect.on('moving', this.boundHandleSelectionModified)
      this.selectionRect.on('scaling', this.boundHandleSelectionModified)

      this.setupSelectionRectEvents()

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
    this.canvas.renderAll()
  }

  private setupSelectionRectEvents(): void {
    if (!this.selectionRect)
      return

    this.selectionRect.off('mousedown', this.boundHandleMouseDown)
    this.selectionRect.off('mouseup', this.boundHandleMouseUp)

    // 拖动选择框时隐藏放大镜
    this.selectionRect.on('mousedown', () => {
      this.magnifier?.setEnabled(false)
    })

    // 拖动结束时显示放大镜
    this.selectionRect.on('mouseup', () => {
      this.magnifier?.setEnabled(true)
    })
  }

  private clearSelection() {
    if (this.selectionRect) {
      this.selectionRect.off('modified', this.boundHandleSelectionModified)
      this.selectionRect.off('moving', this.boundHandleSelectionModified)
      this.selectionRect.off('scaling', this.boundHandleSelectionModified)
      this.selectionRect.off('mousedown', this.boundHandleMouseDown)
      this.selectionRect.off('mouseup', this.boundHandleMouseUp)
    }

    if (this.selectionRect) {
      this.canvas.remove(this.selectionRect)
      this.selectionRect = null
    }

    if (this.maskRect && this.fabricCanvas.maskGroup) {
      this.fabricCanvas.maskGroup.remove(this.maskRect)
      this.maskRect = null
      this.fabricCanvas.maskGroup.dirty = true
    }
  }

  private getBackgroundInfo() {
    const objects = this.canvas.getObjects()
    const bgImage = objects.find(obj => obj instanceof fabric.FabricImage) as fabric.FabricImage
    if (!bgImage)
      return null

    return {
      bgLeft: bgImage.left || 0,
      bgTop: bgImage.top || 0,
      bgScale: bgImage.scaleX || 1,
      originalImageWidth: bgImage.width || 0,
      originalImageHeight: bgImage.height || 0,
    }
  }

  getShortcutKey(): string {
    return '1'
  }
}
