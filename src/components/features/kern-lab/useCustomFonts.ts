import { useSyncExternalStore } from "react";
import type { CustomFontsSnapshot } from "./engine/customFonts";
import {
  getCustomFontsSnapshot,
  getServerCustomFontsSnapshot,
  subscribeCustomFonts,
} from "./engine/customFonts";

/**
 * Reactive view of the custom-font registry and intake machine. The server
 * snapshot is the machine's initial restoring state, so SSR/hydration render
 * the same empty registry the client starts with.
 */
export function useCustomFonts(): CustomFontsSnapshot {
  return useSyncExternalStore(
    subscribeCustomFonts,
    getCustomFontsSnapshot,
    getServerCustomFontsSnapshot
  );
}
