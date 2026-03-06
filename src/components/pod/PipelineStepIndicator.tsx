import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = "input" | "review" | "generate" | "listings" | "summary";

const steps: { key: PipelineStep; label: string; number: number }[] = [
  { key: "input", label: "Analyze", number: 1 },
  { key: "review", label: "Review", number: 2 },
  { key: "generate", label: "Generate", number: 3 },
  { key: "listings", label: "Listings", number: 4 },
  { key: "summary", label: "Summary", number: 5 },
];

const stepIndex = (s: PipelineStep) => steps.findIndex((x) => x.key === s);

export default function PipelineStepIndicator({ current }: { current: PipelineStep }) {
  const ci = stepIndex(current);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => {
        const completed = i < ci;
        const active = i === ci;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors",
                completed && "bg-green-500 border-green-500 text-white",
                active && "bg-primary border-primary text-primary-foreground",
                !completed && !active && "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : step.number}
            </div>
            <span
              className={cn(
                "text-sm hidden sm:inline",
                active && "font-bold text-foreground",
                completed && "text-green-600",
                !completed && !active && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  i < ci ? "bg-green-500" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
