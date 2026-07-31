pub mod app;
pub mod commands;
pub mod error;
pub mod lifecycle;
pub mod rekey;
pub mod view;

use std::time::Duration;

use seal_registry::store::Store;
use tauri::{Manager, RunEvent};

use crate::commands::Held;

pub const SWEEP_INTERVAL: Duration = Duration::from_secs(30);

fn registry_directory() -> Option<std::path::PathBuf> {
    dirs_home().map(|home| home.join(".config").join("seal"))
}

fn dirs_home() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME").map(std::path::PathBuf::from)
}

pub fn run() {
    let Some(directory) = registry_directory() else {
        return;
    };

    let store = Store::new(directory);
    let state = store.load().unwrap_or_default();

    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
    #[cfg(feature = "e2e")]
    let builder = builder
        .plugin(tauri_plugin_wdio_webdriver::init())
        .plugin(tauri_plugin_wdio::init());

    let app = builder
        .invoke_handler(tauri::generate_handler![
            commands::unlock,
            commands::lock,
            commands::is_unlocked,
            commands::is_established,
            commands::establish,
            commands::pick_folder,
            commands::overview,
            commands::open_file,
            commands::reveal,
            commands::save,
            commands::seal_file,
            commands::close_file,
            commands::open_paths,
            commands::scan_folder,
            commands::import,
            commands::release,
            commands::seal_warning,
            commands::has_acknowledged,
            commands::acknowledge,
            commands::rekey_status,
            commands::rekey_begin,
            commands::rekey_run,
            commands::rekey_abandon,
        ])
        .setup(move |app| {
            app.manage(Held::new(store, state));

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tauri::async_runtime::spawn_blocking(|| std::thread::sleep(SWEEP_INTERVAL))
                        .await
                        .ok();
                    handle.state::<Held>().sweep();
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!());

    if let Ok(app) = app {
        app.run(|handle, event| {
            if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
                handle.state::<Held>().wipe();
            }
        });
    }
}
