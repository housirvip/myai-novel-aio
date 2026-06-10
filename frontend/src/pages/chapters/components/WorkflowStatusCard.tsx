import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import type { WorkflowStatusCardViewModel } from "./workbench-utils";

export type WorkflowStatusCardProps = {
  card: WorkflowStatusCardViewModel;
};

function getAlertVariant(tone: WorkflowStatusCardViewModel["tone"]) {
  if (tone === "error") return "destructive";
  if (tone === "success") return "success";
  return "default";
}

function getBadgeVariant(tone: WorkflowStatusCardViewModel["tone"]) {
  if (tone === "error") return "destructive";
  if (tone === "success") return "success";
  return "secondary";
}

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
    <Alert
      variant={getAlertVariant(card.tone)}
      className={`transition-opacity duration-500 ${card.tone === "running" ? "border-primary/20 bg-primary/10 text-primary" : ""} ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">{card.eyebrow}</div>
          <AlertTitle className="mt-1 text-lg">{card.title}</AlertTitle>
          <AlertDescription className="mt-1 opacity-90">{card.detail}</AlertDescription>
        </div>
        {card.badge && <Badge variant={getBadgeVariant(card.tone)}>{card.badge}</Badge>}
      </div>
      {card.progressPercent != null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>任务进度</span>
            <span>{card.progressPercent}%</span>
          </div>
          <Progress className="mt-2" value={card.progressPercent} />
        </div>
      )}
      {card.meta.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs opacity-90">
          {card.meta.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      )}
    </Alert>
  );
}
