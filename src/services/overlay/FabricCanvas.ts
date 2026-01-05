import type { Tools } from './tools/Tools'
import * as fabric from 'fabric'
import { KeyboardManager } from './KeyboardManager'
import { ArrowTool } from './tools/ArrowTool'
import { MaskTool } from './tools/MaskTool'
import { RectTool } from './tools/RectTool'

export class FabricCanvas {
  canvas: fabric.Canvas
  activeTools: any = null
  maskTool: MaskTool
  rectTool: RectTool
  arrowTool: ArrowTool
  maskOverlay: fabric.Rect | null = null
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
    this.maskTool = new MaskTool(this)
    this.rectTool = new RectTool(this)
    this.arrowTool = new ArrowTool(this)

    this.registerToolShortcut(this.maskTool)
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
        selectable: false, // 背景图片不可选中
      })

      this.canvas.add(fabricImg)
      this.canvas.renderAll()

      this.createMaskOverlay()
      this.maskTool.activate()
    })
  }

  createMaskOverlay() {
    this.maskOverlay = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      fill: 'rgba(0, 0, 0, 0.5)',
      selectable: false,
      evented: false,
    })
    this.canvas.add(this.maskOverlay)
    this.canvas.renderAll()
  }
}
