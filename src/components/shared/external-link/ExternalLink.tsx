import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { ACCENT_LINK_CLASS } from "./accentLinkClass";

type ExternalLinkProps = ComponentPropsWithoutRef<"a"> & {
  href: string;
};

/** Accent-styled external link: up-right glyph + screen-reader new-tab notice.
 * Spreads native anchor attributes; target/rel stay enforced. */
export function ExternalLink({
  href,
  children,
  className,
  ...rest
}: ExternalLinkProps) {
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(ACCENT_LINK_CLASS, className)}
    >
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}
