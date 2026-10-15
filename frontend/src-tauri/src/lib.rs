use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, RunEvent, State};
use tokio::time::sleep;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const OLLAMA_TAGS_URL: &str = "http://127.0.0.1:11434/api/tags";
const GEMMA_MODEL: &str = "gemma3:4b";
const DESKTOP_SETTINGS: &str = "desktop.json";
const DEFAULT_RELEASES: &str = "https://github.com/hacktoberfest26/quoteflow/releases";

enum BackendProcess {
    Python(Child),
    Sidecar(CommandChild),
}


struct RuntimeState {
    backend: Mutex<Option<BackendProcess>>,
    ollama_serve: Mutex<Option<Child>>,
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self {
            backend: Mutex::new(None),
            ollama_serve: Mutex::new(None),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct DesktopSettings {
    use_online_mode: bool,
}

#[derive(Debug, Serialize)]
pub struct AiStatus {
    pub ollama_on_path: bool,
    pub api_reachable: bool,
    pub has_gemma3_4b: bool,
}

#[derive(Clone, Serialize)]
struct PullProgress {
    message: String,
    percent: Option<f32>,
}

fn quoteflow_data_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or_else(|| "Could not resolve APPDATA".to_string())?;
    Ok(base.join("QuoteFlow"))
}

fn settings_path() -> Result<PathBuf, String> {
    let dir = quoteflow_data_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(DESKTOP_SETTINGS))
}

