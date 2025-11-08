import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const REMOVE_BG_API_KEY = Deno.env.get('REMOVE_BG_API_KEY');
    if (!REMOVE_BG_API_KEY) {
      throw new Error('REMOVE_BG_API_KEY not configured');
    }

    console.log('Starting Remove.bg API background removal...');

    // Extract base64 data from data URL if present
    let base64Data = image;
    if (image.startsWith('data:')) {
      base64Data = image.split(',')[1];
    }

    // Call Remove.bg API
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_file_b64: base64Data,
        size: 'auto',
        format: 'png',
        // Optional: Add more parameters for better results
        // bg_color: null, // Keep transparent
        // crop: false,
        // scale: '100%'
      })
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error('Remove.bg API error:', removeBgResponse.status, errorText);
      
      // Handle specific error codes
      if (removeBgResponse.status === 403) {
        throw new Error('Invalid API key or insufficient credits');
      } else if (removeBgResponse.status === 400) {
        throw new Error('Invalid image format or size');
      }
      
      throw new Error(`Remove.bg API failed: ${errorText}`);
    }

    // Get the processed image as arraybuffer
    const processedImageBuffer = await removeBgResponse.arrayBuffer();
    
    // Convert to base64
    const processedImageBase64 = btoa(
      new Uint8Array(processedImageBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    const processedImageDataUrl = `data:image/png;base64,${processedImageBase64}`;

    console.log('Background removed successfully with Remove.bg');

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedImage: processedImageDataUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in remove-background-ai:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
