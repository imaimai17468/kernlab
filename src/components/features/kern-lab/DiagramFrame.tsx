import type { ReactNode } from "react";
import { Corner } from "./Corner";

type DiagramFrameProps = {
  caption: string;
  children: ReactNode;
};

/** Bordered panel for the how-it-works diagrams, framed like the canvas stage. */
export function DiagramFrame({ caption, children }: DiagramFrameProps) {
  return (
    <figure className="relative border border-kl-ink bg-kl-panel p-4">
      {children}
      <figcaption className="mt-2 text-xs text-kl-muted">{caption}</figcaption>
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
    </figure>
  );
}
