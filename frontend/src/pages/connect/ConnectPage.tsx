import { useEffect, useState } from "react";

import { isTauri } from "@/lib/tauri";

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
      event: {
        listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>;
      };
    };
  }
}

interface BackendStatus {
  running: boolean;
  url: string;
  pid: number | null;
}

export function ConnectPage() {
  const [url, setUrl] = useState(() => localStorage.getItem("api-base-url") || "http://127.0.0.1:3030");
  const [status, setStatus] = useState<{ type: "idle" | "info" | "success" | "error"; text: string }>({ type: "idle", text: "" });
  const [loading, setLoading] = useState(false);
  const [backend, setBackend] = useState<BackendStatus>({ running: false, url: "", pid: null });

  useEffect(() => {
    if (!isTauri) return;
    const poll = async () => {
      try {
        const s = (await window.__TAURI__!.core.invoke("backend_status")) as BackendStatus;
        setBackend(s);
        if (s.running && s.url) setUrl(s.url);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  async function checkHealth(targetUrl: string): Promise<{ ok: boolean; error?: string }> {
    try {
      if (isTauri) {
        const result = await window.__TAURI__!.core.invoke("check_health", { url: targetUrl });
        return { ok: result as boolean };
      }
      const resp = await fetch(`${targetUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return { ok: resp.ok };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  function goToApp(baseUrl: string) {
    localStorage.setItem("api-base-url", baseUrl);
    setStatus({ type: "success", text: "连接成功，正在跳转..." });
    setTimeout(() => { window.location.href = "/"; }, 300);
  }

  async function handleConnect() {
    const target = url.trim().replace(/\/+$/, "");
    if (!target) return;

    setLoading(true);
    setStatus({ type: "info", text: "正在检查后端连接..." });

    const result = await checkHealth(target);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error ? `连接失败: ${result.error}` : "无法连接到后端，请确认地址正确且服务已启动" });
      setLoading(false);
      return;
    }

    goToApp(target);
  }

  async function handleStartEmbedded() {
    if (!isTauri) return;
    setLoading(true);
    setStatus({ type: "info", text: "正在启动内嵌后端..." });

    try {
      const backendUrl = (await window.__TAURI__!.core.invoke("start_backend", { port: null })) as string;
      setUrl(backendUrl);
      setBackend({ running: true, url: backendUrl, pid: null });
      setStatus({ type: "info", text: "后端已启动，等待就绪..." });

      let retries = 0;
      const poll = async () => {
        retries++;
        const result = await checkHealth(backendUrl);
        if (result.ok) {
          goToApp(backendUrl);
          return;
        }
        if (retries < 30) {
          setTimeout(poll, 1000);
        } else {
          setStatus({ type: "error", text: "后端启动超时，请打开控制台查看日志" });
          setLoading(false);
        }
      };
      setTimeout(poll, 1500);
    } catch (e) {
      setStatus({ type: "error", text: `启动失败: ${e}` });
      setLoading(false);
    }
  }

  async function handleStopEmbedded() {
    if (!isTauri) return;
    setStatus({ type: "info", text: "正在停止后端..." });
    try {
      await window.__TAURI__!.core.invoke("stop_backend");
      setBackend({ running: false, url: "", pid: null });
      setStatus({ type: "idle", text: "" });
    } catch (e) {
      setStatus({ type: "error", text: `停止失败: ${e}` });
    }
  }

  function handleOpenConsole() {
    if (!isTauri) return;
    window.__TAURI__!.core.invoke("open_console");
  }

  function handleSkip() {
    localStorage.setItem("api-base-url", "");
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">连接后端服务</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            配置 Go 后端地址以使用 API 服务
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label htmlFor="backend-url" className="block text-sm font-medium text-foreground">
              后端地址
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="backend-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                placeholder="http://127.0.0.1:3030"
                disabled={loading}
                className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary disabled:opacity-50"
              />
              <button
                onClick={handleConnect}
                disabled={loading}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                连接
              </button>
            </div>
          </div>

          {isTauri && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">或者</span>
                </div>
              </div>

              {backend.running ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    内嵌后端运行中{backend.pid ? ` (PID: ${backend.pid})` : ""}
                  </div>
                  <button
                    onClick={handleStopEmbedded}
                    className="w-full rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
                  >
                    停止后端
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEmbedded}
                  disabled={loading}
                  className="w-full rounded-lg border border-primary/30 bg-card px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
                >
                  启动内嵌后端
                </button>
              )}
            </>
          )}

          {status.type !== "idle" && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                status.type === "info"
                  ? "bg-primary/10 text-primary"
                  : status.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              {status.text}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          {isTauri && (
            <button onClick={handleOpenConsole} className="text-muted-foreground underline hover:text-primary">
              打开控制台
            </button>
          )}
          <button onClick={handleSkip} className="ml-auto text-muted-foreground/60 hover:text-muted-foreground">
            跳过（使用同源模式）
          </button>
        </div>
      </div>
    </div>
  );
}
