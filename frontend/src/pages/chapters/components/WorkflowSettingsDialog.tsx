import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>修改 workflow 参数</DialogTitle>
          <DialogDescription>
            个人默认值请前往
            <Link
              to={settingsPath()}
              className="mx-1 text-primary underline underline-offset-2"
            >
              设置页
            </Link>
            维护。这里的修改仅覆盖当前章节当前这次 workflow 请求。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg bg-muted p-4">
          <Field label="Provider">
            <Select
              value={draft.provider}
              onValueChange={(value) =>
                onDraftChange({
                  ...draft,
                  provider: value as WorkflowProvider,
                })
              }
            >
              <SelectTrigger aria-label="Provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">mock</SelectItem>
                <SelectItem value="openai">openai</SelectItem>
                <SelectItem value="anthropic">anthropic</SelectItem>
                <SelectItem value="custom">custom</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Low Model">
            <Input
              value={draft.lowModel}
              onChange={(event) => onDraftChange({ ...draft, lowModel: event.target.value })}
              placeholder="可选 low 模型名"
            />
          </Field>

          <Field label="Mid Model">
            <Input
              value={draft.midModel}
              onChange={(event) => onDraftChange({ ...draft, midModel: event.target.value })}
              placeholder="可选 mid 模型名"
            />
          </Field>

          <Field label="High Model">
            <Input
              value={draft.highModel}
              onChange={(event) => onDraftChange({ ...draft, highModel: event.target.value })}
              placeholder="可选 high 模型名"
            />
          </Field>

          <Field label="目标字数">
            <Input
              value={draft.targetWords}
              onChange={(event) => onDraftChange({ ...draft, targetWords: event.target.value })}
              placeholder="3000"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" onClick={onSave}>
            保存参数
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
