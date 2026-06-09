export const isTauri = typeof window !== "undefined" && !!(window as { __TAURI__?: unknown }).__TAURI__;
