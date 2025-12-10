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

    const targetEmail = body.targetPatientEmail;
    const providerEmail = body.userEmail;
    const parsed = body.parsed;

    const fileName = body.fileName;
    const filePath = body.filePath;

    if (!targetEmail || !parsed) {
      return new Response(
        JSON.stringify({ error: "Missing targetEmail or parsed data" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ⭐ Must be declared OUTSIDE the insert block
    let recordId: string | null = null;

    // -----------------------------
    // 1) Insert health record
    // -----------------------------
    const { data: recordRow, error: recordError } = await supabase
      .from("health_records")
      .insert({
        email: targetEmail,
        provider_name: parsed.provider || null,
        file_name: fileName,
        file_path: filePath,
        document_type: "application/pdf",
        is_shared: !!providerEmail,
      })
      .select()
      .single();


    if (recordError) {
      console.error("Health record insert error:", recordError);
    }

    recordId = recordRow?.id ?? null; // ⭐ UUID used for linking

    // -----------------------------
    // 2) Insert medications
    // -----------------------------
    for (const m of parsed.medications ?? []) {
      if (!m?.trim()) continue;

      await supabase.from("medications").insert({
        email: targetEmail,
        medication: m.trim(),
        source_record_id: recordId,  // ⭐ use THIS
      });
    }

    // -----------------------------
    // 3) Insert allergies
    // -----------------------------
    for (const a of parsed.allergies ?? []) {
      if (!a?.trim()) continue;

      await supabase.from("allergies").insert({
        email: targetEmail,
        allergy: a.trim(),
        source_record_id: recordId,
      });
    }

    // -----------------------------
    // 4) Insert lab results
    // -----------------------------
    for (const lab of parsed.lab_results ?? []) {
      if (!lab?.trim()) continue;

      await supabase.from("lab_results").insert({
        email: targetEmail,
        test_name: lab.trim(),
        result_value: lab.trim(),
        source_record_id: recordId,
      });
    }

    // -----------------------------
    // 5) Insert immunizations
    // -----------------------------
    for (const imm of parsed.immunizations ?? []) {
      if (!imm?.trim()) continue;

      await supabase.from("immunizations").insert({
        email: targetEmail,
        immunization: imm.trim(),
        source_record_id: recordId,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("parse-record error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
