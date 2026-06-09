import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { formatApiErrorMessage } from "@/lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextPath = typeof location.state === "object" && location.state && "from" in location.state
    ? String((location.state as { from?: string }).from ?? "/app")
    : "/app";

  if (!isLoading && isAuthenticated) {
    return <Navigate to={nextPath || "/app"} replace />;
  }

  const submit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login({ email, password });
      navigate(nextPath || "/app", { replace: true });
    } catch (error) {
      setErrorMessage(formatApiErrorMessage(error, "登录失败"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-glow backdrop-blur">
        <h1 className="text-2xl font-semibold text-foreground">登录 WebUI</h1>
        <p className="mt-2 text-sm text-muted-foreground">使用你的账号进入多用户写作空间。</p>
        <div className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm text-muted-foreground">
            <span>邮箱</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary" type="email" autoComplete="email" />
          </label>
          <label className="block space-y-2 text-sm text-muted-foreground">
            <span>密码</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary" type="password" autoComplete="current-password" />
          </label>
          {errorMessage && <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>}
          <button onClick={submit} disabled={submitting || !email.trim() || !password} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {submitting ? "登录中..." : "登录"}
          </button>
        </div>
        <div className="mt-5 text-sm text-muted-foreground">
          还没有账号？ <Link to="/app/register" className="text-primary hover:underline">去注册</Link>
        </div>
      </div>
    </section>
  );
}
