import { Link } from "react-router-dom";

import { settingsPath } from "@/lib/routes";
import type { StoredWorkflowSettings, WorkflowProvider } from "../hooks/useWorkflowSettings";

export type WorkflowSettingsDialogProps = {
  open: boolean;
  draft: StoredWorkflowSettings;
  onDraftChange: (draft: StoredWorkflowSettings) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function WorkflowSettingsDialog({
  open,
  draft,
  onDraftChange,
  onSave,
  onCancel,
}: WorkflowSettingsDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm px-4 pt-28 sm:pt-32 animate-in fade-in-0 duration-200" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-settings-dialog-title"
        className="w-full max-w-xl rounded-xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="workflow-settings-dialog-title"
          className="text-lg font-semibold text-foreground"
        >
          修改 workflow 参数
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          个人默认值请前往
          <Link
            to={settingsPath()}
            className="mx-1 text-primary underline underline-offset-2"
          >
            设置页
          </Link>
          维护。这里的修改仅覆盖当前章节当前这次 workflow 请求。
        </p>
        <div className="mt-4 space-y-3 rounded-lg bg-muted p-4">
          <label className="block text-xs text-muted-foreground">
            Provider
          </label>
          <select
            value={draft.provider}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                provider: event.target.value as WorkflowProvider,
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="mock">mock</option>
            <option value="openai">openai</option>
            <option value="anthropic">anthropic</option>
            <option value="custom">custom</option>
          </select>

          <label className="block text-xs text-muted-foreground">
            Low Model
          </label>
          <input
            value={draft.lowModel}
            onChange={(event) =>
              onDraftChange({ ...draft, lowModel: event.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="可选 low 模型名"
          />

          <label className="block text-xs text-muted-foreground">
            Mid Model
          </label>
          <input
            value={draft.midModel}
            onChange={(event) =>
              onDraftChange({ ...draft, midModel: event.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="可选 mid 模型名"
          />

          <label className="block text-xs text-muted-foreground">
            High Model
          </label>
          <input
            value={draft.highModel}
            onChange={(event) =>
              onDraftChange({ ...draft, highModel: event.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="可选 high 模型名"
          />

          <label className="block text-xs text-muted-foreground">
            Target Words
          </label>
          <input
            value={draft.targetWords}
            onChange={(event) =>
              onDraftChange({ ...draft, targetWords: event.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="3000"
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            保存参数
          </button>
        </div>
      </div>
    </div>
  );
}
