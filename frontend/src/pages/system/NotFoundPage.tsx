import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card px-6 text-center shadow-elevation-2 animate-fade-up">
      <div className="absolute inset-0 bg-gradient-mesh opacity-50" />

      <div className="relative">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <FileQuestion className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-medium text-primary">404</p>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">页面不存在</h2>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">当前 WebUI 还在持续建设中，你访问的页面还没有接入，或者链接地址无效。</p>
        <Button asChild className="mt-6 shadow-glow">
          <Link to="/app">返回书籍首页</Link>
        </Button>
      </div>
    </section>
  );
}
