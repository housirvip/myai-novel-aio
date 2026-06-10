import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
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
    <section className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <Card className="w-full shadow-glow backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">登录 WebUI</CardTitle>
          <CardDescription>使用你的账号进入多用户写作空间。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label="邮箱" htmlFor="login-email">
              <Input
                id="login-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="h-11"
              />
            </Field>
            <Field label="密码" htmlFor="login-password">
              <Input
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="h-11"
              />
            </Field>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Button onClick={submit} disabled={submitting || !email.trim() || !password} className="h-11 w-full">
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
