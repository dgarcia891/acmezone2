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

// Fallback prices if cost lookup fails (in cents)
const FALLBACK_PRICE: Record<string, number> = {
  sticker: 499,
  tshirt: 2499,
};

const MARKETPLACE_TITLE_LIMITS: Record<string, number> = {
  ebay: 80,
  etsy: 140,
  shopify: 140,
  default: 140,
};

// --------------- Color-aware variant filtering ---------------

const DARK_COLORS = new Set([
  "black", "dark heather", "navy", "dark grey", "dark gray",
  "forest green", "maroon", "dark chocolate", "charcoal",
  "dark heather grey", "dark heather gray",
]);

const LIGHT_COLORS = new Set([
  "white", "natural", "sport grey", "sport gray", "light blue",
  "light pink", "sand", "ash", "ice grey", "ice gray",
  "cream", "soft cream", "heather prism ice blue",
]);

type ColorDominance = "dark" | "light" | "medium";

interface ColorAnalysis {
  dominance: ColorDominance;
  dominant_colors: string[];
}

async function analyzeDesignColors(imageUrl: string): Promise<ColorAnalysis | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY not set, skipping color analysis");
    return null;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this design image for t-shirt printing. What are the dominant colors? Is the design predominantly dark, light, or medium brightness? Respond ONLY with valid JSON: {\"dominance\": \"dark\" | \"light\" | \"medium\", \"dominant_colors\": [\"color1\", \"color2\"]}" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI color analysis failed:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn("Could not parse color analysis response:", text);
      return null;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!["dark", "light", "medium"].includes(parsed.dominance)) {
      console.warn("Invalid dominance value:", parsed.dominance);
      return null;
    }
    return {
      dominance: parsed.dominance as ColorDominance,
      dominant_colors: Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors : [],
    };
  } catch (err) {
    console.error("Color analysis error:", err);
    return null;
  }
}

function extractColorName(raw: string): string {
  // Printify variants use "Color / Size" format — extract color part
  const colorPart = raw.split(" / ")[0].toLowerCase().trim();
  return colorPart;
}

function classifyVariantColor(rawName: string): "dark" | "light" | "neutral" {
  const colorPart = extractColorName(rawName);

  // Exact match first
  if (DARK_COLORS.has(colorPart)) return "dark";
  if (LIGHT_COLORS.has(colorPart)) return "light";

  // Partial/contains match for compound names like "dark heather grey"
  for (const dc of DARK_COLORS) {
    if (colorPart.includes(dc) || dc.includes(colorPart)) return "dark";
  }
  for (const lc of LIGHT_COLORS) {
    if (colorPart.includes(lc) || lc.includes(colorPart)) return "light";
  }

  return "neutral";
}

interface VariantFilterResult {
  variantStates: Map<number, boolean>; // variant id -> is_enabled
  excludedCount: number;
  analysis: ColorAnalysis;
}

function filterVariantsByColor(
  variants: { id: number; options?: Record<string, string>; title?: string }[],
  analysis: ColorAnalysis
): VariantFilterResult {
  const variantStates = new Map<number, boolean>();
  let excludedCount = 0;

  if (analysis.dominance === "medium") {
    // Medium/colorful designs work on most colors — enable all
    for (const v of variants) {
      variantStates.set(v.id, true);
    }
    return { variantStates, excludedCount: 0, analysis };
  }

  const clashCategory = analysis.dominance; // "dark" or "light"

  for (const v of variants) {
    const colorName = v.options?.color || v.options?.Color || v.title || "";
    const extracted = extractColorName(colorName);
    const category = classifyVariantColor(colorName);
    console.log(`Variant ${v.id}: raw="${colorName}" → extracted="${extracted}" → ${category}`);

    if (category === clashCategory) {
      variantStates.set(v.id, false);
      excludedCount++;
    } else {
      variantStates.set(v.id, true);
    }
  }

  // Safety: ensure at least 3 variants remain enabled
  const enabledCount = variants.length - excludedCount;
  if (enabledCount < 3) {
    // Re-enable all and skip filtering
    for (const v of variants) {
      variantStates.set(v.id, true);
    }
    return { variantStates, excludedCount: 0, analysis };
  }

  return { variantStates, excludedCount, analysis };
}

// --------------- Helpers ---------------

function sanitizeTitle(title: string | null | undefined, maxLen = 140) {
  const normalized = (title || "Untitled Product").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  // Truncate at the last space before maxLen to avoid cutting words
  const truncated = normalized.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}

