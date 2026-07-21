type CornerPos = "tl" | "tr" | "bl" | "br";

type CornerProps = {
  pos: CornerPos;
};

const CORNER_CLASS: Record<CornerPos, string> = {
  tl: "top-1.5 left-1.5 border-t border-l",
  tr: "top-1.5 right-1.5 border-t border-r",
  bl: "bottom-1.5 left-1.5 border-b border-l",
  br: "bottom-1.5 right-1.5 border-b border-r",
};

/** Decorative registration-mark corner drawn over the canvas frame. */
export function Corner({ pos }: CornerProps) {
  return (
    <div
      className={`absolute h-2.5 w-2.5 border-kl-grey ${CORNER_CLASS[pos]}`}
    />
  );
}
