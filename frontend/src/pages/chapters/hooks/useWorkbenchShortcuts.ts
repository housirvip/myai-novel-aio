import { useEffect } from "react";

export function useWorkbenchShortcuts(params: {
  onSave: () => void;
  canSave: boolean;
}) {
  const { onSave, canSave } = params;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (event.key === "s") {
        event.preventDefault();
        if (canSave) onSave();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, canSave]);
}
