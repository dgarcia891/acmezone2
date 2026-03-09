import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Copy, Download, Package, Loader2, CheckCircle2, ExternalLink, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Listing {
  id: string;
  idea_id: string;
  product_type: string;
  title: string;
  description: string;
  tags: string[];
  etsy_title?: string;
  ebay_title?: string;
}

interface Props {
  idea: {
    id: string;
    sticker_design_url?: string | null;
    tshirt_design_url?: string | null;
  };
  listings: Listing[];
}

const SPREADSHIRT_MAX_TITLE = 50;
const SPREADSHIRT_IMAGE_SIZE = 4000;

export default function SpreadshirtExport({ idea, listings }: Props) {
  const [downloadingSticker, setDownloadingSticker] = useState(false);
  const [downloadingTshirt, setDownloadingTshirt] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const STORAGE_KEY = "pod-spreadshirt-expanded";
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const stickerListing = listings.find((l) => l.product_type === "sticker");
  const tshirtListing = listings.find((l) => l.product_type === "tshirt");

  const hasSticker = !!idea.sticker_design_url && !!stickerListing;
  const hasTshirt = !!idea.tshirt_design_url && !!tshirtListing;

  if (!hasSticker && !hasTshirt) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatTitle = (title: string) => {
    return title.length > SPREADSHIRT_MAX_TITLE 
      ? title.slice(0, SPREADSHIRT_MAX_TITLE - 3) + "..." 
      : title;
  };

  const formatTags = (tags: string[]) => tags.join(", ");

  const downloadResizedImage = async (
    imageUrl: string,
    filename: string,
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pod-export-image", {
        body: { image_url: imageUrl, width: SPREADSHIRT_IMAGE_SIZE, height: SPREADSHIRT_IMAGE_SIZE },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Convert base64 to blob and download
      const byteString = atob(data.base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: "image/png" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download image");
    } finally {
      setLoading(false);
    }
  };

  const downloadAllWithCsv = async () => {
    setDownloadingAll(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const csvRows: string[] = ["title,description,tags,image_filename"];

      const downloadAndAddToZip = async (
        imageUrl: string,
        listing: Listing,
        filename: string
      ) => {
        const { data, error } = await supabase.functions.invoke("pod-export-image", {
          body: { image_url: imageUrl, width: SPREADSHIRT_IMAGE_SIZE, height: SPREADSHIRT_IMAGE_SIZE },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || "Failed to process image");
        }

        const byteString = atob(data.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        zip.file(filename, ab);

        const escapedTitle = `"${formatTitle(listing.title).replace(/"/g, '""')}"`;
        const escapedDesc = `"${listing.description.replace(/"/g, '""')}"`;
        const escapedTags = `"${formatTags(listing.tags).replace(/"/g, '""')}"`;
        csvRows.push(`${escapedTitle},${escapedDesc},${escapedTags},${filename}`);
      };

      const tasks: Promise<void>[] = [];

      if (hasSticker && stickerListing && idea.sticker_design_url) {
        tasks.push(downloadAndAddToZip(idea.sticker_design_url, stickerListing, "sticker_design.png"));
      }

      if (hasTshirt && tshirtListing && idea.tshirt_design_url) {
        tasks.push(downloadAndAddToZip(idea.tshirt_design_url, tshirtListing, "tshirt_design.png"));
      }

      await Promise.all(tasks);

      zip.file("metadata.csv", csvRows.join("\n"));

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spreadshirt-export-${idea.id.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export package downloaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to create export package");
    } finally {
      setDownloadingAll(false);
    }
  };

  const DesignRow = ({
    label,
    imageUrl,
    listing,
    downloading,
    onDownload,
  }: {
    label: string;
    imageUrl: string;
    listing: Listing;
    downloading: boolean;
    onDownload: () => void;
  }) => (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
      <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
        <img src={imageUrl} alt={label} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          <Badge variant="outline" className="text-[10px]">
            {SPREADSHIRT_IMAGE_SIZE}×{SPREADSHIRT_IMAGE_SIZE}px
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(formatTitle(listing.title), "Title")}
            className="text-xs h-7"
          >
            <Copy className="h-3 w-3 mr-1" /> Title
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(listing.description, "Description")}
            className="text-xs h-7"
          >
            <Copy className="h-3 w-3 mr-1" /> Description
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(formatTags(listing.tags), "Tags")}
            className="text-xs h-7"
          >
            <Copy className="h-3 w-3 mr-1" /> Tags
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDownload}
          disabled={downloading}
          className="text-xs h-7"
        >
          {downloading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Download className="h-3 w-3 mr-1" />
          )}
          Download PNG
        </Button>
      </div>
    </div>
  );

  const STORAGE_KEY = "pod-spreadshirt-expanded";
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleToggle = (value: boolean) => {
    setOpen(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  };

  return (
    <Collapsible open={open} onOpenChange={handleToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Export to Spreadshirt</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://partner.spreadshirt.com/designs/upload"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open Partner Area <ExternalLink className="h-3 w-3" />
                </a>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Download properly-sized images and copy metadata for Spreadshirt's Partner Area upload.
            </p>

            {hasSticker && stickerListing && idea.sticker_design_url && (
              <DesignRow
                label="Sticker Design"
                imageUrl={idea.sticker_design_url}
                listing={stickerListing}
                downloading={downloadingSticker}
                onDownload={() =>
                  downloadResizedImage(
                    idea.sticker_design_url!,
                    `sticker-${idea.id.slice(0, 8)}.png`,
                    setDownloadingSticker
                  )
                }
              />
            )}

            {hasTshirt && tshirtListing && idea.tshirt_design_url && (
              <DesignRow
                label="T-Shirt Design"
                imageUrl={idea.tshirt_design_url}
                listing={tshirtListing}
                downloading={downloadingTshirt}
                onDownload={() =>
                  downloadResizedImage(
                    idea.tshirt_design_url!,
                    `tshirt-${idea.id.slice(0, 8)}.png`,
                    setDownloadingTshirt
                  )
                }
              />
            )}

            <div className="pt-2 border-t border-border">
              <Button
                onClick={downloadAllWithCsv}
                disabled={downloadingAll}
                className="w-full"
                variant="default"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" /> Download All + CSV
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                ZIP contains resized images and metadata.csv for bulk upload
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
