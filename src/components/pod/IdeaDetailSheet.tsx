import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, RefreshCw, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { useUpdateIdeaStatus, useUpdateIdeaNotes, useUpdateIdeaPriority, usePodLabels, useIdeaLabels, useToggleIdeaLabel } from "@/hooks/usePodKanban";
import { usePodGenerateDesigns, usePodApprove, useRejectIdea } from "@/hooks/usePodPipeline";
import { usePodListings, useGenerateListings, useUpdateListing, useApproveListings } from "@/hooks/usePodListings";
import ListingEditor from "./ListingEditor";

const ALL_STATUSES = [
  { value: "pending", label: "📥 New" },
  { value: "designing", label: "🎨 Designing" },
  { value: "listings", label: "📝 Listings" },
  { value: "ready", label: "✅ Ready" },
  { value: "production", label: "📦 Production" },
  { value: "live", label: "🚀 Live" },
  { value: "rejected", label: "❌ Rejected" },
];

const PRIORITIES = ["low", "normal", "high", "urgent"];

interface Props {
  idea: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IdeaDetailSheet({ idea, open, onOpenChange }: Props) {
  const [notes, setNotes] = useState("");
  const updateStatus = useUpdateIdeaStatus();
  const updateNotes = useUpdateIdeaNotes();
  const updatePriority = useUpdateIdeaPriority();
  const generateMutation = usePodGenerateDesigns();
  const approveMutation = usePodApprove();
  const rejectMutation = useRejectIdea();
  const { data: allLabels = [] } = usePodLabels();
  const { data: ideaLabelIds = [] } = useIdeaLabels(idea?.id ?? null);
  const toggleLabel = useToggleIdeaLabel();
  const generateListings = useGenerateListings();
  const approveListings = useApproveListings();
  const { data: listings = [] } = usePodListings(idea?.id ?? null);

  useEffect(() => {
    setNotes(idea?.notes || "");
  }, [idea?.id, idea?.notes]);

  if (!idea) return null;

  const analysis = idea.analysis || {};
  const analysisKeys = Object.keys(analysis).filter((k) => k !== "commercial_viability_score");
  const assignedLabels = allLabels.filter((l) => ideaLabelIds.includes(l.id));
  const unassignedLabels = allLabels.filter((l) => !ideaLabelIds.includes(l.id));

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ id: idea.id, status });
  };

  const handleNotesBlur = () => {
    if (notes !== (idea.notes || "")) {
      updateNotes.mutate({ id: idea.id, notes });
    }
  };

  const handleGenerate = () => {
    generateMutation.mutate({
      idea_id: idea.id,
      product_type: idea.product_type || "both",
      sticker_prompt: idea.sticker_design_prompt,
      tshirt_prompt: idea.tshirt_design_prompt,
    });
  };

  const handleApproveDesign = () => {
    generateListings.mutate(idea.id);
  };

  const handleApproveListings = () => {
    approveListings.mutate(idea.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{idea.idea_text || "Untitled idea"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={idea.status || "pending"} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select value={idea.priority || "normal"} onValueChange={(p) => updatePriority.mutate({ id: idea.id, priority: p })}>
                <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Viability Score */}
          {analysis.commercial_viability_score != null && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Viability Score</label>
              <Badge variant={analysis.commercial_viability_score >= 7 ? "default" : analysis.commercial_viability_score >= 4 ? "outline" : "destructive"}>
                {analysis.commercial_viability_score}/10
              </Badge>
            </div>
          )}

          {/* Labels */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Labels</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {assignedLabels.map((l) => (
                <Badge key={l.id} style={{ backgroundColor: l.color, color: "#fff" }} className="text-[10px] gap-1 pr-1">
                  {l.name}
                  <button onClick={() => toggleLabel.mutate({ ideaId: idea.id, labelId: l.id, add: false })} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {unassignedLabels.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-5 px-1.5 text-[10px]">
                      <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5" align="start">
                    {unassignedLabels.map((l) => (
                      <button
                        key={l.id}
                        className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent text-left"
                        onClick={() => toggleLabel.mutate({ ideaId: idea.id, labelId: l.id, add: true })}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                        {l.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Design Previews */}
          {(idea.sticker_design_url || idea.tshirt_design_url) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Designs</label>
              <div className="grid grid-cols-2 gap-2">
                {idea.sticker_design_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Sticker</p>
                    <img src={idea.sticker_design_url} alt="Sticker design" className="w-full rounded border border-border" />
                  </div>
                )}
                {idea.tshirt_design_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">T-Shirt</p>
                    <img src={idea.tshirt_design_url} alt="T-shirt design" className="w-full rounded border border-border" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Listings Content (when status is listings or later) */}
          {listings.length > 0 && (
            <div>
              <Separator className="mb-3" />
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Listing Content</label>
              <div className="space-y-4">
                {listings.map((listing: any) => (
                  <ListingEditor key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}

          {/* Analysis */}
          {analysisKeys.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Analysis</label>
              <div className="grid grid-cols-1 gap-1.5">
                {analysisKeys.map((key) => (
                  <div key={key} className="bg-muted rounded p-2">
                    <p className="text-[10px] font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {typeof analysis[key] === "object" ? JSON.stringify(analysis[key], null, 2) : String(analysis[key])}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes…"
              className="text-xs min-h-[60px] resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {idea.status === "pending" && (
              <Button size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? "Starting Pipeline…" : "Start Pipeline"}
              </Button>
            )}
            {idea.status === "designing" && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApproveDesign} disabled={generateListings.isPending}>
                {generateListings.isPending ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating Listings…</>
                ) : (
                  "Approve Design"
                )}
              </Button>
            )}
            {idea.status === "listings" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApproveListings} disabled={approveListings.isPending}>
                  {approveListings.isPending ? "Approving…" : "Approve Listings"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => generateListings.mutate(idea.id)} disabled={generateListings.isPending}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${generateListings.isPending ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
              </>
            )}
            {idea.status === "ready" && (
              <Button size="sm" onClick={() => handleStatusChange("production")}>Send to Printify</Button>
            )}
            {idea.status === "production" && (
              <Button size="sm" onClick={() => handleStatusChange("live")}>Mark as Live</Button>
            )}
            {idea.status !== "rejected" && idea.status !== "live" && (
              <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate({ id: idea.id })} disabled={rejectMutation.isPending}>
                Reject
              </Button>
            )}
          </div>

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Created {idea.created_at ? formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }) : "—"}</p>
            <p>Updated {idea.updated_at ? formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true }) : "—"}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
