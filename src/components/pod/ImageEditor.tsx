import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, X, RotateCcw } from "lucide-react";
import EditorToolbar, { type EditorTool } from "./editor/EditorToolbar";
import AdjustmentSliders, { type Adjustments } from "./editor/AdjustmentSliders";
import CropOverlay, { type CropRect } from "./editor/CropOverlay";

interface Props {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const MAX_HISTORY = 20;

const checkerboardCSS = `
  linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
  linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
  linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
`;

export default function ImageEditor({ imageUrl, onSave, onCancel, isSaving }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<EditorTool>("select");
  const [adjustments, setAdjustments] = useState<Adjustments>({ brightness: 100, contrast: 100, saturation: 100 });
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [textInput, setTextInput] = useState("");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });

  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const isDrawing = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Canvas display dimensions (fit within container)
  const [displaySize, setDisplaySize] = useState({ w: 800, h: 800 });

  // Load image
  useEffect(() => {
    const loadImage = async () => {
      try {
        // Fetch as blob to avoid CORS issues with canvas
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          imgRef.current = img;
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // Compute display size to fit container
          const container = containerRef.current;
          const maxW = container ? container.clientWidth - 32 : 800;
          const maxH = 600;
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          setDisplaySize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
          setCrop({ x: 0, y: 0, w: Math.round(img.width * scale), h: Math.round(img.height * scale) });

          // Save initial state
          const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([initial]);
          setHistoryIdx(0);
          setLoaded(true);
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      } catch (err) {
        console.error("Failed to load image for editor:", err);
      }
    };
    loadImage();
  }, [imageUrl]);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const next = prev.slice(0, historyIdx + 1);
      next.push(data);
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setHistoryIdx((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIdx]);

  const restoreHistory = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !history[idx]) return;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(history[idx], 0, 0);
    setHistoryIdx(idx);
  }, [history]);

  const undo = () => { if (historyIdx > 0) restoreHistory(historyIdx - 1); };
  const redo = () => { if (historyIdx < history.length - 1) restoreHistory(historyIdx + 1); };

  const revertToOriginal = () => {
    if (!history[0]) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const original = history[0];
    canvas.width = original.width;
    canvas.height = original.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(original, 0, 0);
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setTool("select");
    // Recompute display size for original dimensions
    const container = containerRef.current;
    const maxW = container ? container.clientWidth - 32 : 800;
    const maxH = 600;
    const s = Math.min(1, maxW / original.width, maxH / original.height);
    setDisplaySize({ w: Math.round(original.width * s), h: Math.round(original.height * s) });
    setCrop({ x: 0, y: 0, w: Math.round(original.width * s), h: Math.round(original.height * s) });
    // Reset history to just the original
    setHistory([original]);
    setHistoryIdx(0);
  };

  // Scale factor: canvas pixels per display pixel
  const scaleFactor = canvasRef.current ? canvasRef.current.width / displaySize.w : 1;

  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * scaleFactor,
      y: (e.clientY - rect.top) * scaleFactor,
    };
  };

  // Drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "draw" || tool === "eraser") {
      isDrawing.current = true;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const pos = getCanvasPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = brushColor;
      }
      ctx.lineWidth = brushSize * scaleFactor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    if (tool === "text" && textInput.trim()) {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const pos = getCanvasPos(e);
      ctx.globalCompositeOperation = "source-over";
      ctx.font = `${textSize * scaleFactor}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(textInput, pos.x, pos.y);
      pushHistory();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
      pushHistory();
    }
  };

  // Rotate
  const rotate = (deg: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext("2d")!.putImageData(imgData, 0, 0);

    if (Math.abs(deg) === 90) {
      const newW = canvas.height;
      const newH = canvas.width;
      canvas.width = newW;
      canvas.height = newH;
      ctx.clearRect(0, 0, newW, newH);
      ctx.save();
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
      ctx.restore();

      const scale = Math.min(1, (displaySize.w * scaleFactor) / newW, (displaySize.h * scaleFactor) / newH);
      // Keep display size proportional
      const container = containerRef.current;
      const maxW = container ? container.clientWidth - 32 : 800;
      const maxH = 600;
      const s = Math.min(1, maxW / newW, maxH / newH);
      setDisplaySize({ w: Math.round(newW * s), h: Math.round(newH * s) });
    }
    pushHistory();
  };

  // Apply adjustments and export
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If crop tool is active, apply crop first
    if (tool === "crop") {
      applyCrop();
    }

    // Apply adjustments via offscreen canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const octx = offscreen.getContext("2d")!;
    octx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    octx.drawImage(canvas, 0, 0);

    offscreen.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const sx = crop.x * scaleFactor;
    const sy = crop.y * scaleFactor;
    const sw = crop.w * scaleFactor;
    const sh = crop.h * scaleFactor;

    const cropped = ctx.getImageData(sx, sy, sw, sh);
    canvas.width = sw;
    canvas.height = sh;
    ctx.putImageData(cropped, 0, 0);

    const container = containerRef.current;
    const maxW = container ? container.clientWidth - 32 : 800;
    const maxH = 600;
    const s = Math.min(1, maxW / sw, maxH / sh);
    setDisplaySize({ w: Math.round(sw * s), h: Math.round(sh * s) });
    setCrop({ x: 0, y: 0, w: Math.round(sw * s), h: Math.round(sh * s) });
    setTool("select");
    pushHistory();
  };

  const cursorClass = tool === "draw" ? "cursor-crosshair" : tool === "eraser" ? "cursor-crosshair" : tool === "text" ? "cursor-text" : tool === "crop" ? "cursor-crosshair" : "cursor-default";

  return (
    <div ref={containerRef} className="flex flex-col gap-4 p-4 max-h-[90vh] overflow-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <EditorToolbar
          activeTool={tool}
          onToolChange={setTool}
          onRotateCW={() => rotate(90)}
          onRotateCCW={() => rotate(-90)}
          onUndo={undo}
          onRedo={redo}
          canUndo={historyIdx > 0}
          canRedo={historyIdx < history.length - 1}
        />
      </div>

      {/* Tool options bar */}
      <div className="flex items-center gap-4 flex-wrap min-h-[40px]">
        {(tool === "draw" || tool === "eraser") && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Size</Label>
              <Slider min={1} max={50} step={1} value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} className="w-28" />
              <span className="text-xs text-muted-foreground w-6 tabular-nums">{brushSize}</span>
            </div>
            {tool === "draw" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Color</Label>
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="h-8 w-8 rounded border border-input cursor-pointer" />
              </div>
            )}
          </>
        )}
        {tool === "text" && (
          <>
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type text, then click canvas to place"
              className="w-64 h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <Label className="text-xs">Size</Label>
              <Slider min={8} max={120} step={1} value={[textSize]} onValueChange={([v]) => setTextSize(v)} className="w-20" />
              <span className="text-xs text-muted-foreground w-6 tabular-nums">{textSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Color</Label>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-8 w-8 rounded border border-input cursor-pointer" />
            </div>
          </>
        )}
        {tool === "crop" && (
          <Button size="sm" variant="secondary" onClick={applyCrop}>Apply Crop</Button>
        )}
      </div>

      {/* Side-by-side: adjustments panel + canvas */}
      <div className="flex gap-4">
        {tool === "adjust" && (
          <div className="w-56 shrink-0">
            <AdjustmentSliders adjustments={adjustments} onChange={setAdjustments} />
          </div>
        )}

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center">
          {!loaded && (
            <div className="flex items-center gap-2 py-20 absolute inset-0 z-10 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading image…</span>
            </div>
          )}
          <div
            className="relative rounded-lg overflow-hidden"
            style={{
              width: displaySize.w,
              height: displaySize.h,
              backgroundImage: checkerboardCSS,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              backgroundColor: "white",
              visibility: loaded ? "visible" : "hidden",
            }}
          >
            <canvas
              ref={canvasRef}
              className={cursorClass}
              style={{
                width: displaySize.w,
                height: displaySize.h,
                filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {tool === "crop" && (
              <CropOverlay
                containerWidth={displaySize.w}
                containerHeight={displaySize.h}
                crop={crop}
                onChange={setCrop}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={revertToOriginal} disabled={isSaving || !loaded || (historyIdx === 0 && adjustments.brightness === 100 && adjustments.contrast === 100 && adjustments.saturation === 100)} className="text-destructive hover:text-destructive">
          <RotateCcw className="h-4 w-4 mr-2" /> Revert to Original
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !loaded}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
