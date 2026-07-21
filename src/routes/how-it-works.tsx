import { createFileRoute } from "@tanstack/react-router";
import { HowItWorks } from "@/components/features/how-it-works/HowItWorks";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [{ title: "KERN LAB の仕組み" }],
  }),
  component: HowItWorks,
});
