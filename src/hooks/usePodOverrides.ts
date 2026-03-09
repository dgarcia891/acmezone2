import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type IdeaOverrideRow = {
  id: string;
  idea_id: string;
  shop_id: string | null;
  tshirt_margin_pct: number | null;
  sticker_margin_pct: number | null;
  tshirt_color_overrides: unknown;
  created_at: string | null;
  updated_at: string | null;
};

export type IdeaOverrides = {
  rows: IdeaOverrideRow[];
  perShop: Record<string, IdeaOverrideRow>;
  global: IdeaOverrideRow | null;
};

function normalizeOverrideRow(row: any): IdeaOverrideRow {
  return {
    id: String(row.id),
    idea_id: String(row.idea_id),
    shop_id: row.shop_id == null ? null : String(row.shop_id),
    tshirt_margin_pct: row.tshirt_margin_pct == null ? null : Number(row.tshirt_margin_pct),
    sticker_margin_pct: row.sticker_margin_pct == null ? null : Number(row.sticker_margin_pct),
    tshirt_color_overrides: row.tshirt_color_overrides,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export function useIdeaOverrides(ideaId: string | null) {
  return useQuery({
    queryKey: ["pod-idea-overrides", ideaId],
    enabled: !!ideaId,
    queryFn: async (): Promise<IdeaOverrides> => {
      if (!ideaId) return { rows: [], perShop: {}, global: null };

      const { data, error } = await supabase
        .from("az_pod_idea_overrides" as any)
        .select("*")
        .eq("idea_id", ideaId);

      if (error) throw error;

      const rows = (data || []).map(normalizeOverrideRow);
      const perShop: Record<string, IdeaOverrideRow> = {};
      let global: IdeaOverrideRow | null = null;

      for (const r of rows) {
        if (r.shop_id) perShop[r.shop_id] = r;
        else global = r;
      }

      return { rows, perShop, global };
    },
    staleTime: 1000 * 15,
  });
}

export function useSaveIdeaOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      ideaId: string;
      shopId: string | null;
      patch: Partial<Pick<IdeaOverrideRow, "tshirt_margin_pct" | "sticker_margin_pct" | "tshirt_color_overrides">>;
    }) => {
      const { ideaId, shopId, patch } = args;

      // Find existing row (first match) to avoid duplicate-row ambiguity when no unique constraint exists
      let finder: any = supabase
        .from("az_pod_idea_overrides" as any)
        .select("id")
        .eq("idea_id", ideaId)
        .limit(1);

      finder = shopId == null ? finder.is("shop_id", null) : finder.eq("shop_id", shopId);

      const { data: existing, error: findErr } = await (finder as any).maybeSingle();
      if (findErr) throw findErr;

      const existingId: string | null = (existing as any)?.id ? String((existing as any).id) : null;

      const payload = {
        ...patch,
        updated_at: new Date().toISOString(),
      } as any;

      if (existingId) {
        const { data, error } = await supabase
          .from("az_pod_idea_overrides" as any)
          .update(payload)
          .eq("id", existingId)
          .select("*")
          .single();

        if (error) throw error;
        return normalizeOverrideRow(data);
      }

      const { data, error } = await supabase
        .from("az_pod_idea_overrides" as any)
        .insert({
          idea_id: ideaId,
          shop_id: shopId,
          ...patch,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .select("*")
        .single();

      if (error) throw error;
      return normalizeOverrideRow(data);
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["pod-idea-overrides", vars.ideaId] });
      qc.invalidateQueries({ queryKey: ["pod-ideas"] });
      toast.success("Saved idea overrides");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export type PrintifyVariant = {
  id: number;
  title: string;
  cost?: number | null;
  options?: Record<string, string>;
};

export type PrintifyVariantsResponse = {
  variants: PrintifyVariant[];
  recommended_variant_ids?: number[];
  analysis?: { dominance: "dark" | "light" | "medium"; dominant_colors: string[]; excluded_count: number };
};

export function useFetchVariantColors(args: {
  blueprintId: string | number | null | undefined;
  printProviderId: string | number | null | undefined;
  imageUrl?: string | null;
}) {
  const blueprintId = args.blueprintId == null ? null : String(args.blueprintId);
  const printProviderId = args.printProviderId == null ? null : String(args.printProviderId);

  return useQuery({
    queryKey: ["printify-variants", blueprintId, printProviderId, args.imageUrl || ""],
    enabled: !!blueprintId && !!printProviderId,
    queryFn: async (): Promise<PrintifyVariantsResponse> => {
      const { data, error } = await supabase.functions.invoke("pod-printify-providers", {
        body: {
          action: "get_variants",
          blueprint_id: blueprintId,
          print_provider_id: printProviderId,
          image_url: args.imageUrl || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        variants: (data?.variants || []) as PrintifyVariant[],
        recommended_variant_ids: (data?.recommended_variant_ids || []) as number[],
        analysis: data?.analysis,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
