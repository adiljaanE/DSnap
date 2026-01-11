<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted, onUnmounted, ref } from 'vue'
import { FabricCanvas } from '@/services/overlay/FabricCanvas'

const canvasRef = ref<HTMLCanvasElement>()
const currentWindow = WebviewWindow.getCurrent()
let fabricCanvas: FabricCanvas | null = null

function closeWindow() {
  currentWindow.close()
}

function _escapeKeyHandler(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeWindow()
  }
}

onMounted(async () => {
  const result = await invoke<string>('capture_screenshot')
  fabricCanvas = new FabricCanvas(canvasRef.value!)
  fabricCanvas.loadBackgroundImage(result)
  // 注册 Esc 关闭监听
  document.addEventListener('keydown', _escapeKeyHandler)
})

onUnmounted(() => {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }
  // 移除之前注册的 Esc 监听，防止内存泄漏
  document.removeEventListener('keydown', _escapeKeyHandler)
})
</script>

<template>
  <div class="size-screen overflow-hidden">
    <canvas ref="canvasRef" />
  </div>
</template>
