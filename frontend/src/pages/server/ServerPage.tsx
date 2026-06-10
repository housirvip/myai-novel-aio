import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { isTauri } from "@/lib/tauri";

const ANSI_FG: Record<string, string> = {
  "30": "text-slate-500", "31": "text-rose-400", "32": "text-emerald-400",
  "33": "text-amber-400", "34": "text-blue-400", "35": "text-purple-400",
  "36": "text-cyan-400", "37": "text-slate-200",
  "90": "text-slate-400", "91": "text-rose-300", "92": "text-emerald-300",
  "93": "text-amber-300", "94": "text-blue-300", "95": "text-purple-300",
  "96": "text-cyan-300", "97": "text-white",
};

function parseAnsiColor(params: string): string {
  if (!params || params === "0") return "";
  for (const p of params.split(";")) {
    if (ANSI_FG[p]) return ANSI_FG[p];
  }
  return "";
}

function renderAnsiText(text: string): ReactNode {
  const regex = /\x1b\[([\d;]*)m/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let currentClass = "";
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(currentClass ? <span key={lastIndex} className={currentClass}>{segment}</span> : segment);
    }
    currentClass = parseAnsiColor(match[1]);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    parts.push(currentClass ? <span key={lastIndex} className={currentClass}>{segment}</span> : segment);
  }

  return parts.length > 1 ? parts : parts[0] ?? text;
}

interface BackendStatus {
  running: boolean;
  url: string;
  pid: number | null;
}

function getTauri() {
  return (window as { __TAURI__?: { core: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }; event: { listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void> } } }).__TAURI__!;
}

