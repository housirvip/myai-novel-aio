import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <Card className="flex min-h-[50vh] flex-col items-center justify-center border-dashed px-6 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h2 className="mt-2 text-3xl font-semibold text-foreground">页面不存在</h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">当前 WebUI 还在持续建设中，你访问的页面还没有接入，或者链接地址无效。</p>
      <Button asChild className="mt-6 shadow-glow">
        <Link to="/app">返回书籍首页</Link>
      </Button>
    </Card>
  );
}
