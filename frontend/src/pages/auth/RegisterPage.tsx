import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
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
    <section className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <Card className="w-full shadow-glow backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">注册账号</CardTitle>
          <CardDescription>注册后会自动进入你的个人书籍空间。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label="显示名称" htmlFor="register-display-name">
              <Input
                id="register-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="nickname"
                className="h-11"
              />
            </Field>
            <Field label="邮箱" htmlFor="register-email">
              <Input
                id="register-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="h-11"
              />
            </Field>
            <Field label="密码" htmlFor="register-password">
              <Input
                id="register-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                className="h-11"
              />
            </Field>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={submit}
              disabled={submitting || !displayName.trim() || !email.trim() || password.length < 8}
              className="h-11 w-full"
            >
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
