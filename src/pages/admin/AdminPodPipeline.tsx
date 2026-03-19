import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PipelineStepIndicator, { type PipelineStep } from "@/components/pod/PipelineStepIndicator";
import IdeaInputForm from "@/components/pod/IdeaInputForm";
import AnalysisReview from "@/components/pod/AnalysisReview";
import DesignGeneration from "@/components/pod/DesignGeneration";
import BackgroundRemovalStep from "@/components/pod/BackgroundRemovalStep";
import WizardListingsStep from "@/components/pod/WizardListingsStep";
import PodSettingsForm from "@/components/pod/PodSettingsForm";
import KanbanBoard from "@/components/pod/KanbanBoard";
import { usePodAnalyze, usePodGenerateDesigns, useRejectIdea, useDesignVersions, useSelectDesignVersion, useDeleteDesignVersion, useDropDesign, useUpdateDesignImage, usePodIdeas } from "@/hooks/usePodPipeline";
import { useGenerateListings } from "@/hooks/usePodListings";
import { LayoutGrid, PlusCircle, Settings, ArrowLeft, Sparkles } from "lucide-react";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TrendingIdeasDialog from "@/components/pod/TrendingIdeasDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ViewMode = "board" | "settings";

function statusToStep(status: string | null | undefined): PipelineStep {
  switch (status) {
    case "pending": return "review";
    case "designing": case "analyzed": case "designs_generated": return "generate";
    case "bg_removed": return "results";
    case "listings": case "ready": case "production": case "live": return "listings";
    default: return "input";
  }
}

