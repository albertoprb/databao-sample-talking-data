// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_mic_recorder::init())
        .setup(|_app| {
            // Only spawn sidecar in release mode
            // In dev mode, run the backend manually with hot reload:
            // cd backend && uv run dev
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_shell::ShellExt;
                use tauri_plugin_shell::process::CommandEvent;
                
                println!("Starting backend sidecar...");
                let shell = _app.shell();
                let sidecar_command = shell.sidecar("backend").map_err(|e| {
                    eprintln!("Failed to create sidecar command: {}", e);
                    e.to_string()
                })?;
                
                let (mut rx, _child) = sidecar_command
                    .args(["--port", "8808"])
                    .spawn()
                    .map_err(|e| {
                        eprintln!("Failed to spawn sidecar: {}", e);
                        e.to_string()
                    })?;
                
                // Log sidecar output in a separate thread
                std::thread::spawn(move || {
                    while let Some(event) = rx.blocking_recv() {
                        match event {
                            CommandEvent::Stdout(line) => {
                                println!("[backend stdout] {}", String::from_utf8_lossy(&line));
                            }
                            CommandEvent::Stderr(line) => {
                                eprintln!("[backend stderr] {}", String::from_utf8_lossy(&line));
                            }
                            CommandEvent::Terminated(payload) => {
                                eprintln!("[backend] Process terminated with code: {:?}", payload.code);
                            }
                            _ => {}
                        }
                    }
                });
                
                println!("Backend sidecar started successfully");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
