import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatApiErrorMessage } from "@/lib/api";
import { createBook, listBooks } from "@/lib/books-api";
import { queryKeys } from "@/lib/query/query-keys";

export function BooksPage() {
  const queryClient = useQueryClient();
  const booksQuery = useQuery({
    queryKey: queryKeys.books(),
    queryFn: () => listBooks(),
  });

  const createBookMutation = useMutation({
    mutationFn: () =>
      createBook({
        title: `新作品 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
        summary: "通过 WebUI 快速创建的新书籍。",
        targetChapterCount: 100,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.books() });
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">书籍总览</h2>
          <p className="mt-1 text-sm text-muted-foreground">从这里进入你的作品、章节工作台和成稿阅读区。</p>
        </div>
        <Button
          onClick={() => createBookMutation.mutate()}
          disabled={createBookMutation.isPending}
          className="shadow-glow"
        >
          {createBookMutation.isPending ? "创建中..." : "快速新建书籍"}
        </Button>
      </div>

      {createBookMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{formatApiErrorMessage(createBookMutation.error, "创建书籍失败")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {booksQuery.isLoading && Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-28 rounded-lg" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </Card>
        ))}

        {booksQuery.data?.map((book) => (
          <Link key={book.id} to={`/app/books/${book.id}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
              <div className="h-28 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-accent opacity-90" />
              <div className="mt-4 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{book.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {book.summary || "暂未填写简介。"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">目标 {book.targetChapterCount ?? "—"} 章</Badge>
                  <Badge variant="success">已批准 {book.currentChapterCount} 章</Badge>
                  <Badge variant="outline">{book.status}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {booksQuery.data && booksQuery.data.length === 0 && (
          <Card className="border-dashed p-8 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            当前还没有书籍，点击右上角按钮即可快速创建一条示例数据。
          </Card>
        )}
      </div>
    </section>
  );
}
