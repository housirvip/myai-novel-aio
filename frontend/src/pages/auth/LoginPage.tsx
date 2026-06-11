import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/app/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatApiErrorMessage } from "@/lib/api";

const appIconUrl = `${import.meta.env.BASE_URL}app-icon.png`;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <section className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel — desktop */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-accent/60">
        <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-white/10 blur-[100px] animate-float" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-accent/20 blur-[80px] animate-float-slow" />
        <div className="pointer-events-none absolute top-1/4 right-1/4 h-48 w-48 rounded-full bg-white/5 blur-[60px] animate-float-slower" />

        <div className="relative z-10 flex flex-col items-center px-8 text-center">
          <img src={appIconUrl} alt="AI 小说工作台" className="h-20 w-20 rounded-2xl shadow-glow-lg" />
          <h1 className="mt-6 text-3xl font-bold text-primary-foreground">AI 小说工作台</h1>
          <p className="mt-2 max-w-xs text-primary-foreground/70">多用户 AI 协同写作平台，让创作更自由。</p>
        </div>
      </div>

      {/* Brand strip — mobile */}
      <div className="flex lg:hidden flex-col items-center gap-3 bg-gradient-to-br from-primary via-primary/80 to-accent/60 px-6 py-10">
        <img src={appIconUrl} alt="AI 小说工作台" className="h-14 w-14 rounded-xl shadow-glow-sm" />
        <h1 className="text-2xl font-bold text-primary-foreground">AI 小说工作台</h1>
        <p className="text-sm text-primary-foreground/70">多用户 AI 协同写作平台，让创作更自由。</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm animate-fade-up">
          <h2 className="text-2xl font-semibold text-foreground">登录</h2>
          <p className="mt-1 text-sm text-muted-foreground">使用你的账号进入写作空间。</p>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-8 space-y-4">
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>邮箱</span>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
            </label>
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>密码</span>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={submitting || !email.trim() || !password} className="w-full" size="lg">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              还没有账号？ <Link to="/app/register" className="text-primary hover:underline">去注册</Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
