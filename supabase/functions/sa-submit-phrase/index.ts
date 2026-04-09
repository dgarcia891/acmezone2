import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_CATEGORIES = [
    'general', 'gift_card', 'command', 'finance', 'vague_lure',
    'authority_pressure', 'urgency', 'securityKeywords'
];

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { phrase, category, context } = await req.json();

        if (!phrase || typeof phrase !== 'string') {
            throw new Error('phrase is required and must be a string');
        }

        const cleanPhrase = phrase.trim().replace(/\r?\n|\r/g, ' ');
        
        if (cleanPhrase.length < 3 || cleanPhrase.length > 200) {
            throw new Error('phrase must be between 3 and 200 characters');
        }

        const cleanCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'general';
        const cleanContext = context ? String(context).trim().substring(0, 500) : null;
        
        // Get client IP for rate limiting
        // We look for x-forwarded-for header which Supabase Edge functions populate
        const ipHeader = req.headers.get('x-forwarded-for') || 'unknown';
        const submitterIp = ipHeader.split(',')[0].trim();

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Rate limiting check (max 3 per IP per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error: countError } = await supabase
            .from('sa_phrase_suggestions')
            .select('id', { count: 'exact', head: true })
            .eq('submitter_ip', submitterIp)
            .gte('created_at', oneHourAgo);

        if (countError) throw countError;
        
        if (count && count >= 3) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const phraseLower = cleanPhrase.toLowerCase();

        // 2. Deduplication check against active patterns
        const { data: existingPattern, error: patternError } = await supabase
            .from('sa_patterns')
            .select('id')
            .eq('active', true)
            .ilike('phrase', phraseLower)
            .limit(1)
            .maybeSingle();
            
        if (patternError) throw patternError;
        
        if (existingPattern) {
            return new Response(
                JSON.stringify({ success: false, error: 'This phrase already exists in the active detection library.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Deduplication check against pending queue
        const { data: existingSuggestion, error: suggestionError } = await supabase
            .from('sa_phrase_suggestions')
            .select('id')
            .eq('status', 'pending')
            .ilike('phrase', phraseLower)
            .limit(1)
            .maybeSingle();

        if (suggestionError) throw suggestionError;
        
        if (existingSuggestion) {
            return new Response(
                JSON.stringify({ success: false, error: 'This phrase has already been suggested and is pending review.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Insert suggestion
        const { error: insertError } = await supabase
            .from('sa_phrase_suggestions')
            .insert({
                phrase: cleanPhrase,
                category: cleanCategory,
                context: cleanContext,
                submitter_ip: submitterIp
            });

        if (insertError) throw insertError;

        return new Response(
            JSON.stringify({ success: true, message: 'Suggestion submitted successfully.' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in sa-submit-phrase:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
