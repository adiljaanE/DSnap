use crate::screenshot::{Screenshot, ScreenshotError};
use ashpd::desktop::screenshot::Screenshot as PortalScreenshot;

/// 使用 XDG Desktop Portal 实现的截图
/// 
/// XDG Desktop Portal 是 Linux 桌面环境的标准接口，
/// 它提供了统一的截图 API，适用于：
/// - Wayland 桌面环境（GNOME、KDE、Sway 等）
/// - X11 桌面环境
/// 
/// 这种方式的优点：
/// 1. 不需要检测显示服务器类型
/// 2. 自动处理权限和安全性
/// 3. 直接全屏截图，无需用户确认
/// 4. 跨桌面环境兼容性好
pub struct PortalScreenshotImpl;

impl PortalScreenshotImpl {
    /// 异步截图实现
    /// 
    /// 使用 XDG Desktop Portal 的截图 API 进行截图
    /// - interactive: false - 直接全屏截图，无需用户确认
    /// - modal: false - 非模态窗口
    /// 
    /// 返回截图文件的路径
    async fn capture_async_path() -> Result<String, ScreenshotError> {
        let response = PortalScreenshot::request()
            .interactive(false) // 非交互式，直接全屏截图
            .modal(false)
            .send()
            .await
            .map_err(|e| ScreenshotError(format!("截图请求失败: {}", e)))?
            .response()
            .map_err(|e| ScreenshotError(format!("获取截图响应失败: {}", e)))?;

        let uri = response.uri();
        println!("截图 URI: {}", uri);

        // 将 URI 转换为文件路径字符串
        let path = uri
            .to_file_path()
            .map_err(|_| ScreenshotError(format!("无法将 URI 转换为文件路径: {}", uri)))?;
        
        let path_str = path
            .to_str()
            .ok_or_else(|| ScreenshotError("文件路径包含无效字符".to_string()))?
            .to_string();

        println!("截图文件路径: {}", path_str);
        Ok(path_str)
    }

    /// 异步截图实现（返回图像数据）
    /// 
    /// 用于需要图像数据的场景
    async fn capture_async() -> Result<Vec<u8>, ScreenshotError> {
        let response = PortalScreenshot::request()
            .interactive(false) // 非交互式，直接全屏截图
            .modal(false)
            .send()
            .await
            .map_err(|e| ScreenshotError(format!("截图请求失败: {}", e)))?
            .response()
            .map_err(|e| ScreenshotError(format!("获取截图响应失败: {}", e)))?;

        let uri = response.uri();
        println!("截图 URI: {}", uri);

        // 从 URI 读取图像数据
        let image_data = Self::read_image_from_uri(uri).await?;
        println!("截图数据长度: {}", image_data.len());

        Ok(image_data)
    }

    /// 从 URI 读取图像数据
    /// 
    /// Portal 返回的 URI 通常是 file:// 格式
    /// 需要解析并读取实际的文件内容
    async fn read_image_from_uri(uri: &url::Url) -> Result<Vec<u8>, ScreenshotError> {
        // 将 URL 转换为文件路径
        let path = uri
            .to_file_path()
            .map_err(|_| ScreenshotError(format!("无法将 URI 转换为文件路径: {}", uri)))?;

        // 读取文件
        tokio::fs::read(path)
            .await
            .map_err(|e| ScreenshotError(format!("读取截图文件失败: {}", e)))
    }
}

impl Screenshot for PortalScreenshotImpl {
    fn capture_screen(&self) -> Result<Vec<u8>, ScreenshotError> {
        // 使用 tokio::task::block_in_place 在现有运行时中阻塞执行异步代码
        // 这样可以在 Tauri 的异步环境中正确执行
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(Self::capture_async())
        })
    }
    
    fn capture_screen_to_file(&self) -> Result<String, ScreenshotError> {
        // 返回截图文件路径，性能更好
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(Self::capture_async_path())
        })
    }

    fn capture_area(
        &self,
        _x: i32,
        _y: i32,
        _width: u32,
        _height: u32,
    ) -> Result<Vec<u8>, ScreenshotError> {
        // XDG Desktop Portal 的截图 API 不支持直接指定区域
        // 它总是通过交互式的方式让用户选择区域
        // 因此这里我们使用相同的实现
        // 
        // 注意：用户可以在 portal 对话框中自由选择任意区域
        println!("注意: Portal 截图将忽略预设区域参数，使用交互式选择");
        self.capture_screen()
    }
}
