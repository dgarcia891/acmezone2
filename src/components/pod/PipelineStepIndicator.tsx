import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = "input" | "review" | "generate" | "results" | "listings";

const steps: { key: PipelineStep; label: string; number: number }[] = [
  { key: "input", label: "Analyze", number: 1 },
  { key: "review", label: "Review", number: 2 },
  { key: "generate", label: "Generate", number: 3 },
  { key: "results", label: "Review Designs", number: 4 },
  { key: "listings", label: "Finalize", number: 5 },
];

const stepIndex = (s: PipelineStep) => steps.findIndex((x) => x.key === s);

export default function PipelineStepIndicator({ current }: { current: PipelineStep }) {
  const ci = stepIndex(current);

  return (
    <nav aria-label="Pipeline progress" className="flex items-center justify-center gap-2 mb-8">
      <ol className="flex items-center gap-2 list-none p-0 m-0">
        {steps.map((step, i) => {
          const completed = i < ci;
          const active = i === ci;
          const status = completed ? "completed" : active ? "current" : "upcoming";
          return (
            <li key={step.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors",
                  completed && "bg-primary border-primary text-primary-foreground",
                  active && "bg-primary border-primary text-primary-foreground ring-2 ring-ring ring-offset-2",
                  !completed && !active && "border-muted-foreground/30 text-muted-foreground"
                )}
                aria-label={`Step ${step.number}: ${step.label} — ${status}`}
                aria-current={active ? "step" : undefined}
              >
                {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : step.number}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:inline",
                  active && "font-bold text-foreground",
                  completed && "text-foreground",
                  !completed && !active && "text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    i < ci ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
