pub mod commands;

use commands::terminal::TerminalSessions;
use commands::agent::AgentManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .manage(TerminalSessions::default())
        .setup(|app| {
            app.manage(AgentManager::new(app.handle()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::get_app_version,
            commands::files::read_directory,
            commands::files::read_text_file,
            commands::files::write_text_file,
            commands::files::open_folder_dialog,
            commands::files::set_window_title,
            commands::files::notify,
            commands::terminal::list_shells,
            commands::terminal::spawn_terminal,
            commands::terminal::write_terminal,
            commands::terminal::kill_terminal,
            commands::git::git_status,
            commands::git::git_log,
            commands::git::git_branches,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_checkout,
            commands::git::git_commit,
            commands::git::git_pull,
            commands::git::git_push,
            commands::git::git_merge,
            commands::git::git_init,
            commands::workspace::list_workspaces,
            commands::workspace::save_workspace,
            commands::workspace::delete_workspace,
            commands::workspace::recent_workspaces,
            commands::workspace::record_recent,
            commands::workspace::remove_recent,
            commands::workspace::workspace_sessions,
            commands::workspace::save_session,
            commands::workspace::delete_session,
            commands::workspace::workspace_memory,
            commands::workspace::save_memory,
            commands::workspace::workspace_settings,
            commands::workspace::save_workspace_settings,
            commands::workspace::workspace_templates,
            commands::workspace::add_project,
            commands::workspace::create_from_template,
            commands::ai::ai_list_models,
            commands::ai::ai_save_model,
            commands::ai::ai_delete_model,
            commands::ai::ai_list_credentials,
            commands::ai::ai_save_credential,
            commands::ai::ai_delete_credential,
            commands::ai::ai_list_conversations,
            commands::ai::ai_save_conversation,
            commands::ai::ai_delete_conversation,
            commands::ai::ai_chat_stream,
            commands::ai::ai_list_templates,
            commands::ai::ai_save_template,
            commands::ai::ai_delete_template,
            commands::agent::agent_list_agents,
            commands::agent::agent_save_agent,
            commands::agent::agent_delete_agent,
            commands::agent::agent_list_instances,
            commands::agent::agent_start,
            commands::agent::agent_stop,
            commands::agent::agent_pause,
            commands::agent::agent_resume,
            commands::agent::agent_send_message,
            commands::agent::agent_broadcast,
            commands::agent::agent_list_messages,
            commands::agent::agent_schedule_task,
            commands::agent::agent_list_schedules,
            commands::agent::agent_cancel_schedule,
            commands::agent::agent_run_schedule,
            commands::agent::agent_get_memory,
            commands::agent::agent_save_memory,
            commands::agent::agent_delete_memory,
            commands::agent::agent_start_background,
            commands::agent::agent_list_background,
            commands::agent::agent_get_metrics,
            commands::agent::agent_get_all_metrics
        ])
        .run(tauri::generate_context!())
        .expect("error while running Zentrail IDE");
}