export function ServerPage() {
  const [status, setStatus] = useState<BackendStatus>({ running: false, url: "", pid: null });
  const [logs, setLogs] = useState<{ id: number; text: string; isError: boolean }[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem("api-base-url") || "http://127.0.0.1:3030");
  const [envContent, setEnvContent] = useState("");
  const [envOriginal, setEnvOriginal] = useState("");
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaveMsg, setEnvSaveMsg] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  const envDirty = envContent !== envOriginal;

  const refreshStatus = useCallback(async () => {
    if (!isTauri) return;
    try {
      const s = (await getTauri().core.invoke("backend_status")) as BackendStatus;
      setStatus(s);
    } catch {}
  }, []);

  const loadEnvFile = useCallback(async () => {
    if (!isTauri) return;
    setEnvLoading(true);
    try {
      const content = (await getTauri().core.invoke("read_env_file")) as string;
      setEnvContent(content);
      setEnvOriginal(content);
      setEnvSaveMsg("");
    } catch (e) {
      setEnvSaveMsg(`加载失败: ${e}`);
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    refreshStatus();
    loadEnvFile();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus, loadEnvFile]);

  useEffect(() => {
    if (!isTauri) return;
    getTauri().core.invoke("get_backend_logs").then((existing) => {
      const lines = existing as string[];
      if (lines.length > 0) {
        setLogs(lines.map((text) => ({
          id: ++logIdRef.current,
          text,
          isError: text.startsWith("[ERR]"),
        })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    const unlisteners: Array<() => void> = [];

    getTauri().event.listen("backend-log", (event) => {
      const text = event.payload as string;
      const isError = text.startsWith("[ERR]");
      setLogs((prev) => {
        const next = [...prev, { id: ++logIdRef.current, text, isError }];
        return next.length > 5000 ? next.slice(-5000) : next;
      });
    }).then((fn) => unlisteners.push(fn));

    getTauri().event.listen("backend-status-changed", (event) => {
      setStatus(event.payload as BackendStatus);
    }).then((fn) => unlisteners.push(fn));

    return () => { unlisteners.forEach((fn) => fn()); };
  }, []);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      const viewport = logRef.current.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  async function handleStart() {
    setActionLoading(true);
    setActionError("");
    try {
      await getTauri().core.invoke("start_backend", { port: null });
    } catch (e) {
      setActionError(`启动失败: ${e}`);
    } finally {
      setActionLoading(false);
      refreshStatus();
    }
  }

  async function handleStop() {
    setActionLoading(true);
    setActionError("");
    try {
      await getTauri().core.invoke("stop_backend");
    } catch (e) {
      setActionError(`停止失败: ${e}`);
    } finally {
      setActionLoading(false);
      refreshStatus();
    }
  }

  async function handleRestart() {
    setActionLoading(true);
    setActionError("");
    try {
      await getTauri().core.invoke("restart_backend", { port: null });
    } catch (e) {
      setActionError(`重启失败: ${e}`);
    } finally {
      setActionLoading(false);
      refreshStatus();
    }
  }

  async function handleReconnect() {
    const target = backendUrl.trim().replace(/\/+$/, "");
    if (!target) return;
    setActionLoading(true);
    setActionError("");
    try {
      const ok = (await getTauri().core.invoke("check_health", { url: target })) as boolean;
      if (!ok) {
        setActionError("无法连接到后端，请确认地址正确且服务已启动");
        return;
      }
      localStorage.setItem("api-base-url", target);
      window.location.href = "/";
    } catch (e) {
      setActionError(`连接失败: ${e}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnvSave() {
    setEnvLoading(true);
    setEnvSaveMsg("");
    try {
      await getTauri().core.invoke("write_env_file", { content: envContent });
      setEnvOriginal(envContent);
      setEnvSaveMsg(status.running ? "配置已保存，重启后端后生效" : "配置已保存");
    } catch (e) {
      setEnvSaveMsg(`保存失败: ${e}`);
    } finally {
      setEnvLoading(false);
    }
  }

  if (!isTauri) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">服务端设置</h2>
          <p className="mt-1 text-sm text-muted-foreground">此功能仅在桌面客户端中可用。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">服务端设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">管理 Go 后端的启停、配置与实时日志</p>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground">后端状态</h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.running ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            <span className="text-sm font-medium text-foreground">{status.running ? "运行中" : "已停止"}</span>
          </div>

          {status.running && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted px-4 py-3">
                <div className="text-xs text-muted-foreground">地址</div>
                <div className="mt-1 text-sm font-medium text-foreground">{status.url || "—"}</div>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3">
                <div className="text-xs text-muted-foreground">PID</div>
                <div className="mt-1 text-sm font-medium text-foreground">{status.pid ?? "—"}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {status.running ? (
              <>
                <Button
                  type="button"
                  onClick={handleRestart}
                  disabled={actionLoading}
                  variant="secondary"
                >
                  重启后端
                </Button>
                <Button
                  type="button"
                  onClick={handleStop}
                  disabled={actionLoading}
                  variant="destructive"
                >
                  停止后端
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleStart}
                disabled={actionLoading}
              >
                启动后端
              </Button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <Field label="后端连接地址" htmlFor="backend-url">
              <div className="flex gap-2">
                <Input
                  id="backend-url"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReconnect()}
                  placeholder="http://127.0.0.1:3030"
                />
                <Button
                  type="button"
                  onClick={handleReconnect}
                  disabled={actionLoading}
                  variant="secondary"
                  className="shrink-0"
                >
                  重新连接
                </Button>
              </div>
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">环境配置</h3>
            <p className="mt-1 text-xs text-muted-foreground">编辑 Go 后端的 .env 配置文件</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={loadEnvFile}
              disabled={envLoading}
              variant="secondary"
              size="sm"
            >
              重新加载
            </Button>
            <Button
              type="button"
              onClick={handleEnvSave}
              disabled={envLoading || !envDirty}
              size="sm"
            >
              保存配置
            </Button>
          </div>
        </div>
        <Textarea
          value={envContent}
          onChange={(e) => { setEnvContent(e.target.value); setEnvSaveMsg(""); }}
          spellCheck={false}
          className="mt-4 h-[360px] resize-y font-mono text-xs leading-relaxed"
        />
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            SERVER_PORT、SERVER_HOST、CORS_ALLOWED_ORIGINS 由 Tauri 管理，.env 中的值会被覆盖
          </p>
          {envSaveMsg && (
            <p className={`text-xs font-medium ${envSaveMsg.startsWith("配置已保存") ? "text-success" : "text-destructive"}`}>
              {envSaveMsg}
            </p>
          )}
          {envDirty && (
            <p className="text-xs text-warning">有未保存的修改</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">实时日志</h3>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoScroll}
                onCheckedChange={(checked) => setAutoScroll(checked === true)}
              />
              自动滚动
            </label>
            <Button
              type="button"
              onClick={() => setLogs([])}
              variant="secondary"
              size="sm"
            >
              清空
            </Button>
          </div>
        </div>
        <ScrollArea
          ref={logRef}
          className="mt-4 h-[400px] rounded-lg border border-border bg-card text-card-foreground"
        >
          <div className="min-h-full p-4 font-mono text-xs leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">暂无日志，启动后端后将在此显示实时输出...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id}>
                  {renderAnsiText(log.text)}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </section>
  );
}
