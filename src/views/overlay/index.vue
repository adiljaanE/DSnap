<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted, onUnmounted, ref } from 'vue'
import { FabricCanvas } from '@/services/overlay/FabricCanvas'

const canvasRef = ref<HTMLCanvasElement>()
const currentWindow = WebviewWindow.getCurrent()
let fabricCanvas: FabricCanvas | null = null

onMounted(async () => {
  const result = await invoke<string>('capture_screenshot')
  fabricCanvas = new FabricCanvas(canvasRef.value!)
  fabricCanvas.loadBackgroundImage(result)
})

onUnmounted(() => {
  if (fabricCanvas) {
    fabricCanvas.keyboardManager.stopListening()
  }
})

function closeWindow() {
  currentWindow.close()
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeWindow()
  }
})
</script>

<template>
  <div class="size-screen overflow-hidden">
    <canvas ref="canvasRef" />
  </div>
</template>
