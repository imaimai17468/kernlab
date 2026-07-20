import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

const CYCLE = ["light", "dark"] as const;
type Theme = (typeof CYCLE)[number];

const ACTION_LABELS: Record<Theme, string> = {
  light: "ダークモードに切り替え",
  dark: "ライトモードに切り替え",
};

export function resolveThemeCycle(
  rawTheme: string | undefined,
  mounted: boolean
): { current: Theme; next: Theme } {
  const matched = CYCLE.find((v) => v === rawTheme);
  const current = mounted ? (matched ?? "light") : "light";
  const index = CYCLE.indexOf(current);
  const next = CYCLE[(index + 1) % CYCLE.length];
  return { current, next };
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { current, next } = resolveThemeCycle(theme, mounted);

  const handleClick = useCallback(() => {
    if (mounted) {
      setTheme(next);
    }
  }, [mounted, next, setTheme]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      aria-disabled={!mounted}
      className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
      aria-label={mounted ? ACTION_LABELS[current] : "テーマを切り替え"}
    >
      <Sun className="dark:-rotate-90 h-5 w-5 rotate-0 scale-100 transition-all dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
