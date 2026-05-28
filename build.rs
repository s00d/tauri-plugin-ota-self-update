const COMMANDS: &[&str] = &["set_channel", "check_for_updates", "apply_update"];

fn main() {
  tauri_plugin::Builder::new(COMMANDS).build();
}
