# Linux 截图实现

本目录包含 Linux 平台的截图实现。

## Portal 实现（推荐）

`portal.rs` 使用 XDG Desktop Portal 实现截图功能，这是 Linux 上的标准方式。

### 特点

- **跨桌面环境**：同时支持 Wayland 和 X11
- **统一接口**：不需要检测显示服务器类型
- **安全性**：自动处理权限和安全性
- **交互式**：提供原生的交互式截图体验
- **兼容性好**：适用于 GNOME、KDE、Sway 等主流桌面环境

### 依赖

- `ashpd`: XDG Desktop Portal 的 Rust 绑定
- `tokio`: 异步运行时
- `url`: URL 解析

### 工作原理

1. 通过 `ashpd` 库调用 XDG Desktop Portal 的截图 API
2. Portal 显示原生的截图选择对话框
3. 用户交互式选择截图区域
4. Portal 返回保存的截图文件 URI
5. 读取文件内容并返回图像数据

### 使用方法

```rust
use crate::screenshot::create_screenshot;

let screenshot = create_screenshot();
let image_data = screenshot.capture_screen()?;
// image_data 包含 PNG 格式的截图数据
```

### 注意事项

- Portal 截图总是交互式的，用户需要手动选择区域
- `capture_area()` 方法会忽略预设的坐标参数
- 需要系统支持 XDG Desktop Portal（现代 Linux 发行版都支持）

## 其他实现

### Wayland 实现（`wayland.rs`）

直接使用 Wayland 协议的截图实现。

### X11 实现（`x11.rs`）

使用 X11 协议的截图实现。

---

**推荐使用 Portal 实现**，因为它提供了最好的兼容性和用户体验。
