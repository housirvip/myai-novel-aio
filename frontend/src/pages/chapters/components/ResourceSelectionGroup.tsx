import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { ResourceOption } from "../hooks";

const PAGE_SIZE = 8;

export function ResourceSelectionGroup(props: {
  title: string;
  options: ResourceOption[];
  selectedIds: number[];
  onToggle: (resourceId: number) => void;
  onEdit?: (resourceId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const filteredOptions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return props.options;
    }

    return props.options.filter((option) => {
      const haystacks = [option.name, option.subtitle ?? ""];
      return haystacks.some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [keyword, props.options]);

  const totalPages = Math.max(1, Math.ceil(filteredOptions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedOptions = filteredOptions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  useEffect(() => {
    if (!expanded) {
      setKeyword("");
      setPage(1);
      return;
    }

    setPage((current) => Math.min(current, totalPages));
  }, [expanded, totalPages]);

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="text-sm font-medium text-card-foreground">{props.title}</div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded(true)} className="rounded-full">
              展开
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">已选 {props.selectedIds.length}</div>
        </div>
        <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
          {props.options.length === 0 && <div className="text-xs text-muted-foreground">当前没有可选资源。</div>}
          {props.options.map((option) => {
            const checked = props.selectedIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={`block cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  checked ? "border-primary bg-primary/5 text-foreground" : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      if (nextChecked === true || checked) props.onToggle(option.id);
                    }}
                    aria-label={`选择${option.name}`}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{option.name}</div>
                    {option.subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{option.subtitle}</div>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{props.title}选择器</DialogTitle>
            <DialogDescription>支持名称模糊搜索、分页浏览与勾选同步。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4">
                <Field label="按名称模糊搜索" className="min-w-0 flex-1">
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder={`搜索${props.title}名称`}
                  />
                </Field>
                <div className="rounded-lg bg-card px-4 py-3 text-xs text-muted-foreground">
                  共 {filteredOptions.length} 条，已选 {props.selectedIds.length} 条
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="w-16 px-4 py-3">选择</th>
                      <th className="w-20 px-4 py-3">ID</th>
                      <th className="px-4 py-3">名称</th>
                      <th className="px-4 py-3">说明</th>
                      <th className="w-24 px-4 py-3">修改</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {pagedOptions.length > 0 ? (
                      pagedOptions.map((option) => {
                        const checked = props.selectedIds.includes(option.id);
                        return (
                          <tr key={option.id} className={checked ? "bg-primary/5" : ""}>
                            <td className="px-4 py-3 align-middle">
                              <Checkbox
                                aria-label={`选择${option.name}`}
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  if (nextChecked === true || checked) props.onToggle(option.id);
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{option.id}</td>
                            <td className="px-4 py-3 align-middle font-medium text-foreground">{option.name}</td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{option.subtitle || "—"}</td>
                            <td className="px-4 py-3 align-middle">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => props.onEdit?.(option.id)}
                                aria-label={`修改${option.name}`}
                                className="rounded-full"
                              >
                                修改
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          没有匹配到资源。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <div>
                  第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="text-sm font-medium text-foreground">已选摘要</div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                {props.selectedIds.length > 0 ? (
                  props.selectedIds.map((selectedId) => {
                    const selectedOption = props.options.find((option) => option.id === selectedId);
                    return (
                      <div key={selectedId} className="rounded-lg bg-card px-3 py-2">
                        <div className="font-medium text-foreground">{selectedOption?.name ?? `#${selectedId}`}</div>
                        <div className="mt-1 text-muted-foreground">ID {selectedId}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg bg-card px-3 py-2 text-muted-foreground">当前还没有已选资源。</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setExpanded(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
