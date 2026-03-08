import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sun, Contrast, Palette } from "lucide-react";

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
}

interface Props {
  adjustments: Adjustments;
  onChange: (adj: Adjustments) => void;
}

export default function AdjustmentSliders({ adjustments, onChange }: Props) {
  const sliders = [
    { key: "brightness" as const, label: "Brightness", icon: Sun, min: 0, max: 200 },
    { key: "contrast" as const, label: "Contrast", icon: Contrast, min: 0, max: 200 },
    { key: "saturation" as const, label: "Saturation", icon: Palette, min: 0, max: 200 },
  ];

  return (
    <div className="space-y-4 p-3 rounded-lg border border-border bg-card">
      {sliders.map(({ key, label, icon: Icon, min, max }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              {label}
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">{adjustments[key]}%</span>
          </div>
          <Slider
            min={min}
            max={max}
            step={1}
            value={[adjustments[key]]}
            onValueChange={([v]) => onChange({ ...adjustments, [key]: v })}
          />
        </div>
      ))}
    </div>
  );
}
