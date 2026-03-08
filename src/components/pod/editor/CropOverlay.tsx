import { useState, useCallback, useRef, useEffect } from "react";

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  containerWidth: number;
  containerHeight: number;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
}

type Handle = "nw" | "ne" | "sw" | "se" | "move";

export default function CropOverlay({ containerWidth, containerHeight, crop, onChange }: Props) {
  const [dragging, setDragging] = useState<Handle | null>(null);
  const startRef = useRef({ mx: 0, my: 0, crop: { ...crop } });

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    startRef.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } };
    setDragging(handle);
  }, [crop]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startRef.current.mx;
      const dy = e.clientY - startRef.current.my;
      const sc = startRef.current.crop;
      let next = { ...sc };

      if (dragging === "move") {
        next.x = Math.max(0, Math.min(containerWidth - sc.w, sc.x + dx));
        next.y = Math.max(0, Math.min(containerHeight - sc.h, sc.y + dy));
      } else {
        if (dragging.includes("w")) { next.x = Math.max(0, Math.min(sc.x + sc.w - 20, sc.x + dx)); next.w = sc.w - (next.x - sc.x); }
        if (dragging.includes("e")) { next.w = Math.max(20, Math.min(containerWidth - sc.x, sc.w + dx)); }
        if (dragging.includes("n")) { next.y = Math.max(0, Math.min(sc.y + sc.h - 20, sc.y + dy)); next.h = sc.h - (next.y - sc.y); }
        if (dragging.includes("s")) { next.h = Math.max(20, Math.min(containerHeight - sc.y, sc.h + dy)); }
      }
      onChange(next);
    };

    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, containerWidth, containerHeight, onChange]);

  const handleSize = 10;
  const handles: { pos: Handle; style: React.CSSProperties }[] = [
    { pos: "nw", style: { top: -handleSize / 2, left: -handleSize / 2, cursor: "nw-resize" } },
    { pos: "ne", style: { top: -handleSize / 2, right: -handleSize / 2, cursor: "ne-resize" } },
    { pos: "sw", style: { bottom: -handleSize / 2, left: -handleSize / 2, cursor: "sw-resize" } },
    { pos: "se", style: { bottom: -handleSize / 2, right: -handleSize / 2, cursor: "se-resize" } },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: containerWidth, height: containerHeight }}>
      {/* Dimmed overlay */}
      <svg className="absolute inset-0" width={containerWidth} height={containerHeight}>
        <defs>
          <mask id="crop-mask">
            <rect width={containerWidth} height={containerHeight} fill="white" />
            <rect x={crop.x} y={crop.y} width={crop.w} height={crop.h} fill="black" />
          </mask>
        </defs>
        <rect width={containerWidth} height={containerHeight} fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
      </svg>
      {/* Active crop area */}
      <div
        className="absolute border-2 border-primary pointer-events-auto cursor-move"
        style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        {handles.map(({ pos, style }) => (
          <div
            key={pos}
            className="absolute bg-primary rounded-sm pointer-events-auto"
            style={{ ...style, width: handleSize, height: handleSize }}
            onMouseDown={(e) => handleMouseDown(e, pos)}
          />
        ))}
      </div>
    </div>
  );
}
