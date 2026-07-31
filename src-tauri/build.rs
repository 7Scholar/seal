fn main() {
    let mut attributes = tauri_build::Attributes::new();
    if std::env::var_os("CARGO_FEATURE_E2E").is_some() {
        attributes = attributes.capabilities_path_pattern("./capabilities*/**/*");
    }
    if let Err(error) = tauri_build::try_build(attributes) {
        eprintln!("tauri-build failed: {error}");
        std::process::exit(1);
    }
}
