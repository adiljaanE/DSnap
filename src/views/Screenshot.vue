<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

const img = ref<string>('')

async function capture() {
  try {
    const result = await invoke<string>('capture_screenshot')
    // 直接使用返回的 base64 data URI
    img.value = result
  }
  catch (error) {
    console.error('截图失败:', error)
  }
}

async function createOverlay() {
  try {
    await invoke('create_overlay_window')
  }
  catch (error) {
    console.error('Failed to create overlay window:', error)
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">
      Screenshot
    </h1>
    <div class="flex gap-2">
      <button class="rounded bg-gray-700 px-3 py-1 text-white" @click="capture">
        重新截图
      </button>
      <button class="rounded bg-gray-700 px-3 py-1 text-white" @click="createOverlay">
        贴图
      </button>
      <RouterLink to="/" class="text-blue-500 underline">
        返回首页
      </RouterLink>
    </div>
    <div>
      <img v-if="img" :src="img" alt="screenshot" class="max-w-full border">
      <div v-else class="text-sm text-gray-400">
        正在获取截图...
      </div>
    </div>
  </div>
</template>
