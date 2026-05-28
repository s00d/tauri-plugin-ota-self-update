// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/#commands
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();
    let (ota_plugin, context) = tauri_plugin_ota_self_update::init(context);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .plugin(ota_plugin)
        .run(context)
        .expect("error while running tauri application");
}
