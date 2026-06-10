import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <section className="relative mx-auto flex min-h-screen max-w-md items-center overflow-hidden px-4 py-10">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

      <Card className="relative w-full shadow-elevation-3 animate-fade-up">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-2xl text-foreground">登录 WebUI</CardTitle>
          <CardDescription>使用你的账号进入多用户写作空间。</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-6">
          <div className="space-y-4">
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>邮箱</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </label>
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>密码</span>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </label>
            {errorMessage && <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>}
            <Button onClick={submit} disabled={submitting || !email.trim() || !password} className="w-full">
              {submitting ? "登录中..." : "登录"}
            </Button>
          </div>
          <div className="mt-5 text-sm text-muted-foreground">
            还没有账号？ <Link to="/app/register" className="text-primary hover:underline">去注册</Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
