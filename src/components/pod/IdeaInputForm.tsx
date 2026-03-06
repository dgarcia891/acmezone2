import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, Sparkles } from "lucide-react";

interface Props {
  onSubmit: (data: { idea_text: string; image_base64?: string; image_media_type?: string; product_type: string }) => void;
  isLoading: boolean;
}

export default function IdeaInputForm({ onSubmit, isLoading }: Props) {
  const [ideaText, setIdeaText] = useState("");
  const [productType, setProductType] = useState("both");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
      setImageMediaType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit New Idea</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Idea Text</label>
          <Textarea
            placeholder="Describe the meme, viral text, or content idea..."
            rows={4}
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Image (optional)</label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => { setImagePreview(null); setImageBase64(null); setImageMediaType(null); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Drag & drop an image here, or click to browse</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Product Type</label>
          <ToggleGroup
            type="single"
            value={productType}
            onValueChange={(v) => v && setProductType(v)}
          >
            <ToggleGroupItem value="both">Both</ToggleGroupItem>
            <ToggleGroupItem value="sticker">Sticker</ToggleGroupItem>
            <ToggleGroupItem value="tshirt">T-Shirt</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button
          className="w-full sm:w-auto"
          disabled={!ideaText.trim()}
          onClick={() => onSubmit({
            idea_text: ideaText,
            image_base64: imageBase64 || undefined,
            image_media_type: imageMediaType || undefined,
            product_type: productType,
          })}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Analyze Idea
        </Button>
      </CardContent>
    </Card>
  );
}
