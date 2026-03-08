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
import { usePodAnalyze, usePodGenerateDesigns, useRejectIdea, useDesignVersions, useSelectDesignVersion, useDeleteDesignVersion, usePodRemoveBg, useDropDesign, useUpdateDesignImage, usePodIdeas } from "@/hooks/usePodPipeline";
import { useGenerateListings } from "@/hooks/usePodListings";
import { LayoutGrid, PlusCircle, Settings, ArrowLeft, Sparkles } from "lucide-react";
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIdea, setWizardIdea] = useState<any>(null);
  const [step, setStep] = useState<PipelineStep>("input");
  const [productType, setProductType] = useState("both");
  const [loadingTypes, setLoadingTypes] = useState<Set<string>>(new Set());
  const [bgRemoving, setBgRemoving] = useState(false);
  const [variantDefaults, setVariantDefaults] = useState<{ idea_text?: string; product_type?: string; image_url?: string } | null>(null);
  const [trendingOpen, setTrendingOpen] = useState(false);

  const analyzeMutation = usePodAnalyze();
  const generateMutation = usePodGenerateDesigns();
  const rejectMutation = useRejectIdea();
  const removeBgMutation = usePodRemoveBg();
  const { data: versions = [] } = useDesignVersions(wizardIdea?.id ?? null);
  const selectVersionMutation = useSelectDesignVersion();
  const deleteVersionMutation = useDeleteDesignVersion();
  const generateListings = useGenerateListings();
  const dropDesignMutation = useDropDesign();
  const updateDesignImage = useUpdateDesignImage();
  const { data: allIdeas = [] } = usePodIdeas();

  const bgAutoTriggeredRef = useRef(false);
  const restoredRef = useRef(false);

  // Restore wizard from URL param on mount
  useEffect(() => {
    if (restoredRef.current || wizardOpen) return;
    const ideaId = searchParams.get("idea");
    if (ideaId && allIdeas.length > 0) {
      const found = allIdeas.find((i: any) => i.id === ideaId);
      if (found) {
        restoredRef.current = true;
        openWizardForIdea(found);
      }
    }
  }, [allIdeas, searchParams]);

  useEffect(() => {
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

  const openWizardForNew = () => { setWizardIdea(null); setWizardOpen(true); setSearchParams({}); };
  const openWizardForIdea = (idea: any) => { setWizardIdea(idea); setWizardOpen(true); setSearchParams({ idea: idea.id }); };

  const closeWizard = () => {
    setWizardOpen(false); setWizardIdea(null); setStep("input"); setProductType("both");
    setLoadingTypes(new Set()); setBgRemoving(false); bgAutoTriggeredRef.current = false; setVariantDefaults(null);
    setSearchParams({});
  };

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
    await Promise.allSettled(types.map(async (type) => {
      try {
        const res = await generateMutation.mutateAsync({
          idea_id: wizardIdea.id, product_type: type,
          sticker_prompt: type === "sticker" ? (wizardIdea.sticker_design_prompt || wizardIdea.analysis?.sticker_design_prompt) : undefined,
          tshirt_prompt: type === "tshirt" ? (wizardIdea.tshirt_design_prompt || wizardIdea.analysis?.tshirt_design_prompt) : undefined,
        });
        if (res?.idea) applyGeneratedDesignToWizardIdea(type, res.idea);
      } finally {
        setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; });
      }
    }));
  };

  const handleRegenerate = async (type: "sticker" | "tshirt", guidance?: string, customPrompt?: string) => {
    if (!wizardIdea) return;
    bgAutoTriggeredRef.current = false;
    setLoadingTypes((prev) => new Set([...prev, type]));
    try {
      const res = await generateMutation.mutateAsync({
        idea_id: wizardIdea.id, product_type: type,
        sticker_prompt: type === "sticker" ? (customPrompt || wizardIdea.sticker_design_prompt) : undefined,
        tshirt_prompt: type === "tshirt" ? (customPrompt || wizardIdea.tshirt_design_prompt) : undefined,
        sticker_guidance: type === "sticker" ? guidance : undefined,
        tshirt_guidance: type === "tshirt" ? guidance : undefined,
      });
      if (res?.idea) applyGeneratedDesignToWizardIdea(type, res.idea);
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

  const triggerBgRemoval = () => {
    if (!wizardIdea) return;
    setBgRemoving(true);
    removeBgMutation.mutate(wizardIdea.id, {
      onSuccess: (res) => {
        const cb = `?t=${Date.now()}`;
        const idea = { ...res.idea };
        if (idea.sticker_design_url) idea.sticker_design_url += cb;
        if (idea.tshirt_design_url) idea.tshirt_design_url += cb;
        if (idea.sticker_raw_url) idea.sticker_raw_url += cb;
        if (idea.tshirt_raw_url) idea.tshirt_raw_url += cb;
        setWizardIdea(idea);
        setBgRemoving(false);
      },
      onError: () => { setBgRemoving(false); },
    });
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
                onClick={() => setTrendingOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Give me an idea
              </Button>
              <TrendingIdeasDialog
                open={trendingOpen}
                onOpenChange={setTrendingOpen}
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
            <DesignGeneration idea={wizardIdea} productType={productType} onReject={handleReject} onApprove={handleApproveDesign} onRegenerate={handleRegenerate} onGenerate={handleGenerate} onCancel={(type) => setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; })} onDropDesign={handleDropDesign} loadingTypes={loadingTypes} isApproving={false} versions={versions} onSelectVersion={handleSelectVersion} onDeleteVersion={handleDeleteVersion} isSelectingVersion={selectVersionMutation.isPending} isDeletingVersion={deleteVersionMutation.isPending} />
          )}
          {step === "results" && wizardIdea && (
            <BackgroundRemovalStep idea={wizardIdea} productType={productType} onApprove={handleApproveAfterReview} onReject={handleReject} onBack={() => { bgAutoTriggeredRef.current = false; setStep("generate"); }} onDropDesign={handleDropDesign} onEditSave={(type, blob) => { updateDesignImage.mutate({ ideaId: wizardIdea.id, productType: type, blob }, { onSuccess: (updatedIdea: any) => { setWizardIdea((prev: any) => ({ ...prev, ...updatedIdea })); } }); }} isApproving={generateListings.isPending} isBgRemoving={bgRemoving} isEditSaving={updateDesignImage.isPending} />
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
