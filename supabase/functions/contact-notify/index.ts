import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "https://esm.sh/nodemailer@6.9.15?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message, timestamp, source, test } = await req.json();

    if (!test && (!name || !email || !message)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read SMTP config from az_app_config using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: configRow, error: configError } = await supabase
      .from("az_app_config")
      .select("value")
      .eq("key", "smtp_config")
      .maybeSingle();

    if (configError) throw new Error("Failed to load SMTP config: " + configError.message);
    if (!configRow?.value) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured. Please set up SMTP in Admin → Settings." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cfg = configRow.value as Record<string, string>;
    const { smtp_host, smtp_port, smtp_user, smtp_pass, contact_to_email, contact_from_email } = cfg;

    if (!smtp_host || !smtp_user || !smtp_pass || !contact_to_email) {
      return new Response(
        JSON.stringify({ error: "Incomplete SMTP configuration. Check Admin → Settings." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port) || 587,
      secure: Number(smtp_port) === 465,
      auth: { user: smtp_user, pass: smtp_pass },
    });

    const subject = test
      ? "✅ Acme Zone SMTP Test"
      : `New Contact Form: ${name}`;

    const html = test
      ? `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
           <h2 style="color:#333">SMTP Test Successful</h2>
           <p>Your SMTP settings are working correctly.</p>
           <p style="color:#888;font-size:12px">Sent at ${new Date().toISOString()}</p>
         </div>`
      : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
           <h2 style="color:#333;border-bottom:2px solid #eee;padding-bottom:12px">New Contact Form Submission</h2>
           <table style="width:100%;border-collapse:collapse;margin:16px 0">
             <tr><td style="padding:8px 0;color:#666;width:100px"><strong>Name</strong></td><td style="padding:8px 0">${name}</td></tr>
             <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
             <tr><td style="padding:8px 0;color:#666"><strong>Source</strong></td><td style="padding:8px 0">${source || "N/A"}</td></tr>
             <tr><td style="padding:8px 0;color:#666"><strong>Time</strong></td><td style="padding:8px 0">${timestamp || new Date().toISOString()}</td></tr>
           </table>
           <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin-top:16px">
             <strong style="color:#666">Message:</strong>
             <p style="margin:8px 0 0;white-space:pre-wrap">${message}</p>
           </div>
           <p style="color:#aaa;font-size:11px;margin-top:24px">This email was sent automatically from the Acme Zone contact form.</p>
         </div>`;

    await transporter.sendMail({
      from: contact_from_email || smtp_user,
      to: contact_to_email,
      replyTo: test ? undefined : email,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("contact-notify error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
