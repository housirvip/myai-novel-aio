import { Check, Circle, ClipboardList } from "lucide-react";
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
              <button
                type="button"
                onClick={() => props.onSwitchTab(stage.key)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  status === "active" && "bg-primary text-primary-foreground shadow-glow",
                  status === "completed" && "bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15",
                  status === "available" && "text-muted-foreground hover:bg-muted hover:text-foreground",
                  status === "locked" && "cursor-default text-muted-foreground/50",
                )}
                disabled={status === "locked"}
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                  status === "active" && "bg-primary-foreground/20 text-primary-foreground",
                  status === "completed" && "bg-primary text-primary-foreground shadow-glow-sm",
                  status === "available" && "border border-border text-muted-foreground",
                  status === "locked" && "border border-border/50 text-muted-foreground/50",
                )}>
                  {status === "completed" ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                </span>
                <span>{stage.label}</span>
              </button>
              {index < pipelineStages.length - 1 && (
                <div className={cn(
                  "mx-1 flex-1 rounded-full transition-colors duration-300",
                  props.stageAvailability[pipelineStages[index + 1].key]
                    ? "h-1 bg-primary shadow-glow-sm"
                    : "h-px bg-border",
                )} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <button
        type="button"
        onClick={() => props.onSwitchTab("task")}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          props.activeTab === "task"
            ? "bg-primary text-primary-foreground shadow-glow"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ClipboardList className="h-4 w-4" />
        <span>Task</span>
      </button>

      {props.isDirty && (
        <div className="ml-2 flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
          <Circle className="h-2 w-2 fill-accent text-accent" />
          未保存
        </div>
      )}
    </div>
  );
}
