// This file contains utility functions for the platform module.

pub fn detect_display_server() -> Result<DisplayServer, String> {
    // 检查环境变量
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        return Ok(DisplayServer::Wayland);
    }
    
    if std::env::var("DISPLAY").is_ok() {
        return Ok(DisplayServer::X11);
    }
    
    Err("No display server detected".to_string())
}

#[derive(Debug, Clone)]
pub enum DisplayServer {
    Wayland,
    X11,
}