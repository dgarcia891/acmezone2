import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DesignVersion {
  id: string;
  idea_id: string;
  product_type: "sticker" | "tshirt";
  image_url: string;
  prompt: string | null;
  version_number: number;
  is_selected: boolean;
  created_at: string;
}

export function usePodIdeas() {
  return useQuery({
    queryKey: ["pod-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("az_pod_ideas" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function usePodAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { idea_text: string; image_base64?: string; image_media_type?: string }) => {
      const { data, error } = await supabase.functions.invoke("pod-analyze", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Idea analyzed successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePodGenerateDesigns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { idea_id: string; product_type: string; sticker_prompt?: string; tshirt_prompt?: string }) => {
      const { data, error } = await supabase.functions.invoke("pod-generate-designs", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Designs generated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePodApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idea_id: string) => {
      const { data, error } = await supabase.functions.invoke("pod-approve", { body: { idea_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Design approved!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePodSettings() {
  return useQuery({
    queryKey: ["pod-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pod-settings", { method: "GET" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { settings: data?.settings, additional_shops: data?.additional_shops || [] };
    },
  });
}

export function useAddShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { shop_id: string; marketplace: string; label?: string }) => {
      const { data, error } = await supabase.functions.invoke("pod-settings", {
        body: { action: "add_shop", ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-settings"] });
      toast.success("Shop added successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("pod-settings", {
        body: { action: "remove_shop", id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-settings"] });
      toast.success("Shop removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase.functions.invoke("pod-settings", {
        body: { action: "toggle_shop", id, is_active },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSavePodSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const { data, error } = await supabase.functions.invoke("pod-settings", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useValidateRemoveBgKey() {
  return useMutation({
    mutationFn: async (apiKey: string) => {
      const { data, error } = await supabase.functions.invoke("pod-settings", {
        method: "PUT",
        body: { removebg_api_key: apiKey },
      });
      if (error) throw error;
      if (data?.valid === false) throw new Error(data.error || "Invalid API key");
      toast.success(`Remove.bg key verified ✓ (${data?.credits?.free ?? "?"} free credits remaining)`);
      return data;
    },
    onError: (err: Error) => toast.error(`Remove.bg key validation failed: ${err.message}`),
  });
}


export function usePodRemoveBg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idea_id: string) => {
      const { data, error } = await supabase.functions.invoke("pod-remove-bg", { body: { idea_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Background removed successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}


  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from("az_pod_ideas" as any)
        .update({ status: "rejected", reject_reason: reason || null, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Idea rejected");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDesignVersions(ideaId: string | null) {
  return useQuery({
    queryKey: ["pod-design-versions", ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      const { data, error } = await supabase
        .from("az_pod_design_versions" as any)
        .select("*")
        .eq("idea_id", ideaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DesignVersion[];
    },
    enabled: !!ideaId,
  });
}

export function useSelectDesignVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ versionId, ideaId, productType }: { versionId: string; ideaId: string; productType: string }) => {
      await supabase
        .from("az_pod_design_versions" as any)
        .update({ is_selected: false } as any)
        .eq("idea_id", ideaId)
        .eq("product_type", productType);
      const { data: version, error } = await supabase
        .from("az_pod_design_versions" as any)
        .update({ is_selected: true } as any)
        .eq("id", versionId)
        .select()
        .single();
      if (error) throw error;
      const urlField = productType === "sticker" ? "sticker_design_url" : "tshirt_design_url";
      await supabase
        .from("az_pod_ideas" as any)
        .update({ [urlField]: (version as any).image_url, updated_at: new Date().toISOString() } as any)
        .eq("id", ideaId);
      return version;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-design-versions"] });
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Design version selected");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteDesignVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from("az_pod_design_versions" as any)
        .delete()
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-design-versions"] });
      toast.success("Version deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
