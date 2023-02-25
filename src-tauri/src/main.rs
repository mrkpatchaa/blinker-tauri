#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

#[tauri::command]
fn set_menu_item(app_handle: tauri::AppHandle, id: &str, msg_type: &str) {
    let item_handle = app_handle.tray_handle().get_item(id);
    if "toggleTimer".eq(id) {
        println!("{}", msg_type);
        item_handle
            .set_title(if "activate".eq(msg_type) {
                "Stop the timer"
            } else {
                "Start the timer"
            })
            .unwrap()
    } else {
        item_handle.set_selected("activate".eq(msg_type)).unwrap();
    }
}
fn build_menu() -> SystemTrayMenu {
    SystemTrayMenu::new()
        .add_item(CustomMenuItem::new(
            "toggleTimer".to_string(),
            "Stop the timer",
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new(
            "launchOnStartup".to_string(),
            "Launch the application on system startup",
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new(
            "playSound".to_string(),
            "Play sounds with notifications",
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        // .add_item(CustomMenuItem::new("dynamic-item".to_string(), "Change me"))
        .add_item(CustomMenuItem::new(
            "showAbout".to_string(),
            "About Blinker",
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"))
}

fn main() {
    tauri::Builder::default()
        .system_tray(SystemTray::new().with_menu(build_menu()))
        // .on_system_tray_event(|app, event| match event {
        // SystemTrayEvent::LeftClick {
        //     position: _,
        //     size: _,
        //     ..
        // } => {
        //     println!("system tray received a left click");
        //     let w = app.get_window("main").unwrap();
        //     w.show().unwrap();
        //     w.set_focus().unwrap();
        // }
        // SystemTrayEvent::RightClick {
        //     position: _,
        //     size: _,
        //     ..
        // } => {
        //     println!("system tray received a right click");
        //     let w = app.get_window("main").unwrap();
        //     w.show().unwrap();
        //     w.set_focus().unwrap();
        // }
        //     SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
        //         "quit" => {
        //             std::process::exit(0);
        //         }
        //         "hide" => {
        //             let window = app.get_window("main").unwrap();
        //             window.hide().unwrap();
        //         }
        //         _ => {}
        //     },
        //     _ => {}
        // })
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                // get a handle to the clicked menu item
                // note that `tray_handle` can be called anywhere,
                // just get an `AppHandle` instance with `app.handle()` on the setup hook
                // and move it to another function or thread
                let item_handle = app.tray_handle().get_item(&id);
                app.emit_all(
                    "menu-item-click",
                    Payload {
                        message: id.clone(),
                    },
                )
                .unwrap();
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "showAbout" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // don't kill the app when the user clicks close. this is important
                event.window().hide().unwrap();
                api.prevent_close();
            }
            // tauri::WindowEvent::Focused(false) => {
            //     event.window().hide().unwrap();
            // }
            _ => {}
        })
        .setup(|app| {
            // don't show on the taskbar/springboard
            // #[cfg(target_os = "macos")]
            // app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app.get_window("main").unwrap();
            window.hide().unwrap();

            // this is a workaround for the window to always show in current workspace.
            // see https://github.com/tauri-apps/tauri/issues/2801
            // window.set_always_on_top(true).unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_menu_item])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        })
}
