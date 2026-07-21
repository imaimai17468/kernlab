/** The one accent-link treatment shared by every text link in the app.
 * kl-hit-area (src/styles.css) grows the touch target to 44px on coarse
 * pointers via a pseudo-element, without inflating the visible line box. */
export const ACCENT_LINK_CLASS =
  "kl-hit-area inline-flex items-center text-kl-blue underline decoration-from-font underline-offset-4 transition-colors duration-150 ease-out hover:text-kl-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue motion-reduce:transition-none";