fn read_settings() -> DesktopSettings {
    let path = match settings_path() {
        Ok(p) => p,
        Err(_) => return DesktopSettings::default(),
    };
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_settings(settings: &DesktopSettings) -> Result<(), String> {
    let path = settings_path()?;
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

fn backend_dev_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../backend")
}

fn ollama_on_path() -> bool {
    Command::new("ollama")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn spawn_python_backend(data_dir: &Path, backend_dir: &Path) -> Result<BackendProcess, String> {
    if !backend_dir.join("main.py").exists() {
        return Err(format!("Backend not found at {}", backend_dir.display()));
    }

    let data = data_dir.to_string_lossy().to_string();
    let mut last_err = String::from("No Python interpreter found (tried python, py)");

    for py in ["python", "py"] {
        match Command::new(py)
            .arg("main.py")
            .current_dir(backend_dir)
            .env("QUOTEFLOW_DATA_DIR", &data)
            .env("QUOTEFLOW_SEED", "0")
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => return Ok(BackendProcess::Python(child)),
            Err(e) => last_err = e.to_string(),
        }
    }

    Err(last_err)
}

fn try_spawn_sidecar(app: &AppHandle, data_dir: &Path) -> Result<BackendProcess, String> {
    let data = data_dir.to_string_lossy().to_string();
    let sidecar = app
        .shell()
        .sidecar("quoteflow-api")
        .map_err(|e| e.to_string())?;
    let (_rx, child) = sidecar
        .env("QUOTEFLOW_DATA_DIR", data)
        .env("QUOTEFLOW_SEED", "0")
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(BackendProcess::Sidecar(child))
}

fn start_backend(app: &AppHandle) -> Result<(), String> {
    let data_dir = quoteflow_data_dir()?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let backend = if cfg!(debug_assertions) {
        spawn_python_backend(&data_dir, &backend_dev_dir())?
    } else {
        match try_spawn_sidecar(app, &data_dir) {
            Ok(b) => b,
            Err(_) => spawn_python_backend(&data_dir, &backend_dev_dir())?,
        }
    };

    if let Some(state) = app.try_state::<RuntimeState>() {
        *state.backend.lock().unwrap() = Some(backend);
    }
    Ok(())
}

fn kill_backend(state: &RuntimeState) {
    if let Some(proc) = state.backend.lock().unwrap().take() {
        match proc {
            BackendProcess::Python(mut c) => {
                let _ = c.kill();
                let _ = c.wait();
            }
            BackendProcess::Sidecar(c) => {
                let _ = c.kill();
            }
        }
    }
}

fn kill_ollama(state: &RuntimeState) {
    if let Some(mut child) = state.ollama_serve.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

async fn ollama_tags_reachable() -> bool {
    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
    else {
        return false;
    };
    client
        .get(OLLAMA_TAGS_URL)
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

async fn ollama_has_gemma() -> bool {
    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
    else {
        return false;
    };
    let Ok(resp) = client.get(OLLAMA_TAGS_URL).send().await else {
        return false;
    };
    if !resp.status().is_success() {
        return false;
    }
    let Ok(body) = resp.json::<serde_json::Value>().await else {
        return false;
    };
    body.get("models")
        .and_then(|m| m.as_array())
        .map(|models| {
            models.iter().any(|m| {
                m.get("name")
                    .and_then(|n| n.as_str())
                    .map(|n| n.starts_with(GEMMA_MODEL))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn start_ollama_serve(state: &State<'_, RuntimeState>) -> Result<(), String> {
    if !ollama_on_path() {
        return Err("Ollama is not installed or not on PATH".into());
    }
    let mut guard = state.ollama_serve.lock().unwrap();
    if guard.is_some() {
        return Ok(());
    }
    let child = Command::new("ollama")
        .arg("serve")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    *guard = Some(child);
    Ok(())
}

#[tauri::command]
fn get_data_dir() -> Result<String, String> {
    Ok(quoteflow_data_dir()?.to_string_lossy().to_string())
}

#[tauri::command]
async fn ai_status() -> Result<AiStatus, String> {
    let on_path = ollama_on_path();
    let api_reachable = ollama_tags_reachable().await;
    let has_gemma3_4b = if api_reachable {
        ollama_has_gemma().await
    } else {
        false
    };
    Ok(AiStatus {
        ollama_on_path: on_path,
        api_reachable,
        has_gemma3_4b,
    })
}

#[tauri::command]
fn get_use_online_mode() -> Result<bool, String> {
    Ok(read_settings().use_online_mode)
}

#[tauri::command]
fn set_use_online_mode(enabled: bool) -> Result<(), String> {
    let mut s = read_settings();
    s.use_online_mode = enabled;
    write_settings(&s)
}

#[tauri::command]
async fn open_releases(app: AppHandle, url: Option<String>) -> Result<(), String> {
    let target = url
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_RELEASES.to_string());
    app.opener()
        .open_url(&target, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn ensure_ai(app: AppHandle, state: State<'_, RuntimeState>) -> Result<(), String> {
    if read_settings().use_online_mode {
        return Ok(());
    }

    if !ollama_on_path() {
        return Err("Ollama not found. Install from https://ollama.com".into());
    }

    if !ollama_tags_reachable().await {
        start_ollama_serve(&state)?;
        for _ in 0..40 {
            if ollama_tags_reachable().await {
                break;
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    if !ollama_tags_reachable().await {
        return Err("Ollama API did not become reachable".into());
    }

    if ollama_has_gemma().await {
        let _ = app.emit(
            "ai-pull-progress",
            PullProgress {
                message: "Model already installed".into(),
                percent: Some(100.0),
            },
        );
        return Ok(());
    }

    let _ = app.emit(
        "ai-pull-progress",
        PullProgress {
            message: format!("Pulling {GEMMA_MODEL}…"),
            percent: None,
        },
    );

    let mut child = Command::new("ollama")
        .args(["pull", GEMMA_MODEL])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    if let Some(out) = stdout {
        let app_clone = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines().map_while(Result::ok) {
                let pct = parse_pull_percent(&line);
                let _ = app_clone.emit(
                    "ai-pull-progress",
                    PullProgress {
                        message: line.clone(),
                        percent: pct,
                    },
                );
            }
        });
    }

    if let Some(err) = stderr {
        let app_clone = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().map_while(Result::ok) {
                let pct = parse_pull_percent(&line);
                let _ = app_clone.emit(
                    "ai-pull-progress",
                    PullProgress {
                        message: line,
                        percent: pct,
                    },
                );
            }
        });
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("ollama pull failed".into());
    }

    let _ = app.emit(
        "ai-pull-progress",
        PullProgress {
            message: "Model ready".into(),
            percent: Some(100.0),
        },
    );
    Ok(())
}

fn parse_pull_percent(line: &str) -> Option<f32> {
    if let Some(idx) = line.find('%') {
        let slice = line[..idx].trim();
        if let Some(num) = slice.split_whitespace().last() {
            if let Ok(v) = num.trim_end_matches('%').parse::<f32>() {
                return Some(v);
            }
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(RuntimeState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            start_backend(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_data_dir,
            ai_status,
            ensure_ai,
            get_use_online_mode,
            set_use_online_mode,
            open_releases,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if matches!(event, RunEvent::ExitRequested { .. }) {
                if let Some(state) = app.try_state::<RuntimeState>() {
                    kill_backend(&state);
                    kill_ollama(&state);
                }
            }
        });
}
