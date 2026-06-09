use serde::Serialize;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::{Arc, Mutex as StdMutex};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

const MAX_LOG_LINES: usize = 5000;

#[derive(Serialize, Clone)]
pub struct BackendStatus {
    pub running: bool,
    pub url: String,
    pub pid: Option<u32>,
}

pub struct BackendManager {
    child: Option<Child>,
    url: String,
    port: u16,
    logs: Arc<StdMutex<Vec<String>>>,
}

impl BackendManager {
    pub fn new() -> Self {
        Self {
            child: None,
            url: String::new(),
            port: 3030,
            logs: Arc::new(StdMutex::new(Vec::new())),
        }
    }

    pub fn get_logs(&self) -> Vec<String> {
        self.logs.lock().unwrap().clone()
    }

    pub fn status(&self) -> BackendStatus {
        BackendStatus {
            running: self.child.is_some(),
            url: self.url.clone(),
            pid: self.child.as_ref().and_then(|c| c.id()),
        }
    }

    pub fn find_server_binary(app: &AppHandle) -> Result<PathBuf, String> {
        let mut searched = Vec::new();

        if let Ok(dir) = app.path().resource_dir() {
            let bin = dir.join("binaries").join(server_bin_name());
            if bin.exists() {
                return Ok(bin);
            }
            searched.push(bin.display().to_string());
        }

        if let Some(dir) = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        {
            let bin = dir.join("binaries").join(server_bin_name());
            if bin.exists() {
                return Ok(bin);
            }
            searched.push(bin.display().to_string());
        }

        let dev_paths = [
            PathBuf::from("../backend/bin/server"),
            PathBuf::from("../../backend/bin/server"),
        ];
        for p in &dev_paths {
            let abs = std::fs::canonicalize(p).unwrap_or_else(|_| p.clone());
            searched.push(abs.display().to_string());
            if p.exists() {
                return Ok(p.clone());
            }
        }

        Err(format!(
            "Go 后端二进制未找到，请先运行 make build-backend。已搜索路径:\n  {}",
            searched.join("\n  ")
        ))
    }

    pub fn find_backend_dir(binary: &PathBuf) -> Option<PathBuf> {
        // binary is e.g. ../backend/bin/server → backend dir is ../backend
        if let Some(bin_dir) = binary.parent() {
            if let Some(backend_dir) = bin_dir.parent() {
                if backend_dir.join(".env").exists()
                    || backend_dir.join("cmd").exists()
                {
                    return Some(backend_dir.to_path_buf());
                }
            }
        }

        let candidates = [
            PathBuf::from("../backend"),
            PathBuf::from("../../backend"),
        ];
        for dir in &candidates {
            if dir.exists() && (dir.join(".env").exists() || dir.join("cmd").exists()) {
                return Some(dir.clone());
            }
        }

        None
    }

    pub async fn start(&mut self, app: &AppHandle, port: Option<u16>) -> Result<String, String> {
        if self.child.is_some() {
            return Err("Backend is already running".into());
        }

        let port = port.unwrap_or(3030);
        self.port = port;

        let binary = Self::find_server_binary(app)?;
        let backend_dir = Self::find_backend_dir(&binary);

        let mut cmd = Command::new(&binary);
        if let Some(ref dir) = backend_dir {
            cmd.current_dir(dir);
        }
        cmd.env("SERVER_PORT", port.to_string())
            .env("SERVER_HOST", "127.0.0.1")
            .env("CORS_ALLOWED_ORIGINS", "http://127.0.0.1:1420,http://localhost:1420")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = cmd.spawn().map_err(|e| {
            format!("Failed to start backend: {}. Binary: {}", e, binary.display())
        })?;

        self.url = format!("http://127.0.0.1:{}", port);
        self.logs.lock().unwrap().clear();

        let app_handle = app.clone();
        if let Some(stdout) = child.stdout.take() {
            let app_out = app_handle.clone();
            let logs = self.logs.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let formatted = format!("[OUT] {}", line);
                    {
                        let mut buf = logs.lock().unwrap();
                        buf.push(formatted.clone());
                        if buf.len() > MAX_LOG_LINES {
                            let drain = buf.len() - MAX_LOG_LINES;
                            buf.drain(..drain);
                        }
                    }
                    let _ = app_out.emit("backend-log", formatted);
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let app_err = app_handle;
            let logs = self.logs.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let formatted = format!("[ERR] {}", line);
                    {
                        let mut buf = logs.lock().unwrap();
                        buf.push(formatted.clone());
                        if buf.len() > MAX_LOG_LINES {
                            let drain = buf.len() - MAX_LOG_LINES;
                            buf.drain(..drain);
                        }
                    }
                    let _ = app_err.emit("backend-log", formatted);
                }
            });
        }

        self.child = Some(child);

        let _ = app.emit("backend-status-changed", self.status());

        Ok(self.url.clone())
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            #[cfg(unix)]
            {
                use std::process::Command as StdCommand;
                if let Some(pid) = child.id() {
                    let _ = StdCommand::new("kill")
                        .args(["-TERM", &pid.to_string()])
                        .output();

                    match tokio::time::timeout(
                        std::time::Duration::from_secs(5),
                        child.wait(),
                    )
                    .await
                    {
                        Ok(_) => {}
                        Err(_) => {
                            let _ = child.kill().await;
                        }
                    }
                } else {
                    let _ = child.kill().await;
                }
            }

            #[cfg(not(unix))]
            {
                let _ = child.kill().await;
            }

            self.url.clear();
        }
        Ok(())
    }

    pub async fn restart(&mut self, app: &AppHandle, port: Option<u16>) -> Result<String, String> {
        self.stop().await?;
        let _ = app.emit("backend-status-changed", self.status());
        self.start(app, port).await
    }

    pub fn resolve_backend_dir(app: &AppHandle) -> Result<PathBuf, String> {
        let binary = Self::find_server_binary(app)?;
        Self::find_backend_dir(&binary)
            .ok_or_else(|| "无法找到 backend 目录".into())
    }
}

fn server_bin_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "server.exe"
    } else {
        "server"
    }
}