export default function AdminPodPipeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>("board");
  const [wizardOpen, setWizardOpen] = useState(() => sessionStorage.getItem("pod_wizard_open") === "true");
  const [wizardIdea, setWizardIdea] = useState<any>(null);
  const [step, setStep] = useState<PipelineStep>(() => (sessionStorage.getItem("pod_wizard_step") as PipelineStep) || "input");
  const [productType, setProductType] = useState(() => sessionStorage.getItem("pod_wizard_product_type") || "both");
  const [loadingTypes, setLoadingTypes] = useState<Set<string>>(new Set());
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgStatus, setBgStatus] = useState<string | null>(null);
  const [generateErrors, setGenerateErrors] = useState<Record<string, string>>({});
  const [variantDefaults, setVariantDefaults] = useState<{ idea_text?: string; product_type?: string; image_url?: string } | null>(null);
  const [trendingOpen, setTrendingOpen] = useState(() => sessionStorage.getItem("pod_trending_open") === "true");
  const restoredFromSession = useRef(false);
  const handleTrendingOpenChange = (open: boolean) => {
    setTrendingOpen(open);
    sessionStorage.setItem("pod_trending_open", String(open));
  };

  const analyzeMutation = usePodAnalyze();
  const generateMutation = usePodGenerateDesigns();
  const rejectMutation = useRejectIdea();

  const { data: versions = [] } = useDesignVersions(wizardIdea?.id ?? null);
  const selectVersionMutation = useSelectDesignVersion();
  const deleteVersionMutation = useDeleteDesignVersion();
  const generateListings = useGenerateListings();
  const dropDesignMutation = useDropDesign();
  const updateDesignImage = useUpdateDesignImage();
  const { data: allIdeas = [] } = usePodIdeas();

  const bgAutoTriggeredRef = useRef(false);
  const restoredRef = useRef(false);

  // Persist wizard state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("pod_wizard_open", String(wizardOpen));
    if (!wizardOpen) {
      sessionStorage.removeItem("pod_wizard_step");
      sessionStorage.removeItem("pod_wizard_product_type");
    }
  }, [wizardOpen]);

  useEffect(() => {
    if (wizardOpen) sessionStorage.setItem("pod_wizard_step", step);
  }, [step, wizardOpen]);

  useEffect(() => {
    if (wizardOpen) sessionStorage.setItem("pod_wizard_product_type", productType);
  }, [productType, wizardOpen]);

  // Restore wizard from URL param or sessionStorage on mount
  useEffect(() => {
    if (restoredRef.current) return;
    const ideaId = searchParams.get("idea") || sessionStorage.getItem("pod_wizard_idea");
    if (ideaId && allIdeas.length > 0) {
      const found = allIdeas.find((i: any) => i.id === ideaId);
      if (found) {
        restoredRef.current = true;
        restoredFromSession.current = true;
        // Restore idea without overriding step/productType from sessionStorage
        setWizardIdea(found);
        setWizardOpen(true);
        setSearchParams({ idea: found.id });
        // Restore scroll position after render
        const savedScroll = sessionStorage.getItem("pod_scroll_y");
        if (savedScroll) {
          requestAnimationFrame(() => window.scrollTo(0, Number(savedScroll)));
        }
      }
    }
  }, [allIdeas, searchParams]);

  // Derive step from idea status ONLY on fresh opens (not session restores)
  useEffect(() => {
    if (restoredFromSession.current) {
      restoredFromSession.current = false;
      return;
    }
    if (wizardOpen && wizardIdea) {
      const derivedStep = statusToStep(wizardIdea.status);
      setStep(derivedStep);
      setProductType(wizardIdea.product_type || "both");
      setBgRemoving(false);
      bgAutoTriggeredRef.current = false;
    } else if (wizardOpen && !wizardIdea) {
      setStep("input");
      setProductType("both");
      setBgRemoving(false);
      bgAutoTriggeredRef.current = false;
    }
  }, [wizardOpen, wizardIdea?.id]);

  const [autoGenTriggered, setAutoGenTriggered] = useState(false);
  useEffect(() => {
    if (step === "generate" && wizardIdea && !wizardIdea.sticker_design_url && !wizardIdea.tshirt_design_url && loadingTypes.size === 0 && !autoGenTriggered) {
      setAutoGenTriggered(true);
      handleGenerate();
    }
    if (step !== "generate") setAutoGenTriggered(false);
  }, [step, wizardIdea?.id]);

  const openWizardForNew = () => { setWizardIdea(null); setWizardOpen(true); setSearchParams({}); sessionStorage.removeItem("pod_wizard_idea"); };
  const openWizardForIdea = (idea: any) => { setWizardIdea(idea); setWizardOpen(true); setSearchParams({ idea: idea.id }); sessionStorage.setItem("pod_wizard_idea", idea.id); };

  const closeWizard = () => {
    setWizardOpen(false); setWizardIdea(null); setStep("input"); setProductType("both");
    setLoadingTypes(new Set()); setBgRemoving(false); bgAutoTriggeredRef.current = false; setVariantDefaults(null);
    setSearchParams({});
    sessionStorage.removeItem("pod_wizard_idea");
    sessionStorage.removeItem("pod_wizard_open");
    sessionStorage.removeItem("pod_wizard_step");
    sessionStorage.removeItem("pod_wizard_product_type");
    sessionStorage.removeItem("pod_scroll_y");
  };

  // Save scroll position continuously so it survives navigation away
  useEffect(() => {
    const handleScroll = () => {
      if (wizardOpen) sessionStorage.setItem("pod_scroll_y", String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [wizardOpen]);

  const handleCreateVariant = (sourceIdea: any) => {
    const defaults = { idea_text: sourceIdea.idea_text || "", product_type: sourceIdea.product_type || "both", image_url: sourceIdea.image_url || undefined };
    setWizardOpen(false); setWizardIdea(null); setStep("input"); setProductType(defaults.product_type);
    setLoadingTypes(new Set()); setBgRemoving(false); bgAutoTriggeredRef.current = false; setVariantDefaults(defaults);
    setTimeout(() => setWizardOpen(true), 0);
  };

  const handleAnalyze = (data: { idea_text: string; images?: Array<{ base64: string; media_type: string }>; product_type: string }) => {
    setProductType(data.product_type);
    analyzeMutation.mutate(data, { onSuccess: (res) => { setWizardIdea(res.idea); setStep("review"); } });
  };

  const applyGeneratedDesignToWizardIdea = (type: "sticker" | "tshirt", idea: any) => {
    const cb = `?t=${Date.now()}`;
    const fields: Record<string, any> = { status: idea.status };
    if (type === "sticker") {
      fields.sticker_design_url = idea.sticker_design_url ? idea.sticker_design_url + cb : idea.sticker_design_url;
      fields.sticker_design_prompt = idea.sticker_design_prompt;
      fields.sticker_raw_url = idea.sticker_raw_url ? idea.sticker_raw_url + cb : idea.sticker_raw_url;
    } else {
      fields.tshirt_design_url = idea.tshirt_design_url ? idea.tshirt_design_url + cb : idea.tshirt_design_url;
      fields.tshirt_design_prompt = idea.tshirt_design_prompt;
      fields.tshirt_raw_url = idea.tshirt_raw_url ? idea.tshirt_raw_url + cb : idea.tshirt_raw_url;
    }
    setWizardIdea((prev: any) => ({ ...prev, ...fields }));
  };

  const handleGenerate = async () => {
    if (!wizardIdea) return;
    setStep("generate"); bgAutoTriggeredRef.current = false;
    const types: ("sticker" | "tshirt")[] = productType === "both" ? ["sticker", "tshirt"] : [productType as "sticker" | "tshirt"];
    setLoadingTypes(new Set(types));
    // Clear previous errors for the types being regenerated
    setGenerateErrors((prev) => { const next = { ...prev }; types.forEach((t) => delete next[t]); return next; });
    await Promise.allSettled(types.map(async (type) => {
      try {
        const res = await generateMutation.mutateAsync({
          idea_id: wizardIdea.id, product_type: type,
          sticker_prompt: type === "sticker" ? (wizardIdea.sticker_design_prompt || wizardIdea.analysis?.sticker_design_prompt) : undefined,
          tshirt_prompt: type === "tshirt" ? (wizardIdea.tshirt_design_prompt || wizardIdea.analysis?.tshirt_design_prompt) : undefined,
        });
        if (res?.idea) applyGeneratedDesignToWizardIdea(type, res.idea);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed — please try again.";
        setGenerateErrors((prev) => ({ ...prev, [type]: msg }));
      } finally {
        setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; });
      }
    }));
  };

  const handleRegenerate = async (type: "sticker" | "tshirt", guidance?: string, customPrompt?: string) => {
    if (!wizardIdea) return;
    bgAutoTriggeredRef.current = false;
    setLoadingTypes((prev) => new Set([...prev, type]));
    // Clear error for this type on retry
    setGenerateErrors((prev) => { const next = { ...prev }; delete next[type]; return next; });
    try {
      const res = await generateMutation.mutateAsync({
        idea_id: wizardIdea.id, product_type: type,
        sticker_prompt: type === "sticker" ? (customPrompt || wizardIdea.sticker_design_prompt) : undefined,
        tshirt_prompt: type === "tshirt" ? (customPrompt || wizardIdea.tshirt_design_prompt) : undefined,
        sticker_guidance: type === "sticker" ? guidance : undefined,
        tshirt_guidance: type === "tshirt" ? guidance : undefined,
      });
      if (res?.idea) applyGeneratedDesignToWizardIdea(type, res.idea);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed — please try again.";
      setGenerateErrors((prev) => ({ ...prev, [type]: msg }));
    } finally {
      setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; });
    }
  };

  useEffect(() => {
    if (step === "results" && !bgRemoving && !bgAutoTriggeredRef.current && wizardIdea && wizardIdea.status !== "bg_removed" && (wizardIdea.sticker_design_url || wizardIdea.tshirt_design_url)) {
      bgAutoTriggeredRef.current = true;
      triggerBgRemoval();
    }
  }, [step, wizardIdea?.id]);

  const triggerBgRemoval = async () => {
    if (!wizardIdea) return;
    setBgRemoving(true);
    setBgStatus(null);
     try {
      const processAndUpload = async (url: string, type: "sticker" | "tshirt") => {
        const label = type === "sticker" ? "Sticker" : "T-Shirt";
        setBgStatus(`Removing background from ${label}…`);
        console.log(`[POD] Starting bg removal for ${type}:`, url);
        
        // 1. Fetch image to blob first (helps with CORS and verification)
        const baseUrl = url.split('?')[0];
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not fetch ${type} image: ${response.statusText}`);
        const inputBlob = await response.blob();
        console.log(`[POD] Fetched ${type} input blob:`, inputBlob.size, inputBlob.type);

        // 2. Remove background locally
        const outputBlob = await imglyRemoveBackground(inputBlob, {
          debug: true,
          model: 'isnet'
        });
        console.log(`[POD] ${type} background removed. Output blob:`, outputBlob.size, outputBlob.type);
        
        // 3. Upload transparent PNG to Supabase Storage
        const filename = `${wizardIdea.id}/${type}-transparent-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("pod-assets")
          .upload(filename, outputBlob, { contentType: "image/png", upsert: true });
        
        if (uploadError) throw new Error(`Upload failed for ${type}: ${uploadError.message}`);
        
        // 4. Get public URL
        const { data: urlData } = supabase.storage.from("pod-assets").getPublicUrl(filename);
        const newUrl = urlData.publicUrl;
        
        // 5. Update DB immediately for this item
        const updateData: Record<string, any> = {
          [`${type}_design_url`]: newUrl,
          updated_at: new Date().toISOString(),
          status: "bg_removed"
        };

        // Preserve raw url if we haven't already
        const rawUrlField = `${type}_raw_url`;
        if (!wizardIdea[rawUrlField]) {
          updateData[rawUrlField] = baseUrl;
        }

        console.log(`[POD] Updating DB for ${type}...`);
        const { data: updated, error: updateError } = await supabase
          .from("az_pod_ideas" as any)
          .update(updateData as any)
          .eq("id", wizardIdea.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        // Update local state incrementally
        const cb = `?t=${Date.now()}`;
        const updatedObj = updated as Record<string, any>;
        setWizardIdea((prev: any) => ({ 
          ...prev, 
          ...updatedObj,
          [`${type}_design_url`]: updatedObj[`${type}_design_url`] + cb,
          [`${type}_raw_url`]: (updatedObj[`${type}_raw_url`] || prev?.[`${type}_raw_url`]) + cb
        }));
      };

      if (wizardIdea.sticker_design_url) {
        await processAndUpload(wizardIdea.sticker_design_url, "sticker");
      }
      if (wizardIdea.tshirt_design_url) {
        await processAndUpload(wizardIdea.tshirt_design_url, "tshirt");
      }

      toast.success("Backgrounds processed successfully");
    } catch (error) {
      console.error("[POD] Background removal chain failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove background.");
    } finally {
      setBgRemoving(false);
      setBgStatus(null);
    }
  };

  const handleApproveDesign = () => { bgAutoTriggeredRef.current = false; setStep("results"); };
  const handleApproveAfterReview = () => {
    if (!wizardIdea) return;
    generateListings.mutate(wizardIdea.id, { onSuccess: () => { setStep("listings"); } });
  };
  const handleReject = () => { if (!wizardIdea) return; rejectMutation.mutate({ id: wizardIdea.id }, { onSuccess: () => closeWizard() }); };
  const handleDropDesign = (type: "sticker" | "tshirt") => {
    if (!wizardIdea) return;
    if (productType !== "both") { handleReject(); return; }
    dropDesignMutation.mutate({ id: wizardIdea.id, dropType: type }, {
      onSuccess: (res) => { setWizardIdea(res.idea); setProductType(res.remainingType); },
    });
  };
  const handleSelectVersion = (versionId: string, pt: string) => {
    if (!wizardIdea) return;
    selectVersionMutation.mutate({ versionId, ideaId: wizardIdea.id, productType: pt }, {
      onSuccess: (version: any) => {
        const urlField = pt === "sticker" ? "sticker_design_url" : "tshirt_design_url";
        setWizardIdea((prev: any) => ({ ...prev, [urlField]: version.image_url }));
      },
    });
  };
  const handleDeleteVersion = (versionId: string) => { deleteVersionMutation.mutate(versionId); };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">POD Pipeline</h1>
        <div className="flex items-center gap-3">
          {!wizardOpen && (
            <>
              <Button size="sm" onClick={openWizardForNew} className="gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" /> New Idea
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleTrendingOpenChange(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Give me an idea
              </Button>
              <TrendingIdeasDialog
                open={trendingOpen}
                onOpenChange={handleTrendingOpenChange}
                onSelectIdea={(suggestion) => {
                  openWizardForNew();
                  setVariantDefaults({
                    idea_text: suggestion.idea_text,
                    product_type: suggestion.product_type === "both" ? "both" : suggestion.product_type,
                  });
                }}
              />
              <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)}>
                <ToggleGroupItem value="board" aria-label="Board view" className="gap-1.5 text-xs">
                  <LayoutGrid className="h-3.5 w-3.5" /> Board
                </ToggleGroupItem>
                <ToggleGroupItem value="settings" aria-label="Settings" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" /> Settings
                </ToggleGroupItem>
              </ToggleGroup>
            </>
          )}
          {wizardOpen && (
            <Button variant="ghost" size="sm" onClick={closeWizard} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Board
            </Button>
          )}
        </div>
      </div>

      {wizardOpen ? (
        <div>
          <PipelineStepIndicator current={step} />
          {step === "input" && <IdeaInputForm onSubmit={handleAnalyze} isLoading={analyzeMutation.isPending} defaultValues={variantDefaults} />}
          {step === "review" && wizardIdea?.analysis && (
            <AnalysisReview analysis={wizardIdea.analysis} productType={productType} onReject={handleReject} onGenerate={handleGenerate} isLoading={rejectMutation.isPending} />
          )}
          {step === "generate" && (
            <DesignGeneration idea={wizardIdea} productType={productType} onReject={handleReject} onApprove={handleApproveDesign} onRegenerate={handleRegenerate} onGenerate={handleGenerate} onCancel={(type) => setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; })} onDropDesign={handleDropDesign} loadingTypes={loadingTypes} isApproving={false} versions={versions} onSelectVersion={handleSelectVersion} onDeleteVersion={handleDeleteVersion} isSelectingVersion={selectVersionMutation.isPending} isDeletingVersion={deleteVersionMutation.isPending} generateErrors={generateErrors} />
          )}
          {step === "results" && wizardIdea && (
            <BackgroundRemovalStep idea={wizardIdea} productType={productType} onApprove={handleApproveAfterReview} onReject={handleReject} onBack={() => { bgAutoTriggeredRef.current = false; setStep("generate"); }} onDropDesign={handleDropDesign} onEditSave={(type, blob) => { updateDesignImage.mutate({ ideaId: wizardIdea.id, productType: type, blob }, { onSuccess: (updatedIdea: any) => { setWizardIdea((prev: any) => ({ ...prev, ...updatedIdea })); } }); }} isApproving={generateListings.isPending} isBgRemoving={bgRemoving} bgStatus={bgStatus} isEditSaving={updateDesignImage.isPending} />
          )}
          {step === "listings" && wizardIdea && (
            <WizardListingsStep idea={wizardIdea} onBack={() => { bgAutoTriggeredRef.current = true; setStep("results"); }} onClose={closeWizard} onReject={handleReject} onDropDesign={handleDropDesign} onIdeaUpdated={(updated: any) => setWizardIdea((prev: any) => ({ ...prev, ...updated }))} onCreateVariant={handleCreateVariant} />
          )}
        </div>
      ) : (
        <>
          {view === "board" && <KanbanBoard onCardClick={openWizardForIdea} />}
          {view === "settings" && <PodSettingsForm />}
        </>
      )}
    </div>
  );
}
