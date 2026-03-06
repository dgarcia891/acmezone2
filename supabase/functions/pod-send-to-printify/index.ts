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

const DEFAULT_VARIANT_PRICE_BY_PRODUCT_TYPE: Record<string, number> = {
  sticker: 499,
  tshirt: 2499,
};

const MARKETPLACE_TITLE_LIMITS: Record<string, number> = {
  ebay: 80,
  etsy: 140,
  shopify: 140,
  default: 140,
};

function sanitizeTitle(title: string | null | undefined, maxLen = 140) {
  const normalized = (title || "Untitled Product").replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLen);
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
    console.error("Printify API error:", res.status, JSON.stringify(data));
    throw new Error(data?.message || data?.error || `Printify API error ${res.status}`);
  }
  return data;
}

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

    const { idea_id } = await req.json();
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
    if (!listings?.length) return json({ error: "No approved listings found" }, 400);

    // Fetch Printify credentials
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("printify_api_key, printify_shop_id")
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

    // Build shop list: primary + additional
    const shops = [
      { shop_id: printify_shop_id, marketplace: "default", label: "Primary Shop" },
      ...(additionalShops || []).map((s: any) => ({
        shop_id: s.shop_id,
        marketplace: s.marketplace,
        label: s.label || `${s.marketplace} Shop`,
      })),
    ];

    const results: any[] = [];

    for (const listing of listings) {
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
        console.warn(`Missing blueprint/provider IDs for ${listing.product_type} listing ${listing.id}, skipping`);
        results.push({
          product_type: listing.product_type,
          error: `Blueprint ID and Print Provider ID must be configured on the ${listing.product_type} listing before sending to Printify.`,
        });
        continue;
      }

      // Upload image once per listing (shared across shops)
      console.log(`Uploading image for ${listing.product_type}...`);
      const uploadResult = await printifyFetch("/uploads/images.json", printify_api_key, {
        method: "POST",
        body: JSON.stringify({
          file_name: `${listing.product_type}_design.png`,
          url: designUrl,
        }),
      });
      const imageId = uploadResult.id;
      console.log(`Image uploaded: ${imageId}`);

      // Get variants once (same blueprint/provider for all shops)
      console.log(`Fetching variants for blueprint ${blueprintId}...`);
      const variants = await printifyFetch(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
        printify_api_key
      );
      const variantIds = (variants.variants || []).map((v: any) => v.id);
      if (!variantIds.length) {
        throw new Error(`No variants found for blueprint ${blueprintId} / provider ${printProviderId}`);
      }

      // Create product on each shop
      for (const shop of shops) {
        const title = getTitleForMarketplace(listing, shop.marketplace);
        console.log(`Creating product on shop ${shop.shop_id} (${shop.marketplace}): "${title}"`);

        try {
          const product = await printifyFetch(`/shops/${shop.shop_id}/products.json`, printify_api_key, {
            method: "POST",
            body: JSON.stringify({
              title,
              description: listing.description,
              tags: listing.tags || [],
              blueprint_id: blueprintId,
              print_provider_id: printProviderId,
              variants: variantIds.map((vid: number) => ({
                id: vid,
                price: DEFAULT_VARIANT_PRICE_BY_PRODUCT_TYPE[listing.product_type] ?? 1999,
                is_enabled: true,
              })),
              print_areas: [{
                variant_ids: variantIds,
                placeholders: [{
                  position: "front",
                  images: [{
                    id: imageId,
                    x: 0.5,
                    y: 0.5,
                    scale: 1,
                    angle: 0,
                  }],
                }],
              }],
            }),
          });
          console.log(`Product created as draft on ${shop.marketplace}: ${product.id}`);

          results.push({
            product_type: listing.product_type,
            printify_product_id: product.id,
            printify_url: `https://printify.com/app/editor/${product.id}`,
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

    // Check if any products were actually created
    const successResults = results.filter((r: any) => r.printify_product_id);
    if (successResults.length === 0) {
      const errors = results.map((r: any) => r.error).filter(Boolean).join("; ");
      return json({ error: errors || "No products could be created. Ensure Blueprint ID and Print Provider ID are configured on each listing." }, 400);
    }

    // Update idea with primary shop's Printify data and set status to production
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
