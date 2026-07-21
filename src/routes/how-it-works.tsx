import { createFileRoute } from "@tanstack/react-router";
import { HowItWorks } from "@/components/features/kern-lab/HowItWorks";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [{ title: "KERN LAB の仕組み" }],
  }),
  component: HowItWorks,
});
