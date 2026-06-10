import { type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};
function Field({ label, htmlFor, description, error, children, className }: FieldProps) {
  const content = (
    <>
      <span className="text-sm font-medium leading-none text-muted-foreground">{label}</span>
      {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </>
  );

  if (!htmlFor) {
    return (
      <Label className={cn("block space-y-2", className)}>
        {content}
      </Label>
    );
  }

  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <Label htmlFor={htmlFor} className="text-muted-foreground">
        {label}
      </Label>
      {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      {children}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}

export { Field };
export type { FieldProps };
