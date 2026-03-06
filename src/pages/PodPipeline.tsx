import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PipelineStepIndicator, { type PipelineStep } from "@/components/pod/PipelineStepIndicator";
import IdeaInputForm from "@/components/pod/IdeaInputForm";
import AnalysisReview from "@/components/pod/AnalysisReview";
import DesignGeneration from "@/components/pod/DesignGeneration";
import ApprovalSuccess from "@/components/pod/ApprovalSuccess";
import PodHistoryTable from "@/components/pod/PodHistoryTable";
import PodSettingsForm from "@/components/pod/PodSettingsForm";
import { usePodAnalyze, usePodGenerateDesigns, usePodApprove, useRejectIdea, useDesignVersions, useSelectDesignVersion, useDeleteDesignVersion } from "@/hooks/usePodPipeline";

const PodPipeline = () => {
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
    approveMutation.mutate(currentIdea.id, {
      onSuccess: (res) => {
        setCurrentIdea(res.idea);
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
        <div className="container mx-auto py-8 px-4 max-w-5xl">
          <h1 className="text-3xl font-bold mb-8">POD Pipeline</h1>

          <Tabs defaultValue="pipeline">
            <TabsList>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="mt-6">
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
                  isApproving={approveMutation.isPending}
                  versions={versions}
                  onSelectVersion={handleSelectVersion}
                  onDeleteVersion={handleDeleteVersion}
                  isSelectingVersion={selectVersionMutation.isPending}
                  isDeletingVersion={deleteVersionMutation.isPending}
                />
              )}

              {step === "approve" && (
                <ApprovalSuccess
                  trelloCardUrl={currentIdea?.trello_card_url}
                  onReset={resetPipeline}
                />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <PodHistoryTable />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <PodSettingsForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PodPipeline;
