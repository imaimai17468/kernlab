import type { ReactNode } from "react";

type ToggleProps = {
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
  accent?: "red" | "blue";
};

/** Square press-toggle button; fills with its accent when active. */
export function Toggle({
  on,
  onToggle,
  children,
  accent = "red",
}: ToggleProps) {
  const activeFill = accent === "blue" ? "bg-kl-blue" : "bg-kl-red";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`cursor-pointer appearance-none border border-kl-ink px-3 py-2 font-kl-mono text-xs transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue active:scale-95 motion-reduce:transition-none ${on ? `${activeFill} text-kl-paper hover:brightness-95` : "bg-kl-panel text-kl-ink hover:bg-kl-ink/5"}`}
    >
      {children}
    </button>
  );
}
