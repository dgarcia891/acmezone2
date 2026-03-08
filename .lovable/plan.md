

## Fix: Product Type Selection Ignored During Analysis

### Root Cause
The `pod-analyze` edge function hardcodes `product_type: "both"` on line 160 of `supabase/functions/pod-analyze/index.ts`. It never reads the `product_type` value sent from the frontend form. So even when you select "T-Shirt only," the idea is saved as "both" and the design step renders both cards.

### Changes

**File: `supabase/functions/pod-analyze/index.ts`**
1. Destructure `product_type` from the request body (line 42)
2. Use it in the insert statement (line 160), defaulting to `"both"` if not provided

```text
Line 42:  const { idea_text, images, image_base64, image_media_type, product_type } = await req.json();
Line 160: product_type: product_type || "both",
```

That's it — two lines. The frontend already sends `product_type` correctly from `IdeaInputForm` through `handleAnalyze`.

