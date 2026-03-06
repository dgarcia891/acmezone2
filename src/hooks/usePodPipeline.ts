import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      toast.success("Approved & sent to Trello!");
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
      return data?.settings;
    },
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

export function useTestTrello() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pod-test-trello", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectIdea() {
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
