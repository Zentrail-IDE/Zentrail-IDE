pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::get_app_version,
            commands::files::read_directory,
            commands::files::read_text_file,
            commands::files::write_text_file,
            commands::files::open_folder_dialog,
            commands::files::set_window_title,
            commands::files::notify
        ])
        .run(tauri::generate_context!())
        .expect("error while running Zentrail IDE");
}
