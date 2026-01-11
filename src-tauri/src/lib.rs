pub mod screenshot;
pub mod utils;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn capture_screenshot() -> Result<String, String> {
    use crate::screenshot::create_screenshot;
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine as _;
    
    let screenshot = create_screenshot();
    
    // 直接获取图像数据并返回 base64
    // 因为 Tauri v2 的资源访问权限比较复杂，使用 base64 更可靠
    match screenshot.capture_screen() {
        Ok(image_data) => {
            println!("Screenshot captured successfully, size: {} bytes", image_data.len());
            let base64_image = STANDARD.encode(&image_data);
            // 返回完整的 data URI
            Ok(format!("data:image/png;base64,{}", base64_image))
        }
        Err(e) => {
            eprintln!("Failed to capture screenshot: {}", e);
            Err(format!("截图失败: {}", e))
        }
    }
}

#[tauri::command]
async fn create_overlay_window(app: tauri::AppHandle) -> Result<(), String> {
    // 如果已存在 overlay 窗口，则聚焦并返回，避免重复创建导致多个 webkitwebprocess
    if let Some(win) = app.get_webview_window("overlay") {
        let res: Result<(), tauri::Error> = win.set_focus();
        if let Err(e) = res {
            eprintln!("Failed to focus overlay window: {}", e);
        }
        return Ok(());
    }

    let _window = tauri::webview::WebviewWindowBuilder::new(
        &app,
        "overlay",
        tauri::WebviewUrl::App("/#/overlay".into()),
    )
    // TODO: 添加窗口大小
    .title("dsnap-overlay")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .fullscreen(true)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            capture_screenshot,
            create_overlay_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
