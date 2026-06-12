use std::env;
use std::fs;
use std::path::Path;
use std::path::PathBuf;

fn sync_resource(src: &Path, dest: &Path) {
    println!("cargo:rerun-if-changed={}", src.display());

    if !src.exists() {
        panic!(
            "required Tauri resource is missing: {}. Run `make build-backend` before building the desktop app.",
            src.display()
        );
    }

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).unwrap_or_else(|err| {
            panic!(
                "failed to create Tauri resource directory {}: {}",
                parent.display(),
                err
            )
        });
    }

    fs::copy(src, dest).unwrap_or_else(|err| {
        panic!(
            "failed to copy Tauri resource {} -> {}: {}",
            src.display(),
            dest.display(),
            err
        )
    });
}

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set by Cargo"));
    let backend_dir = manifest_dir.join("../backend");
    let tauri_binaries_dir = manifest_dir.join("binaries");
    let server_name = if cfg!(target_os = "windows") {
        "server.exe"
    } else {
        "server"
    };

    sync_resource(
        &backend_dir.join("bin").join(server_name),
        &tauri_binaries_dir.join(server_name),
    );
    sync_resource(
        &backend_dir.join(".env.example"),
        &tauri_binaries_dir.join(".env.example"),
    );

    tauri_build::build()
}
