import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import PipelineStepIndicator, { type PipelineStep } from "@/components/pod/PipelineStepIndicator";
import IdeaInputForm from "@/components/pod/IdeaInputForm";
import AnalysisReview from "@/components/pod/AnalysisReview";
import DesignGeneration from "@/components/pod/DesignGeneration";
import ApprovalSuccess from "@/components/pod/ApprovalSuccess";
import PodSettingsForm from "@/components/pod/PodSettingsForm";
import KanbanBoard from "@/components/pod/KanbanBoard";
import { usePodAnalyze, usePodGenerateDesigns, usePodApprove, useRejectIdea, useDesignVersions, useSelectDesignVersion, useDeleteDesignVersion } from "@/hooks/usePodPipeline";
import { useGenerateListings } from "@/hooks/usePodListings";
import { LayoutGrid, PlusCircle, Settings } from "lucide-react";

type ViewMode = "board" | "new" | "settings";

const PodPipeline = () => {
  const [view, setView] = useState<ViewMode>("board");
  const [step, setStep] = useState<PipelineStep>("input");
  const [currentIdea, setCurrentIdea] = useState<any>(null);
  const [productType, setProductType] = useState("both");

  const analyzeMutation = usePodAnalyze();
  const generateMutation = usePodGenerateDesigns();
  const approveMutation = usePodApprove();
  const rejectMutation = useRejectIdea();
  const { data: versions = [] } = useDesignVersions(currentIdea?.id ?? null);
  const selectVersionMutation = useSelectDesignVersion();
  const deleteVersionMutation = useDeleteDesignVersion();
  const generateListings = useGenerateListings();

  const handleAnalyze = (data: { idea_text: string; image_base64?: string; image_media_type?: string; product_type: string }) => {
    setProductType(data.product_type);
    analyzeMutation.mutate(data, {
      onSuccess: (res) => {
        setCurrentIdea(res.idea);
        setStep("review");
      },
    });
  };

  const handleGenerate = () => {
    if (!currentIdea) return;
    setStep("generate");
    generateMutation.mutate({
      idea_id: currentIdea.id,
      product_type: productType,
      sticker_prompt: currentIdea.sticker_design_prompt || currentIdea.analysis?.sticker_design_prompt,
      tshirt_prompt: currentIdea.tshirt_design_prompt || currentIdea.analysis?.tshirt_design_prompt,
    }, {
      onSuccess: (res) => setCurrentIdea(res.idea),
    });
  };

  const handleRegenerate = (type: "sticker" | "tshirt", customPrompt?: string) => {
    if (!currentIdea) return;
    generateMutation.mutate({
      idea_id: currentIdea.id,
      product_type: type,
      sticker_prompt: type === "sticker" ? (customPrompt || currentIdea.sticker_design_prompt) : undefined,
      tshirt_prompt: type === "tshirt" ? (customPrompt || currentIdea.tshirt_design_prompt) : undefined,
    }, {
      onSuccess: (res) => setCurrentIdea(res.idea),
    });
  };

  const handleApprove = () => {
    if (!currentIdea) return;
    generateListings.mutate(currentIdea.id, {
      onSuccess: () => {
        setStep("approve");
      },
    });
  };

  const handleReject = () => {
    if (!currentIdea) return;
    rejectMutation.mutate({ id: currentIdea.id }, {
      onSuccess: () => resetPipeline(),
    });
  };

  const handleSelectVersion = (versionId: string, productType: string) => {
    if (!currentIdea) return;
    selectVersionMutation.mutate({ versionId, ideaId: currentIdea.id, productType }, {
      onSuccess: (version: any) => {
        const urlField = productType === "sticker" ? "sticker_design_url" : "tshirt_design_url";
        setCurrentIdea((prev: any) => ({ ...prev, [urlField]: version.image_url }));
      },
    });
  };

  const handleDeleteVersion = (versionId: string) => {
    deleteVersionMutation.mutate(versionId);
  };

  const resetPipeline = () => {
    setStep("input");
    setCurrentIdea(null);
    setProductType("both");
  };

  return (
    <>
      <Helmet><title>POD Pipeline | acme.zone</title></Helmet>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">POD Pipeline</h1>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)}>
              <ToggleGroupItem value="board" aria-label="Board view" className="gap-1.5 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </ToggleGroupItem>
              <ToggleGroupItem value="new" aria-label="New idea" className="gap-1.5 text-xs">
                <PlusCircle className="h-3.5 w-3.5" /> New Idea
              </ToggleGroupItem>
              <ToggleGroupItem value="settings" aria-label="Settings" className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" /> Settings
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {view === "board" && <KanbanBoard />}

          {view === "new" && (
            <div>
              <PipelineStepIndicator current={step} />

              {step === "input" && (
                <IdeaInputForm onSubmit={handleAnalyze} isLoading={analyzeMutation.isPending} />
              )}

              {step === "review" && currentIdea?.analysis && (
                <AnalysisReview
                  analysis={currentIdea.analysis}
                  productType={productType}
                  onReject={handleReject}
                  onGenerate={handleGenerate}
                  isLoading={rejectMutation.isPending}
                />
              )}

              {step === "generate" && (
                <DesignGeneration
                  idea={currentIdea}
                  productType={productType}
                  onReject={handleReject}
                  onApprove={handleApprove}
                  onRegenerate={handleRegenerate}
                  isLoading={generateMutation.isPending}
                  isApproving={generateListings.isPending}
                  versions={versions}
                  onSelectVersion={handleSelectVersion}
                  onDeleteVersion={handleDeleteVersion}
                  isSelectingVersion={selectVersionMutation.isPending}
                  isDeletingVersion={deleteVersionMutation.isPending}
                />
              )}

              {step === "approve" && (
                <ApprovalSuccess
                  onReset={resetPipeline}
                />
              )}
            </div>
          )}

          {view === "settings" && <PodSettingsForm />}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PodPipeline;
