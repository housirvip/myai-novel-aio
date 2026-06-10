import { useEffect, useState } from "react";

import type { WorkflowStatusCardViewModel } from "./workbench-utils";

export type WorkflowStatusCardProps = {
  card: WorkflowStatusCardViewModel;
};

const toneStyles: Record<WorkflowStatusCardViewModel["tone"], string> = {
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  success: "border-success/30 bg-success/10 text-success",
  running: "border-primary/20 bg-primary/10 text-primary",
  idle: "border-border bg-muted text-muted-foreground",
};

export function WorkflowStatusCard({ card }: WorkflowStatusCardProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (card.tone !== "success" && card.tone !== "error") {
      setVisible(true);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [card.tone, card.title]);

  return (
    <div
      className={`rounded-xl border p-5 shadow-elevation-1 transition-all duration-500 ${toneStyles[card.tone]} ${visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">{card.eyebrow}</div>
          <div className="mt-1 text-lg font-semibold">{card.title}</div>
          <div className="mt-1 text-sm opacity-90">{card.detail}</div>
        </div>
        {card.badge && (
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium ring-1 ring-current/10">
            {card.badge}
          </span>
        )}
      </div>
      {card.progressPercent != null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>任务进度</span>
            <span>{card.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/70">
            <div
              className="h-full rounded-full bg-current transition-all"
              style={{ width: `${Math.max(0, Math.min(100, card.progressPercent))}%` }}
            />
          </div>
        </div>
      )}
      {card.meta.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs opacity-90">
          {card.meta.map((item) => (
            <span key={item} className="rounded-full bg-background/80 px-3 py-1 ring-1 ring-current/10">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
