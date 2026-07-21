import { createRootRoute } from "@tanstack/react-router";
import { NotFound } from "./-not-found";
import { RootComponent } from "./-root";
import "@/styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KERN LAB — 光学カーニング自動調整" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});
