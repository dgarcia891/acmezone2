import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivePattern {
  phrase: string;
  category: string;
  severity_weight: number;
}

export const useActivePatterns = () => {
  return useQuery({
    queryKey: ["active-scam-patterns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sa_patterns")
        .select("phrase, category, severity_weight")
        .eq("active", true)
        .order("severity_weight", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as ActivePattern[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
