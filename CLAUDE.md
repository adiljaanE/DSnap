# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

DSnap 是一个基于 Tauri 2 + Vue 3 的跨平台截图应用，专注于 Linux 平台支持。使用 Rust 后端处理截图逻辑，Vue 3 前端提供用户界面和图像编辑功能。

## 开发命令

```bash
# 安装依赖
pnpm install

# 前端开发
pnpm dev                    # 启动 Vite 开发服务器（端口 1420）

# Tauri 开发
pnpm tauri dev              # 启动完整的 Tauri 应用（需要设置 __NV_DISABLE_EXPLICIT_SYNC=1）

# 构建
pnpm build                  # 构建前端（TypeScript 检查 + Vite 构建）
pnpm tauri build            # 构建完整应用

# 代码检查
pnpm lint                   # 运行 ESLint
pnpm lint:fix               # 自动修复 ESLint 问题
pnpm lint:style             # 检查样式（Stylelint）
pnpm fix:style              # 自动修复样式问题
```

## 架构要点

### Rust 后端（src-tauri/）

**截图模块设计**：
- `screenshot/mod.rs` 定义 `Screenshot` trait 和工厂函数 `create_screenshot()`
- `screenshot/linux/portal.rs` 实现 XDG Desktop Portal 截图（当前唯一完整实现）
- Portal 实现使用 `ashpd` 库，支持 Wayland 和 X11，无需用户确认即可全屏截图
- 异步实现使用 `tokio::task::block_in_place` 在 Tauri 的异步环境中执行

**Tauri 命令**：
- `capture_screenshot()` - 返回 base64 编码的 PNG 图像（data URI 格式）
- `create_overlay_window()` - 创建全屏透明覆盖窗口用于图像标注
- `greet(name)` - 示例命令

**关键依赖**：
- `ashpd 0.9` - XDG Desktop Portal 客户端
- `tokio` - 异步运行时
- `base64` - 图像编码

### Vue 3 前端（src/）

**自动化路由和布局**：
- 使用 `vite-plugin-pages` 基于文件系统自动生成路由（`src/views/` 目录）
- 使用 `vite-plugin-vue-layouts` 自动应用布局（`src/layouts/` 目录）
- 路由元数据使用 YAML 格式定义在 Vue 文件的 `<route>` 块中

**页面流程**：
1. `views/Home.vue` - 首页
2. `views/Screenshot.vue` - 截图页面，调用 `capture_screenshot` 命令
3. `views/overlay/index.vue` - 覆盖层窗口，使用 Fabric.js 进行图像编辑

**关键技术**：
- Fabric.js 6.9.0 - Canvas 绘制库（`services/overlay/FabricCanvas.ts`）
- UnoCSS - 原子化 CSS
- VueUse - Vue 组合式工具库

### 前后端通信

使用 Tauri IPC：
```typescript
import { invoke } from '@tauri-apps/api/core'

// 截图
const dataUri = await invoke<string>('capture_screenshot')
// 返回: "data:image/png;base64,..."

// 创建覆盖窗口
await invoke('create_overlay_window')
```

## 重要注意事项

**Linux 环境变量**：
- 运行 Tauri 命令时需要设置 `__NV_DISABLE_EXPLICIT_SYNC=1`（已在 package.json 中配置）

**Vite 配置**：
- 开发服务器固定端口 1420（`strictPort: true`）
- HMR 端口 1421
- 路径别名 `@` 指向 `src/` 目录

**代码风格**：
- 使用 `@antfu/eslint-config` 配置
- 配置了 Git hooks（simple-git-hooks + lint-staged）
- 支持 Vue、TypeScript、SCSS 的代码检查

**截图实现状态**：
- ✅ XDG Desktop Portal 实现（完整）
- ⏳ Wayland 原生实现（占位符）
- ⏳ X11 原生实现（占位符）
