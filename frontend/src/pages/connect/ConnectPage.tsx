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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">连接后端服务</h1>
          <p className="mt-1 text-sm text-gray-500">
            配置 Go 后端地址以使用 API 服务
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="backend-url" className="block text-sm font-medium text-gray-700">
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
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleConnect}
                disabled={loading}
                className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                连接
              </button>
            </div>
          </div>

          {isTauri && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">或者</span>
                </div>
              </div>

              {backend.running ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    内嵌后端运行中{backend.pid ? ` (PID: ${backend.pid})` : ""}
                  </div>
                  <button
                    onClick={handleStopEmbedded}
                    className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    停止后端
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEmbedded}
                  disabled={loading}
                  className="w-full rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  启动内嵌后端
                </button>
              )}
            </>
          )}

          {status.type !== "idle" && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                status.type === "info"
                  ? "bg-blue-50 text-blue-700"
                  : status.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {status.text}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          {isTauri && (
            <button onClick={handleOpenConsole} className="text-gray-500 underline hover:text-indigo-600">
              打开控制台
            </button>
          )}
          <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 ml-auto">
            跳过（使用同源模式）
          </button>
        </div>
      </div>
    </div>
  );
}
