import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PrintifyProvider {
  id: number;
  title: string;
  location: string;
}

export function usePrintifyProviders(blueprintId: string | null) {
  return useQuery({
    queryKey: ["printify-providers", blueprintId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pod-printify-providers", {
        body: { blueprint_id: blueprintId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data.providers || []) as PrintifyProvider[];
    },
    enabled: !!blueprintId && blueprintId.trim().length > 0,
    staleTime: 1000 * 60 * 10, // cache 10 min
  });
}

export function usePodListings(ideaId: string | null) {
  return useQuery({
    queryKey: ["pod-listings", ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      const { data, error } = await supabase
        .from("az_pod_listings" as any)
        .select("*")
        .eq("idea_id", ideaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ideaId,
  });
}

export function useGenerateListings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idea_id: string) => {
      const { data, error } = await supabase.functions.invoke("pod-generate-listings", { body: { idea_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-listings"] });
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Listing content generated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; tags?: string[]; etsy_title?: string; ebay_title?: string; printify_blueprint_id?: string | null; printify_print_provider_id?: string | null }) => {
      const { error } = await supabase
        .from("az_pod_listings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-listings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useApproveListings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ideaId: string) => {
      await supabase
        .from("az_pod_listings" as any)
        .update({ is_approved: true, updated_at: new Date().toISOString() } as any)
        .eq("idea_id", ideaId);
      const { error } = await supabase
        .from("az_pod_ideas" as any)
        .update({ status: "ready", updated_at: new Date().toISOString() } as any)
        .eq("id", ideaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-listings"] });
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Listings approved — ready for Printify");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendToPrintify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ idea_id, product_types, publish_overrides, color_image_overrides }: { idea_id: string; product_types?: string[]; publish_overrides?: Record<string, boolean>; color_image_overrides?: Record<string, string> }) => {
      const { data, error } = await supabase.functions.invoke("pod-send-to-printify", { body: { idea_id, product_types, publish_overrides, color_image_overrides } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Product sent to Printify!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
