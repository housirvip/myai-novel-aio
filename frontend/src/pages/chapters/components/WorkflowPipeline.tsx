import { Check, Circle, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { StageTab } from "../hooks";

const pipelineStages: Array<{ key: StageTab; label: string }> = [
  { key: "plan", label: "Plan" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "final", label: "Final" },
];

type StageStatus = "completed" | "active" | "available" | "locked";

function getStageStatus(
  stageKey: StageTab,
  activeTab: StageTab,
  availability: Record<string, boolean>,
): StageStatus {
  if (stageKey === activeTab) return "active";
  if (availability[stageKey]) return "completed";
  return "available";
}

export function WorkflowPipeline(props: {
  activeTab: StageTab;
  stageAvailability: Record<string, boolean>;
  onSwitchTab: (tab: StageTab) => void;
  isDirty?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-1 items-center">
        {pipelineStages.map((stage, index) => {
          const status = getStageStatus(stage.key, props.activeTab, props.stageAvailability);
          return (
            <div key={stage.key} className="flex flex-1 items-center">
              <Button
                type="button"
                variant={status === "active" ? "default" : "ghost"}
                onClick={() => props.onSwitchTab(stage.key)}
                className={cn(
                  "group relative px-3 py-2",
                  status === "active" && "shadow-glow",
                  status === "completed" && "bg-muted text-foreground hover:bg-primary/10",
                  status === "available" && "text-muted-foreground hover:bg-muted hover:text-foreground",
                  status === "locked" && "cursor-default text-muted-foreground/50",
                )}
                disabled={status === "locked"}
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                  status === "active" && "bg-primary-foreground/20 text-primary-foreground",
                  status === "completed" && "bg-primary/15 text-primary",
                  status === "available" && "border border-border text-muted-foreground",
                  status === "locked" && "border border-border/50 text-muted-foreground/50",
                )}>
                  {status === "completed" ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                </span>
                <span>{stage.label}</span>
              </Button>
              {index < pipelineStages.length - 1 && (
                <div className={cn(
                  "mx-1 h-px flex-1 transition-colors duration-300",
                  props.stageAvailability[pipelineStages[index + 1].key]
                    ? "bg-primary/30"
                    : "bg-border",
                )} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        type="button"
        variant={props.activeTab === "task" ? "default" : "ghost"}
        onClick={() => props.onSwitchTab("task")}
        className={cn(props.activeTab === "task" && "shadow-glow", props.activeTab !== "task" && "text-muted-foreground")}
      >
        <ClipboardList className="h-4 w-4" />
        <span>Task</span>
      </Button>

      {props.isDirty && (
        <Badge variant="warning" className="ml-2 gap-1.5 py-1">
          <Circle className="h-2 w-2 fill-current" />
          未保存
        </Badge>
      )}
    </div>
  );
}
