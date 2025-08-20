import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { createHash } from "https://deno.land/std@0.190.0/hash/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE] ${step}${detailsStr}`);
};

// Generate cache key from request data
const generateCacheKey = (company: string, jobTitle: string, provider: string): string => {
  const input = `${company}|${jobTitle}|${provider}|v1.0`;
  return createHash("sha256").update(input).toString();
};

// Call OpenAI API
const callOpenAI = async (prompt: string, apiKey: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You evaluate company and job-posting risk cautiously and refuse to fabricate facts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    tokens_in: data.usage?.prompt_tokens || 0,
    tokens_out: data.usage?.completion_tokens || 0
  };
};

// Call Gemini API
const callGemini = async (prompt: string, apiKey: string) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.candidates[0].content.parts[0].text,
    tokens_in: data.usageMetadata?.promptTokenCount || 0,
    tokens_out: data.usageMetadata?.candidatesTokenCount || 0
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role for writes
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get environment variables
    const costPerCall = parseInt(Deno.env.get("COST_PER_CALL") || "100");
    const defaultProvider = Deno.env.get("ANALYZE_PROVIDER") || "openai";
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { company, jobTitle, context, provider = "auto" } = await req.json();
    
    if (!company || !jobTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields: company, jobTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Determine which provider to use
    const actualProvider = provider === "auto" ? defaultProvider : provider;
    logStep("Provider determined", { requested: provider, actual: actualProvider });

    // Check if provider API key is available
    if (actualProvider === "openai" && !openaiKey) {
      return new Response(JSON.stringify({ error: "PROVIDER_ERROR", message: "OpenAI API key not configured" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (actualProvider === "gemini" && !geminiKey) {
      return new Response(JSON.stringify({ error: "PROVIDER_ERROR", message: "Gemini API key not configured" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey(company, jobTitle, actualProvider);
    logStep("Cache key generated", { cacheKey });

    // Check cache first
    const { data: cacheData } = await supabaseService
      .from("pa_analysis_cache")
      .select("result")
      .eq("cache_key", cacheKey)
      .single();

    if (cacheData) {
      logStep("Cache hit found");
      
      // Log usage (cached)
      await supabaseService.from("pa_usage_logs").insert({
        user_id: user.id,
        provider: actualProvider,
        company,
        job_title: jobTitle,
        cached: true,
        tokens_in: 0,
        tokens_out: 0,
        cost_cents: 0
      });

      return new Response(JSON.stringify({
        ok: true,
        cached: true,
        text: cacheData.result
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logStep("No cache hit, checking credits");

    // Check user credits
    const { data: creditsData } = await supabaseService
      .from("pa_credits")
      .select("delta")
      .eq("user_id", user.id);

    const currentBalance = creditsData?.reduce((sum, credit) => sum + credit.delta, 0) || 0;
    logStep("Credit check", { balance: currentBalance, required: costPerCall });

    if (currentBalance < costPerCall) {
      return new Response(JSON.stringify({
        error: "INSUFFICIENT_CREDITS",
        required: costPerCall,
        balance: currentBalance
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build prompt
    const trimmedContext = context ? context.substring(0, 12000) : "";
    const userPrompt = `You are a careful analyst helping a job seeker sanity-check a company before applying.

Company: ${company}
Target role: ${jobTitle}

Context from the job post (may be partial and noisy):
${trimmedContext}

Produce a concise risk briefing with sections:
1) Potential red flags (bullet list)
2) Reasonable positives / mitigating factors (bullet list)
3) What to double-check (actionable next steps with links to public sources the user could search, not actual URLs)
4) Overall risk: Low / Medium / High with a one-sentence justification.

Be specific, avoid generic platitudes, and do NOT invent facts. If you don't have enough info, say so.`;

    logStep("Calling AI provider", { provider: actualProvider });

    // Call AI provider
    let aiResponse;
    try {
      if (actualProvider === "openai") {
        aiResponse = await callOpenAI(userPrompt, openaiKey!);
      } else if (actualProvider === "gemini") {
        aiResponse = await callGemini(userPrompt, geminiKey!);
      } else {
        throw new Error(`Unsupported provider: ${actualProvider}`);
      }
    } catch (error) {
      logStep("Provider error", { error: error.message });
      return new Response(JSON.stringify({ error: "PROVIDER_ERROR" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logStep("AI response received", { tokens_in: aiResponse.tokens_in, tokens_out: aiResponse.tokens_out });

    // Deduct credits
    await supabaseService.from("pa_credits").insert({
      user_id: user.id,
      delta: -costPerCall,
      reason: 'analyze'
    });

    // Log usage
    await supabaseService.from("pa_usage_logs").insert({
      user_id: user.id,
      provider: actualProvider,
      company,
      job_title: jobTitle,
      cached: false,
      tokens_in: aiResponse.tokens_in,
      tokens_out: aiResponse.tokens_out,
      cost_cents: Math.ceil(costPerCall / 10) // Rough estimate
    });

    // Cache result
    await supabaseService.from("pa_analysis_cache").upsert({
      cache_key: cacheKey,
      result: aiResponse.text,
      updated_at: new Date().toISOString()
    });

    logStep("Analysis complete", { cached: false });

    return new Response(JSON.stringify({
      ok: true,
      cached: false,
      text: aiResponse.text
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in analyze function", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});