import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, Sparkles } from "lucide-react";

interface ImageItem {
  preview: string;
  base64: string;
  media_type: string;
}

interface DefaultValues {
  idea_text?: string;
  product_type?: string;
  image_url?: string;
}

interface Props {
  onSubmit: (data: {
    idea_text: string;
    images?: Array<{ base64: string; media_type: string }>;
    product_type: string;
  }) => void;
  isLoading: boolean;
  defaultValues?: DefaultValues | null;
}

export default function IdeaInputForm({ onSubmit, isLoading, defaultValues }: Props) {
  const [ideaText, setIdeaText] = useState(defaultValues?.idea_text || "");
  const [productType, setProductType] = useState(defaultValues?.product_type || "both");
  const [images, setImages] = useState<ImageItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Pre-load image from defaultValues (variant flow)
  useEffect(() => {
    if (!defaultValues?.image_url) return;
    setImageLoading(true);
    fetch(defaultValues.image_url)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setImages([{
            preview: result,
            base64: result.split(",")[1],
            media_type: blob.type || "image/png",
          }]);
          setImageLoading(false);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => setImageLoading(false));
  }, [defaultValues?.image_url]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImages((prev) => [
        ...prev,
        {
          preview: result,
          base64: result.split(",")[1],
          media_type: file.type,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    files.forEach(handleFile);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
          <label className="text-sm font-medium mb-2 block" htmlFor="idea-text">Idea Text</label>
          <Textarea
            id="idea-text"
            placeholder="Describe the meme, viral text, or content idea..."
            rows={4}
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Images (optional)
          </label>

          <div className="flex flex-wrap gap-3">
            {/* Existing image thumbnails */}
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative w-28 h-28 rounded-lg overflow-hidden border border-border bg-muted"
              >
                <img
                  src={img.preview}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                  onClick={() => removeImage(idx)}
                  aria-label={`Remove image ${idx + 1}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            ))}

            {/* Loading placeholder for variant pre-load */}
            {imageLoading && (
              <Skeleton className="w-28 h-28 rounded-lg" />
            )}

            {/* Always-visible upload zone */}
            <div
              className="w-28 h-28 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-5 w-5 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground text-center px-1">
                Add image
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach(handleFile);
                  }
                  e.target.value = "";
                }}
              />
            </div>
          </div>
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
          onClick={() =>
            onSubmit({
              idea_text: ideaText,
              images: images.length
                ? images.map((img) => ({
                    base64: img.base64,
                    media_type: img.media_type,
                  }))
                : undefined,
              product_type: productType,
            })
          }
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Analyze Idea
        </Button>
      </CardContent>
    </Card>
  );
}
