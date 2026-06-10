use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

mod backend;

use backend::BackendManager;

#[tauri::command]
async fn start_backend(
    state: tauri::State<'_, Arc<Mutex<BackendManager>>>,
    app: tauri::AppHandle,
    port: Option<u16>,
) -> Result<String, String> {
    let mut mgr = state.lock().await;
    mgr.start(&app, port).await
}

#[tauri::command]
async fn stop_backend(
    state: tauri::State<'_, Arc<Mutex<BackendManager>>>,
) -> Result<(), String> {
    let mut mgr = state.lock().await;
    mgr.stop().await
}

#[tauri::command]
async fn backend_status(
    state: tauri::State<'_, Arc<Mutex<BackendManager>>>,
) -> Result<backend::BackendStatus, String> {
    let mgr = state.lock().await;
    Ok(mgr.status())
}

#[tauri::command]
async fn get_backend_logs(
    state: tauri::State<'_, Arc<Mutex<BackendManager>>>,
) -> Result<Vec<String>, String> {
    let mgr = state.lock().await;
    Ok(mgr.get_logs())
}

#[tauri::command]
async fn restart_backend(
    state: tauri::State<'_, Arc<Mutex<BackendManager>>>,
    app: tauri::AppHandle,
    port: Option<u16>,
) -> Result<String, String> {
    let mut mgr = state.lock().await;
    mgr.restart(&app, port).await
}

#[tauri::command]
async fn read_env_file(app: tauri::AppHandle) -> Result<String, String> {
    let dir = BackendManager::resolve_backend_dir(&app)?;
    let env_path = dir.join(".env");
    if env_path.exists() {
        return std::fs::read_to_string(&env_path)
            .map_err(|e| format!("读取 .env 失败: {}", e));
    }

    let example = dir.join(".env.example");
    if example.exists() {
        return std::fs::read_to_string(&example)
            .map_err(|e| format!("读取 .env.example 失败: {}", e));
    }

    if let Some(content) = BackendManager::load_bundled_env_example(&app) {
        return Ok(BackendManager::strip_secret_from_template(&content));
    }

    Ok(String::new())
}

#[tauri::command]
async fn write_env_file(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let dir = BackendManager::resolve_backend_dir(&app)?;
    let env_path = dir.join(".env");
    std::fs::write(&env_path, content)
        .map_err(|e| format!("写入 .env 失败: {}", e))
}

#[tauri::command]
async fn check_health(url: String) -> Result<bool, String> {
    let health_url = format!("{}/health", url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .no_proxy()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    match client.get(&health_url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(e) => Err(format!("Health check failed ({}): {}", health_url, e)),
    }
}

#[tauri::command]
async fn open_console(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("console") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(&app, "console", tauri::WebviewUrl::App("console.html".into()))
        .title("myai-novel - 控制台")
        .inner_size(720.0, 560.0)
        .min_inner_size(480.0, 360.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn run() {
    let backend_manager = Arc::new(Mutex::new(BackendManager::new()));
    let manager_clone = backend_manager.clone();

    tauri::Builder::default()
        .manage(backend_manager)
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            restart_backend,
            backend_status,
            get_backend_logs,
            read_env_file,
            write_env_file,
            check_health,
            open_console,
        ])
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() != "main" {
                    return;
                }
                let mgr = manager_clone.clone();
                tauri::async_runtime::spawn(async move {
                    let mut mgr = mgr.lock().await;
                    let _ = mgr.stop().await;
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
