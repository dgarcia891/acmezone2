import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. Authenticate via JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity via their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized: Invalid token" }, 401);
    }
    const adminUserId = claimsData.claims.sub as string;

    // --- 2. Verify admin role ---
    // Use service role client to bypass RLS for role check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleCheck, error: roleError } = await supabase
      .from("az_user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleCheck) {
      return json({ error: "Forbidden: Admin access required" }, 403);
    }

    // --- 3. Parse request body ---
    const { correctionId } = await req.json();
    if (!correctionId) {
      return json({ error: "Missing required parameter: correctionId" }, 400);
    }

    // --- 4. Fetch the correction ---
    const { data: correction, error: correctionError } = await supabase
      .from("sa_corrections")
      .select("*")
      .eq("id", correctionId)
      .single();

    if (correctionError || !correction) {
      return json({ error: "Correction not found" }, 404);
    }

    if (correction.review_status !== "pending") {
      return json({ error: "Correction has already been reviewed" }, 409);
    }

    // --- 5. Determine adjustment direction from feedback ---
    let adjustmentAmount = 0;
    const feedback = (correction.feedback || "").toLowerCase();
    if (feedback === "false_positive" || feedback === "not_a_scam") {
      // User says it's safe but we flagged it → reduce confidence
      adjustmentAmount = -1;
    } else if (
      feedback === "missed_threat" ||
      feedback === "confirmed_threat" ||
      feedback === "is_a_scam"
    ) {
      // User says it's a threat → increase confidence
      adjustmentAmount = +1;
    }

    // --- 6. Find patterns to adjust via linked detection's signals ---
    const adjustmentLogs: Array<{
      phrase_id: string;
      phrase: string;
      old_weight: number;
      new_weight: number;
    }> = [];

    if (adjustmentAmount !== 0 && correction.detection_id) {
      const { data: detection } = await supabase
        .from("sa_detections")
        .select("signals")
        .eq("id", correction.detection_id)
        .single();

      if (detection?.signals) {
        // Collect pattern phrase strings from signals.hard and signals.soft
        const signals = detection.signals as Record<string, unknown>;
        const matchedPhrases: string[] = [];

        for (const key of ["hard", "soft"]) {
          const arr = (signals as Record<string, unknown[]>)[key];
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (typeof item === "string") {
                matchedPhrases.push(item);
              } else if (typeof item === "object" && item !== null) {
                const obj = item as Record<string, unknown>;
                if (typeof obj.phrase === "string") matchedPhrases.push(obj.phrase);
                else if (typeof obj.text === "string") matchedPhrases.push(obj.text);
              }
            }
          }
        }

        // Look up each matched phrase in sa_patterns
        if (matchedPhrases.length > 0) {
          const { data: patterns } = await supabase
            .from("sa_patterns")
            .select("id, phrase, severity_weight")
            .in("phrase", matchedPhrases);

          if (patterns && patterns.length > 0) {
            for (const pattern of patterns) {
              const oldWeight = pattern.severity_weight;
              const newWeight = Math.max(1, Math.min(10, oldWeight + adjustmentAmount));

              if (newWeight !== oldWeight) {
                // Update pattern weight
                const { error: updateErr } = await supabase
                  .from("sa_patterns")
                  .update({ severity_weight: newWeight })
                  .eq("id", pattern.id);

                if (updateErr) {
                  console.error(`Failed to update pattern ${pattern.id}:`, updateErr);
                  continue;
                }

                // Log the adjustment
                const { error: logErr } = await supabase
                  .from("pattern_adjustments")
                  .insert({
                    phrase_id: pattern.id,
                    correction_id: correctionId,
                    old_weight: oldWeight,
                    new_weight: newWeight,
                    adjustment_reason: `Admin approved correction (${correction.feedback}). ${correction.user_comment || ""}`.trim(),
                    adjusted_by: adminUserId,
                  });

                if (logErr) {
                  console.error(`Failed to log adjustment for ${pattern.id}:`, logErr);
                }

                adjustmentLogs.push({
                  phrase_id: pattern.id,
                  phrase: pattern.phrase,
                  old_weight: oldWeight,
                  new_weight: newWeight,
                });
              }
            }
          }
        }
      }
    }

    // --- 7. Mark correction as approved ---
    const { error: approveError } = await supabase
      .from("sa_corrections")
      .update({
        review_status: "approved",
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", correctionId);

    if (approveError) {
      throw new Error(`Failed to update correction status: ${approveError.message}`);
    }

    console.log(
      `[approve-correction] Correction ${correctionId} approved by ${adminUserId}. ${adjustmentLogs.length} patterns adjusted.`
    );

    return json({
      success: true,
      message: "Correction approved",
      adjustments: adjustmentLogs,
      adjustment_count: adjustmentLogs.length,
    });
  } catch (err) {
    console.error("[approve-correction] Error:", err);
    return json(
      { error: (err as Error).message || "Internal server error" },
      500
    );
  }
});
