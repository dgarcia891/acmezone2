import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import PipelineStepIndicator, { type PipelineStep } from "@/components/pod/PipelineStepIndicator";
import IdeaInputForm from "@/components/pod/IdeaInputForm";
import AnalysisReview from "@/components/pod/AnalysisReview";
import DesignGeneration from "@/components/pod/DesignGeneration";
import BackgroundRemovalStep from "@/components/pod/BackgroundRemovalStep";
import WizardListingsStep from "@/components/pod/WizardListingsStep";
import WizardSummaryStep from "@/components/pod/WizardSummaryStep";
import PodSettingsForm from "@/components/pod/PodSettingsForm";
import KanbanBoard from "@/components/pod/KanbanBoard";
import { usePodAnalyze, usePodGenerateDesigns, useRejectIdea, useDesignVersions, useSelectDesignVersion, useDeleteDesignVersion, usePodRemoveBg, useDropDesign } from "@/hooks/usePodPipeline";
import { useGenerateListings } from "@/hooks/usePodListings";
import { LayoutGrid, PlusCircle, Settings, ArrowLeft } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ViewMode = "board" | "settings";

/** Map an idea's DB status to the wizard step */
function statusToStep(status: string | null | undefined): PipelineStep {
  switch (status) {
    case "pending":
      return "review";
    case "designing":
    case "analyzed":
    case "designs_generated":
      return "generate";
    case "bg_removed":
      return "remove_bg";
    case "listings":
      return "listings";
    case "ready":
    case "production":
    case "live":
      return "summary";
    default:
      return "input";
  }
}