function sanitizeTags(tags: string[] | null | undefined, maxTags = 13, maxTagLen = 20): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map(tag => String(tag).trim())
    .filter(tag => tag.length > 0)
    .map(tag => tag.length > maxTagLen ? tag.slice(0, maxTagLen).trim() : tag)
    .slice(0, maxTags);
}

function getTitleForMarketplace(listing: any, marketplace: string): string {
  const limit = MARKETPLACE_TITLE_LIMITS[marketplace] || 140;
  if (marketplace === "ebay" && listing.ebay_title) {
    return sanitizeTitle(listing.ebay_title, limit);
  }
  if (marketplace === "etsy" && listing.etsy_title) {
    return sanitizeTitle(listing.etsy_title, limit);
  }
  return sanitizeTitle(listing.title, limit);
}

async function printifyFetch(path: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.printify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const errorDetail = data?.message || data?.error || (data ? JSON.stringify(data) : `Status ${res.status}`);
    console.error("Printify API error:", res.status, errorDetail);
    throw new Error(errorDetail);
  }
  return data;
}

// --------------- Main handler ---------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    const { data: roleData } = await supabase
      .from("az_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    const { idea_id, product_types, publish_overrides, color_image_overrides } = await req.json();
    if (!idea_id) return json({ error: "idea_id is required" }, 400);

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from("az_pod_ideas")
      .select("*")
      .eq("id", idea_id)
      .single();
    if (ideaError || !idea) return json({ error: "Idea not found" }, 404);

    // Fetch approved listings
    const { data: listings, error: listingsError } = await supabase
      .from("az_pod_listings")
      .select("*")
      .eq("idea_id", idea_id)
      .eq("is_approved", true);
    if (listingsError) throw listingsError;

    let filteredListings = listings || [];
    if (product_types && Array.isArray(product_types) && product_types.length > 0) {
      filteredListings = filteredListings.filter((l: any) => product_types.includes(l.product_type));
    }
    if (!filteredListings.length) return json({ error: "No approved listings found for the selected product types" }, 400);

    // Fetch per-idea overrides (margins + optional manual t-shirt variant selection)
    const { data: overrideRows, error: overrideErr } = await supabase
      .from("az_pod_idea_overrides")
      .select("*")
      .eq("idea_id", idea_id);
    if (overrideErr) throw overrideErr;

    const perShopOverrides = new Map<string, any>();
    let globalOverride: any = null;
    for (const r of overrideRows || []) {
      if (r?.shop_id) perShopOverrides.set(String(r.shop_id), r);
      else globalOverride = r;
    }

    const rawManual = globalOverride?.tshirt_color_overrides;
    const manualVariantIds = Array.isArray(rawManual)
      ? rawManual.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
      : [];
    const manualVariantIdSet = new Set<number>(manualVariantIds);
    const hasManualTshirtVariants = manualVariantIdSet.size > 0;

    // Fetch Printify credentials
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("printify_api_key, printify_shop_id, auto_publish, tshirt_margin_pct, sticker_margin_pct")
      .eq("user_id", user.id)
      .single();
    if (!settings?.printify_api_key || !settings?.printify_shop_id) {
      return json({ error: "Printify API key and Shop ID are required. Configure them in Settings." }, 400);
    }

    // Fetch additional shops
    const { data: additionalShops } = await supabase
      .from("az_pod_printify_shops")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { printify_api_key, printify_shop_id } = settings;

    const shops = [
      { shop_id: printify_shop_id, marketplace: "default", label: "Primary Shop", auto_publish: settings.auto_publish ?? false, tshirt_margin_pct: null as number | null, sticker_margin_pct: null as number | null },
      ...(additionalShops || []).map((s: any) => ({
        shop_id: s.shop_id,
        marketplace: s.marketplace,
        label: s.label || `${s.marketplace} Shop`,
        auto_publish: s.auto_publish ?? false,
        tshirt_margin_pct: s.tshirt_margin_pct as number | null,
        sticker_margin_pct: s.sticker_margin_pct as number | null,
      })),
    ];

    // Global margin defaults from settings
    const globalTshirtMargin = settings.tshirt_margin_pct ?? 100;
    const globalStickerMargin = settings.sticker_margin_pct ?? 100;

    const overrides: Record<string, boolean> = publish_overrides || {};

    // Run color analysis for t-shirt designs (skip stickers) unless the user explicitly selected variants
    const colorAnalysisCache: Record<string, ColorAnalysis | null> = {};
    if (!hasManualTshirtVariants) {
      for (const listing of filteredListings) {
        if (listing.product_type === "sticker") continue;
        const designUrl = listing.product_type === "tshirt" ? idea.tshirt_design_url : null;
        if (designUrl && !colorAnalysisCache[designUrl]) {
          console.log(`Analyzing design colors for ${listing.product_type}...`);
          colorAnalysisCache[designUrl] = await analyzeDesignColors(designUrl);
          if (colorAnalysisCache[designUrl]) {
            console.log(`Color analysis: ${JSON.stringify(colorAnalysisCache[designUrl])}`);
          }
        }
      }
    }

    // Fetch color-refined design versions for this idea (tshirt only)
    const { data: refinedVersions } = await supabase
      .from("az_pod_design_versions")
      .select("*")
      .eq("idea_id", idea_id)
      .eq("product_type", "tshirt")
      .not("color_name", "is", null);

    // Build color_name → image_url mapping from refined versions
    // Use client-side overrides first, then fall back to DB refined versions
    const colorImageMap = new Map<string, string>();
    for (const rv of (refinedVersions || [])) {
      if (rv.color_name && rv.image_url) {
        colorImageMap.set(rv.color_name.toLowerCase().trim(), rv.image_url);
      }
    }
    // Client-side overrides take precedence
    const clientOverrides: Record<string, string> = color_image_overrides || {};
    for (const [colorName, url] of Object.entries(clientOverrides)) {
      if (url) colorImageMap.set(colorName.toLowerCase().trim(), url as string);
    }
    console.log(`Color-refined designs available for ${colorImageMap.size} colors: ${Array.from(colorImageMap.keys()).join(", ")}`);

    const results: any[] = [];

    for (const listing of filteredListings) {
      const designUrl = listing.product_type === "sticker"
        ? idea.sticker_design_url
        : idea.tshirt_design_url;

      if (!designUrl) {
        console.warn(`No design URL for ${listing.product_type}, skipping`);
        continue;
      }

      const blueprintId = Number(listing.printify_blueprint_id);
      const printProviderId = Number(listing.printify_print_provider_id);
      if (!blueprintId || !printProviderId) {
        results.push({
          product_type: listing.product_type,
          error: `Blueprint ID and Print Provider ID must be configured on the ${listing.product_type} listing before sending to Printify.`,
        });
        continue;
      }

      // Upload default image
      console.log(`Uploading default image for ${listing.product_type}...`);
      // Strip cache busters for Printify
      const cleanDesignUrl = designUrl.split('?')[0];
      const uploadResult = await printifyFetch("/uploads/images.json", printify_api_key, {
        method: "POST",
        body: JSON.stringify({
          file_name: `${listing.product_type}_design.png`,
          url: cleanDesignUrl,
        }),
      });
      const defaultImageId = uploadResult.id;
      console.log(`Default image uploaded: ${defaultImageId}`);

      // Upload refined images for matching colors (tshirt only)
      const colorToImageId = new Map<string, string>(); // color_name → printify image id
      if (listing.product_type === "tshirt" && colorImageMap.size > 0) {
        const uploadedUrls = new Set<string>();
        for (const [colorName, refinedUrl] of colorImageMap.entries()) {
          if (uploadedUrls.has(refinedUrl)) {
            // Same URL already uploaded, find the image id
            for (const [cn, iid] of colorToImageId.entries()) {
              if (colorImageMap.get(cn) === refinedUrl) {
                colorToImageId.set(colorName, iid);
                break;
              }
            }
            continue;
          }
          try {
            console.log(`Uploading refined image for color "${colorName}"...`);
            const cleanRefinedUrl = refinedUrl.split('?')[0];
            const refinedUpload = await printifyFetch("/uploads/images.json", printify_api_key, {
              method: "POST",
              body: JSON.stringify({
                file_name: `${listing.product_type}_refined_${colorName.replace(/\s+/g, "_")}.png`,
                url: cleanRefinedUrl,
              }),
            });
            colorToImageId.set(colorName, refinedUpload.id);
            uploadedUrls.add(refinedUrl);
            console.log(`Refined image for "${colorName}" uploaded: ${refinedUpload.id}`);
          } catch (err) {
            console.error(`Failed to upload refined image for "${colorName}":`, err);
            // Fall back to default for this color
          }
        }
      }

      // Get variants once
      console.log(`Fetching variants for blueprint ${blueprintId}...`);
      const variants = await printifyFetch(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
        printify_api_key
      );
      const variantList = variants.variants || [];
      if (!variantList.length) {
        throw new Error(`No variants found for blueprint ${blueprintId} / provider ${printProviderId}`);
      }
      if (variantList.length > 0) {
        console.log("Sample variant structure:", JSON.stringify(variantList[0]));
      }

      // Build cost map from variant data
      const variantCostMap = new Map<number, number>();
      for (const v of variantList) {
        if (v.cost != null) {
          variantCostMap.set(v.id, v.cost);
        }
      }
      console.log(`Cost data available for ${variantCostMap.size}/${variantList.length} variants`);

      // Apply variant selection/filtering for t-shirts
      const colorAnalysis = !hasManualTshirtVariants && listing.product_type !== "sticker" ? colorAnalysisCache[designUrl] : null;
      let variantFilterResult: VariantFilterResult | null = null;

      if (!hasManualTshirtVariants && colorAnalysis && listing.product_type === "tshirt") {
        variantFilterResult = filterVariantsByColor(variantList, colorAnalysis);
        if (variantFilterResult.excludedCount > 0) {
          console.log(`Color filter: excluded ${variantFilterResult.excludedCount} ${colorAnalysis.dominance} variants`);
        }
      }

      // If manual selection exists but none match this blueprint/provider, refuse
      if (hasManualTshirtVariants && listing.product_type === "tshirt") {
        const matching = variantList.filter((v: any) => manualVariantIdSet.has(v.id)).length;
        if (matching === 0) {
          results.push({
            product_type: listing.product_type,
            error: "Your saved t-shirt color selection doesn't match this Blueprint/Provider. Re-save colors after setting the correct Blueprint + Provider.",
          });
          continue;
        }
      }

      // Build print_areas: group variants by which image they should use
      let printAreas: any[];
      if (listing.product_type === "tshirt" && colorToImageId.size > 0) {
        // Group variants by their assigned image
        const imageGroups = new Map<string, number[]>(); // imageId → variant_ids
        for (const v of variantList) {
          const colorName = v.options?.color || v.options?.Color || v.title || "";
          const extracted = extractColorName(colorName);
          // Find matching refined image (fuzzy match)
          let assignedImageId = defaultImageId;
          for (const [refinedColor, imgId] of colorToImageId.entries()) {
            if (extracted === refinedColor || extracted.includes(refinedColor) || refinedColor.includes(extracted)) {
              assignedImageId = imgId;
              break;
            }
          }
          const group = imageGroups.get(assignedImageId) || [];
          group.push(v.id);
          imageGroups.set(assignedImageId, group);
        }

        printAreas = Array.from(imageGroups.entries()).map(([imgId, variantIds]) => ({
          variant_ids: variantIds,
          placeholders: [{
            position: "front",
            images: [{ id: imgId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
          }],
        }));
        console.log(`Built ${printAreas.length} print_areas (${colorToImageId.size} color-specific + default)`);
      } else {
        // Single image for all variants
        printAreas = [{
          variant_ids: variantList.map((v: any) => v.id),
          placeholders: [{
            position: "front",
            images: [{ id: defaultImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
          }],
        }];
      }

      // Create product on each shop
      for (const shop of shops) {
        const shouldPublish = shop.shop_id in overrides
          ? overrides[shop.shop_id]
          : shop.auto_publish;

        const title = getTitleForMarketplace(listing, shop.marketplace);
        console.log(`Creating product on shop ${shop.shop_id} (${shop.marketplace}), publish=${shouldPublish}: "${title}"`);

        try {
          const product = await printifyFetch(`/shops/${shop.shop_id}/products.json`, printify_api_key, {
            method: "POST",
            body: JSON.stringify({
              title,
              description: listing.description,
              tags: sanitizeTags(listing.tags),
              blueprint_id: blueprintId,
              print_provider_id: printProviderId,
               variants: variantList.map((v: any) => {
                 const isSticker = listing.product_type === "sticker";
                 const shopMargin = isSticker ? shop.sticker_margin_pct : shop.tshirt_margin_pct;
                 const ideaOverrideRow = perShopOverrides.get(String(shop.shop_id));
                 const ideaMargin = isSticker ? ideaOverrideRow?.sticker_margin_pct : ideaOverrideRow?.tshirt_margin_pct;
                 const marginPct = (ideaMargin ?? shopMargin ?? (isSticker ? globalStickerMargin : globalTshirtMargin)) as number;

                 const cost = variantCostMap.get(v.id);
                 let price: number;
                 if (cost != null) {
                   price = Math.max(Math.round(cost + (cost * marginPct / 100)), cost + 100);
                 } else {
                   price = FALLBACK_PRICE[listing.product_type] ?? 1999;
                 }

                 const isEnabled = listing.product_type === "tshirt" && hasManualTshirtVariants
                   ? manualVariantIdSet.has(v.id)
                   : variantFilterResult
                     ? (variantFilterResult.variantStates.get(v.id) ?? true)
                     : true;

                 return {
                   id: v.id,
                   price,
                   is_enabled: isEnabled,
                 };
               }),
              print_areas: printAreas,
            }),
          });
          console.log(`Product created as draft on ${shop.marketplace}: ${product.id}`);

          let published = false;
          let externalHandle: string | undefined = undefined;
          
          if (shouldPublish) {
            try {
              await printifyFetch(`/shops/${shop.shop_id}/products/${product.id}/publish.json`, printify_api_key, {
                method: "POST",
                body: JSON.stringify({
                  title: true,
                  description: true,
                  images: true,
                  variants: true,
                  tags: true,
                  keyFeatures: true,
                  shipping_template: true,
                }),
              });
              published = true;
              console.log(`Product published on ${shop.marketplace}: ${product.id}`);
              
              // Printify assigns the handle asynchronously. Pause briefly then fetch it with retries.
              for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`Fetching external handle attempt ${attempt} for ${product.id}...`);
                await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Exponentialish backoff
                try {
                  const refreshed = await printifyFetch(`/shops/${shop.shop_id}/products/${product.id}.json`, printify_api_key);
                  if (refreshed?.external?.handle) {
                    externalHandle = refreshed.external.handle;
                    console.log(`Fetched external handle for ${product.id}: ${externalHandle}`);
                    break;
                  } else {
                    console.log(`No handle yet for ${product.id}`);
                  }
                } catch (refreshErr) {
                  console.warn(`Could not fetch external handle for ${product.id}:`, refreshErr);
                  // Don't break, try again
                }
              }
            } catch (pubErr) {
              console.error(`Failed to publish on ${shop.marketplace}:`, pubErr);
            }
          }
          results.push({
            product_type: listing.product_type,
            printify_product_id: product.id,
            printify_url: `https://printify.com/app/editor/${product.id}`,
            external_handle: externalHandle,
            title: product.title || listing.title,
            shop_id: shop.shop_id,
            marketplace: shop.marketplace,
            shop_label: shop.label,
            images: (product.images || []).map((img: any) => ({
              src: img.src,
              is_default: img.is_default,
            })),
            variants_count: (product.variants || []).length,
            variants_enabled: (product.variants || []).filter((v: any) => v.is_enabled).length,
            published,
             // Color analysis metadata (only when AI filtering is used)
             ...(!hasManualTshirtVariants && variantFilterResult && variantFilterResult.excludedCount > 0 ? {
               color_analysis: {
                 dominance: variantFilterResult.analysis.dominance,
                 dominant_colors: variantFilterResult.analysis.dominant_colors,
                 excluded_count: variantFilterResult.excludedCount,
               },
             } : {}),
          });
        } catch (shopError) {
          console.error(`Error creating product on shop ${shop.shop_id}:`, shopError);
          results.push({
            product_type: listing.product_type,
            shop_id: shop.shop_id,
            marketplace: shop.marketplace,
            shop_label: shop.label,
            error: `Failed to create on ${shop.label}: ${shopError.message}`,
          });
        }
      }
    }

    const successResults = results.filter((r: any) => r.printify_product_id);
    if (successResults.length === 0) {
      const errors = results.map((r: any) => r.error).filter(Boolean).join("; ");
      return json({ error: errors || "No products could be created. Ensure Blueprint ID and Print Provider ID are configured on each listing." }, 400);
    }

    const primaryResult = successResults.find((r: any) => r.marketplace === "default") || successResults[0];
    await supabase
      .from("az_pod_ideas")
      .update({
        printify_product_id: primaryResult?.printify_product_id || null,
        printify_product_url: primaryResult?.printify_url || null,
        status: "production",
        updated_at: new Date().toISOString(),
      })
      .eq("id", idea_id);

    return json({ products: results });
  } catch (error) {
    console.error("pod-send-to-printify error:", error);
    return json({ error: error.message }, 500);
  }
});
