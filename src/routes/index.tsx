import { createFileRoute } from "@tanstack/react-router";
import { KernLab } from "@/components/features/kern-lab/KernLab";

export const Route = createFileRoute("/")({
  component: KernLab,
});
