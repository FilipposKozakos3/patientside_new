// supabase/functions/parse-record/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

type ParsedPayload = {
  provider: string;
  medications: string[];
  allergies: string[];
  lab_results: string[];
  immunizations: string[];
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // ✅ IMPORTANT: make names explicit so you don't confuse them again
    const targetPatientEmail = body.targetPatientEmail as string | undefined;
    const providerEmail = body.userEmail as string | undefined; // keep same key from frontend
    const parsed = body.parsed as ParsedPayload | undefined;

    const fileName = body.fileName as string | undefined;
    const filePath = body.filePath as string | undefined;

    if (!targetPatientEmail || !parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "targetPatientEmail and parsed data are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------
    // 1) Store metadata
    // --------------------------
    if (fileName && filePath) {
      const { error: healthError } = await supabase
        .from("health_records")
        .insert({
          email: targetPatientEmail,                 // ✅ FIXED
          provider_name: parsed.provider || null,
          file_name: fileName,
          file_path: filePath,
          document_type: "application/pdf",
          // uploaded_at default now()
          // optionally store providerEmail if your table has a column
        });

      if (healthError) {
        console.error("Insert health record failed:", healthError);
        // do not throw; still try meds/labs/etc
      }
    }

    // --------------------------
    // 2) Medications (dedupe)
    // --------------------------
    for (const med of parsed.medications ?? []) {
      if (!med?.trim()) continue;

      const { error } = await supabase
        .from("medications")
        .upsert(
          {
            email: targetPatientEmail,               // ✅ FIXED
            medication: med.trim(),
          },
          { onConflict: "email,medication" }
        );

      if (error) {
        console.error("Insert medication failed:", error);
        throw new Error(`Insert medication failed: ${error.message}`);
      }
    }

    // --------------------------
    // 3) Allergies (dedupe)
    // --------------------------
    for (const allergy of parsed.allergies ?? []) {
      if (!allergy?.trim()) continue;

      const { error } = await supabase
        .from("allergies")
        .upsert(
          {
            email: targetPatientEmail,               // ✅ FIXED
            allergy: allergy.trim(),
          },
          { onConflict: "email,allergy" }
        );

      if (error) {
        console.error("Insert allergy failed:", error);
        throw new Error(`Insert allergy failed: ${error.message}`);
      }
    }

    // --------------------------
    // 4) Lab results
    // --------------------------
    for (const labResult of parsed.lab_results ?? []) {
      if (!labResult?.trim()) continue;

      const { error } = await supabase
        .from("lab_results")
        .insert({
          email: targetPatientEmail,                 // ✅ FIXED
          test_name: labResult.trim(),
          result_value: labResult.trim(),
        });

      if (error) {
        console.error("Insert lab result failed:", error);
        throw new Error(`Insert lab result failed: ${error.message}`);
      }
    }

    // --------------------------
    // 5) Immunizations
    // --------------------------
    for (const imm of parsed.immunizations ?? []) {
      if (!imm?.trim()) continue;

      const { error } = await supabase
        .from("immunizations")
        .insert({
          email: targetPatientEmail,                 // ✅ FIXED
          immunization: imm.trim(),
        });

      if (error) {
        console.error("Insert immunization failed:", error);
        throw new Error(`Insert immunization failed: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "DB updated with parsed PDF data",
        targetPatientEmail,
        providerEmail,
        parsed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("parse-record internal error:", err);

    const message = err instanceof Error ? err.message : "Unknown internal error";

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
