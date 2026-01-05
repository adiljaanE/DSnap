// 定义截图错误类型
#[derive(Debug)]
pub struct ScreenshotError(String);

impl std::fmt::Display for ScreenshotError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Screenshot error: {}", self.0)
    }
}

// 定义截图 trait
pub trait Screenshot {
    fn capture_screen(&self) -> Result<Vec<u8>, ScreenshotError>;
    fn capture_area(
        &self,
        x: i32,
        y: i32,
        width: u32,
        height: u32,
    ) -> Result<Vec<u8>, ScreenshotError>;
    
    /// 捕获屏幕并返回文件路径（如果支持）
    fn capture_screen_to_file(&self) -> Result<String, ScreenshotError> {
        // 默认实现：不支持直接返回文件路径
        Err(ScreenshotError("此截图实现不支持直接返回文件路径".to_string()))
    }
}

// 声明linux模块
#[cfg(target_os = "linux")]
pub mod linux;

// 平台特定的实现选择
pub fn create_screenshot() -> Box<dyn Screenshot> {
    #[cfg(target_os = "linux")]
    {
        // 优先使用 XDG Desktop Portal 实现
        // 这是 Linux 上的标准方式，同时支持 Wayland 和 X11
        use crate::screenshot::linux::portal::PortalScreenshotImpl;
        return Box::new(PortalScreenshotImpl);
    }

    #[cfg(not(target_os = "linux"))]
    {
        panic!("当前平台不支持截图功能");
    }
}
