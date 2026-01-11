import type { Tools } from './tools/Tools'
import * as fabric from 'fabric'
import { KeyboardManager } from './KeyboardManager'
import { ArrowTool } from './tools/ArrowTool'
import { CropTool } from './tools/CropTool'
import { RectTool } from './tools/RectTool'

export class FabricCanvas {
  canvas: fabric.Canvas
  activeTools: any = null
  cropTool: CropTool
  rectTool: RectTool
  arrowTool: ArrowTool
  maskGroup: fabric.Group | null = null
  keyboardManager: KeyboardManager

  constructor(canvas: HTMLCanvasElement) {
    const height = window.innerHeight
    const width = window.innerWidth
    this.canvas = new fabric.Canvas(canvas, {
      selection: false,
      uniformScaling: false,
      width,
      height,
    })
    this.keyboardManager = new KeyboardManager()
    this.cropTool = new CropTool(this)
    this.rectTool = new RectTool(this)
    this.arrowTool = new ArrowTool(this)

    this.registerToolShortcut(this.cropTool)
    this.registerToolShortcut(this.rectTool)
    this.registerToolShortcut(this.arrowTool)

    this.keyboardManager.startListening()
  }

  private registerToolShortcut(tool: Tools): void {
    const key = tool.getShortcutKey()
    if (key) {
      this.keyboardManager.register(key, () => {
        this.switchToTool(tool)
      })
    }
  }

  private switchToTool(tool: Tools): void {
    if (this.activeTools && this.activeTools !== tool) {
      this.activeTools.deactivate()
    }
    tool.activate()
  }

  loadBackgroundImage(imgUrl: string) {
    const height = window.innerHeight
    const width = window.innerWidth
    fabric.FabricImage.fromURL(imgUrl).then((fabricImg) => {
      // 缩放图片以适应画布
      const scaleX = width / fabricImg.width!
      const scaleY = height / fabricImg.height!
      const scale = Math.min(scaleX, scaleY)

      fabricImg.scale(scale)
      fabricImg.set({
        left: (width - fabricImg.width! * scale) / 2,
        top: (height - fabricImg.height! * scale) / 2,
        originX: 'left',
        originY: 'top',
        selectable: false, // 背景图片不可选中
      })

      this.canvas.add(fabricImg)
      this.canvas.renderAll()

      this.createMaskOverlay()
      this.cropTool.activate()
    })
  }

  createMaskOverlay() {
    const maskRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      fill: 'rgba(0, 0, 0, 0.5)',
      originX: 'left',
      originY: 'top',
    })

    this.maskGroup = new fabric.Group([maskRect], {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: true,
    })

    this.canvas.add(this.maskGroup)
    this.canvas.renderAll()
  }

  dispose(): void {
    // 停止键盘监听
    try {
      this.keyboardManager.stopListening()
    }
    catch (e) {
      console.error('Error stopping keyboard manager', e)
    }

    // 取消激活当前工具
    if (this.activeTools && typeof (this.activeTools.deactivate) === 'function') {
      try {
        this.activeTools.deactivate()
      }
      catch (e) {
        console.error('Error deactivating tool', e)
      }
      this.activeTools = null
    }

    // 清理 fabric 画布资源
    try {
      this.canvas.dispose()
    }
    catch (e) {
      console.error('Error disposing fabric canvas', e)
    }

    // 删除 mask 组引用
    this.maskGroup = null
  }
}
