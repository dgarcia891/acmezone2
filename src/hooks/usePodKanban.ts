import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PodLabel {
  id: string;
  name: string;
  color: string;
  created_at: string | null;
}

export function useUpdateIdeaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("az_pod_ideas" as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateIdeaNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("az_pod_ideas" as any)
        .update({ notes, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateIdeaPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const { error } = await supabase
        .from("az_pod_ideas" as any)
        .update({ priority, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Priority updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePodLabels() {
  return useQuery({
    queryKey: ["pod-labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("az_pod_labels" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PodLabel[];
    },
  });
}

export function useIdeaLabels(ideaId: string | null) {
  return useQuery({
    queryKey: ["pod-idea-labels", ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      const { data, error } = await supabase
        .from("az_pod_idea_labels" as any)
        .select("label_id")
        .eq("idea_id", ideaId);
      if (error) throw error;
      return ((data || []) as any[]).map((r: any) => r.label_id as string);
    },
    enabled: !!ideaId,
  });
}

export function useToggleIdeaLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ideaId, labelId, add }: { ideaId: string; labelId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase
          .from("az_pod_idea_labels" as any)
          .insert({ idea_id: ideaId, label_id: labelId } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("az_pod_idea_labels" as any)
          .delete()
          .eq("idea_id", ideaId)
          .eq("label_id", labelId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-idea-labels"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
