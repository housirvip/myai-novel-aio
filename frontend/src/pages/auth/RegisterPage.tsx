import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatApiErrorMessage } from "@/lib/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const submit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await register({ displayName, email, password });
      navigate("/app", { replace: true });
    } catch (error) {
      setErrorMessage(formatApiErrorMessage(error, "注册失败"));
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
          <CardTitle className="text-2xl text-foreground">注册账号</CardTitle>
          <CardDescription>注册后会自动进入你的个人书籍空间。</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-6">
          <div className="space-y-4">
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>显示名称</span>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" />
            </label>
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>邮箱</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </label>
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span>密码</span>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" />
            </label>
            {errorMessage && <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>}
            <Button onClick={submit} disabled={submitting || !displayName.trim() || !email.trim() || password.length < 8} className="w-full">
              {submitting ? "注册中..." : "注册并进入"}
            </Button>
          </div>
          <div className="mt-5 text-sm text-muted-foreground">
            已有账号？ <Link to="/app/login" className="text-primary hover:underline">去登录</Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
