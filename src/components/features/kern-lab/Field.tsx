import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** Labelled form control wrapper (quiet body caption above the input). */
export function Field({ label, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <div className="mb-1.5 text-xs font-medium tracking-wide text-kl-muted">
        {label}
      </div>
      {children}
    </label>
  );
}