const PodPipeline = () => {
  const [view, setView] = useState<ViewMode>("board");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIdea, setWizardIdea] = useState<any>(null);
  const [step, setStep] = useState<PipelineStep>("input");
  const [productType, setProductType] = useState("both");
  const [loadingTypes, setLoadingTypes] = useState<Set<string>>(new Set());
  const [bgRemoved, setBgRemoved] = useState(false);

  const analyzeMutation = usePodAnalyze();
  const generateMutation = usePodGenerateDesigns();
  const rejectMutation = useRejectIdea();
  const removeBgMutation = usePodRemoveBg();
  const { data: versions = [] } = useDesignVersions(wizardIdea?.id ?? null);
  const selectVersionMutation = useSelectDesignVersion();
  const deleteVersionMutation = useDeleteDesignVersion();
  const generateListings = useGenerateListings();
  const dropDesignMutation = useDropDesign();

  // When opening wizard for an existing idea, derive step from status
  useEffect(() => {
    if (wizardOpen && wizardIdea) {
      const derivedStep = statusToStep(wizardIdea.status);
      setStep(derivedStep);
      setProductType(wizardIdea.product_type || "both");
      setBgRemoved(wizardIdea.status === "bg_removed");
    } else if (wizardOpen && !wizardIdea) {
      setStep("input");
      setProductType("both");
      setBgRemoved(false);
    }
  }, [wizardOpen, wizardIdea?.id]);

  // Auto-trigger design generation when entering generate step with no existing designs
  const [autoGenTriggered, setAutoGenTriggered] = useState(false);
  useEffect(() => {
    if (
      step === "generate" &&
      wizardIdea &&
      !wizardIdea.sticker_design_url &&
      !wizardIdea.tshirt_design_url &&
      loadingTypes.size === 0 &&
      !autoGenTriggered
    ) {
      setAutoGenTriggered(true);
      handleGenerate();
    }
    if (step !== "generate") {
      setAutoGenTriggered(false);
    }
  }, [step, wizardIdea?.id]);

  const openWizardForNew = () => {
    setWizardIdea(null);
    setWizardOpen(true);
  };

  const openWizardForIdea = (idea: any) => {
    setWizardIdea(idea);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardIdea(null);
    setStep("input");
    setProductType("both");
    setLoadingTypes(new Set());
    setBgRemoved(false);
  };

  const handleAnalyze = (data: { idea_text: string; image_base64?: string; image_media_type?: string; product_type: string }) => {
    setProductType(data.product_type);
    analyzeMutation.mutate(data, {
      onSuccess: (res) => {
        setWizardIdea(res.idea);
        setStep("review");
      },
    });
  };

  const handleGenerate = () => {
    if (!wizardIdea) return;
    setStep("generate");
    const types: ("sticker" | "tshirt")[] = productType === "both" ? ["sticker", "tshirt"] : [productType as "sticker" | "tshirt"];
    setLoadingTypes(new Set(types));
    // Fire each type independently so one doesn't block the other
    types.forEach((type) => {
      generateMutation.mutate({
        idea_id: wizardIdea.id,
        product_type: type,
        sticker_prompt: type === "sticker" ? (wizardIdea.sticker_design_prompt || wizardIdea.analysis?.sticker_design_prompt) : undefined,
        tshirt_prompt: type === "tshirt" ? (wizardIdea.tshirt_design_prompt || wizardIdea.analysis?.tshirt_design_prompt) : undefined,
      }, {
        onSuccess: (res) => {
          // Only merge the fields for THIS type to prevent race condition overwrites
          const idea = res.idea;
          const fields: Record<string, any> = { status: idea.status };
          if (type === "sticker") {
            fields.sticker_design_url = idea.sticker_design_url;
            fields.sticker_design_prompt = idea.sticker_design_prompt;
            fields.sticker_raw_url = idea.sticker_raw_url;
          } else {
            fields.tshirt_design_url = idea.tshirt_design_url;
            fields.tshirt_design_prompt = idea.tshirt_design_prompt;
            fields.tshirt_raw_url = idea.tshirt_raw_url;
          }
          setWizardIdea((prev: any) => ({ ...prev, ...fields }));
          setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; });
        },
        onError: () => setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; }),
      });
    });
  };

  const handleRegenerate = (type: "sticker" | "tshirt", customPrompt?: string) => {
    if (!wizardIdea) return;
    setLoadingTypes((prev) => new Set([...prev, type]));
    generateMutation.mutate({
      idea_id: wizardIdea.id,
      product_type: type,
      sticker_prompt: type === "sticker" ? (customPrompt || wizardIdea.sticker_design_prompt) : undefined,
      tshirt_prompt: type === "tshirt" ? (customPrompt || wizardIdea.tshirt_design_prompt) : undefined,
    }, {
      onSuccess: (res) => {
        const idea = res.idea;
        const fields: Record<string, any> = { status: idea.status };
        if (type === "sticker") {
          fields.sticker_design_url = idea.sticker_design_url;
          fields.sticker_design_prompt = idea.sticker_design_prompt;
          fields.sticker_raw_url = idea.sticker_raw_url;
        } else {
          fields.tshirt_design_url = idea.tshirt_design_url;
          fields.tshirt_design_prompt = idea.tshirt_design_prompt;
          fields.tshirt_raw_url = idea.tshirt_raw_url;
        }
        setWizardIdea((prev: any) => ({ ...prev, ...fields }));
        setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; });
      },
      onError: () => setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; }),
    });
  };

  const handleApproveDesign = () => {
    if (!wizardIdea) return;
    setBgRemoved(false);
    setStep("remove_bg");
  };

  const handleRemoveBg = () => {
    if (!wizardIdea) return;
    removeBgMutation.mutate(wizardIdea.id, {
      onSuccess: (res) => {
        setWizardIdea(res.idea);
        setBgRemoved(true);
      },
    });
  };

  const handleApproveAfterBg = () => {
    if (!wizardIdea) return;
    generateListings.mutate(wizardIdea.id, {
      onSuccess: () => {
        setStep("listings");
      },
    });
  };

  const handleReject = () => {
    if (!wizardIdea) return;
    rejectMutation.mutate({ id: wizardIdea.id }, {
      onSuccess: () => closeWizard(),
    });
  };

  const handleDropDesign = (type: "sticker" | "tshirt") => {
    if (!wizardIdea) return;
    // If only one type exists, dropping it rejects the whole idea
    if (productType !== "both") {
      handleReject();
      return;
    }
    dropDesignMutation.mutate({ id: wizardIdea.id, dropType: type }, {
      onSuccess: (res) => {
        setWizardIdea(res.idea);
        setProductType(res.remainingType);
      },
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

  const handleDeleteVersion = (versionId: string) => {
    deleteVersionMutation.mutate(versionId);
  };

  return (
    <>
      <Helmet><title>POD Pipeline | acme.zone</title></Helmet>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">POD Pipeline</h1>
            <div className="flex items-center gap-3">
              {!wizardOpen && (
                <>
                  <Button size="sm" onClick={openWizardForNew} className="gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" /> New Idea
                  </Button>
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

          {/* Main content */}
          {wizardOpen ? (
            <div>
              <PipelineStepIndicator current={step} />

              {step === "input" && (
                <IdeaInputForm onSubmit={handleAnalyze} isLoading={analyzeMutation.isPending} />
              )}

              {step === "review" && wizardIdea?.analysis && (
                <AnalysisReview
                  analysis={wizardIdea.analysis}
                  productType={productType}
                  onReject={handleReject}
                  onGenerate={handleGenerate}
                  isLoading={rejectMutation.isPending}
                />
              )}

              {step === "generate" && (
                <DesignGeneration
                  idea={wizardIdea}
                  productType={productType}
                  onReject={handleReject}
                  onApprove={handleApproveDesign}
                  onRegenerate={handleRegenerate}
                  onGenerate={handleGenerate}
                  onCancel={(type) => setLoadingTypes((prev) => { const n = new Set(prev); n.delete(type); return n; })}
                  onDropDesign={handleDropDesign}
                  loadingTypes={loadingTypes}
                  isApproving={generateListings.isPending}
                  versions={versions}
                  onSelectVersion={handleSelectVersion}
                  onDeleteVersion={handleDeleteVersion}
                  isSelectingVersion={selectVersionMutation.isPending}
                  isDeletingVersion={deleteVersionMutation.isPending}
                />
               )}

              {step === "remove_bg" && wizardIdea && (
                <BackgroundRemovalStep
                  idea={wizardIdea}
                  productType={productType}
                  onRemoveBg={handleRemoveBg}
                  onApprove={handleApproveAfterBg}
                  onReject={handleReject}
                  onBack={() => setStep("generate")}
                  onDropDesign={handleDropDesign}
                  isRemoving={removeBgMutation.isPending}
                  isApproving={generateListings.isPending}
                  bgRemoved={bgRemoved}
                />
              )}

              {step === "listings" && wizardIdea && (
                <WizardListingsStep
                  idea={wizardIdea}
                  onBack={() => setStep("remove_bg")}
                  onReject={handleReject}
                  onDropDesign={handleDropDesign}
                  onApproved={() => {
                    setWizardIdea((prev: any) => ({ ...prev, status: "ready" }));
                    setStep("summary");
                  }}
                />
              )}

              {step === "summary" && wizardIdea && (
                <WizardSummaryStep
                  idea={wizardIdea}
                  onClose={closeWizard}
                  onIdeaUpdated={(updated: any) => setWizardIdea((prev: any) => ({ ...prev, ...updated }))}
                />
              )}
            </div>
          ) : (
            <>
              {view === "board" && <KanbanBoard onCardClick={openWizardForIdea} />}
              {view === "settings" && <PodSettingsForm />}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PodPipeline;
