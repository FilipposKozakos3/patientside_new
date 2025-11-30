// supabase/functions/parse-record/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers so your Vite app (localhost:3000) can call this
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Supabase service-role client (server side only)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const userEmail = body.userEmail as string | undefined;
    const parsed = body.parsed as
      | {
          provider: string;
          medications: string[];
          allergies: string[];
          lab_results: string[];
          immunizations: string[];
        }
      | undefined;

    // added for getting the provider name
    const fileName = body.fileName as string | undefined;
    const filePath = body.filePath as string | undefined;

    if (!userEmail || !parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "userEmail and parsed data are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }


// async function parsePdfToStructuredData(): Promise<{
//   provider: string;
//   medications: string[];
//   allergies: string[];
//   lab_results: string[];
//   immunizations: string[];
// }> {
//   return {
//     provider: "Dr. Jane Smith",
//     medications: ["Lisinopril 10mg daily", "Metformin 500mg BID"],
//     allergies: ["Penicillin"],
//     lab_results: ["A1C 7.2%"],
//     immunizations: ["COVID-19 (Moderna), 2024-10-01"],
//   };
// }

// serve(async (req: Request) => {
//   // Handle CORS preflight
//   if (req.method === "OPTIONS") {
//     return new Response("ok", {
//       headers: {
//         ...corsHeaders,
//         "Access-Control-Allow-Methods": "POST, OPTIONS",
//       },
//     });
//   }

//   try {
//     const body = await req.json().catch(() => ({}));
//     const bucket = body.bucket as string | undefined;
//     const path = body.path as string | undefined;
//     const userEmail = body.userEmail as string | undefined;

//     if (!bucket || !path) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           error: "bucket and path are required",
//         }),
//         {
//           status: 400,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         },
//       );
//     }

//     if (!userEmail) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           error: "userEmail is required",
//         }),
//         {
//           status: 400,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         },
//       );
//     }

//     // In the future you’d download the file from Storage using bucket + path.
//     // For now we just call the stub parser.
//     const parsed = await parsePdfToStructuredData();

    // ---- INSERT INTO TABLES WITH PROPER ERROR HANDLING ----

        // ---------- HEALTH RECORD METADATA ----------
    
    if (fileName && filePath) {
      const { error: healthError } = await supabase
        .from("health_records")
        .insert({
          email: userEmail,
          provider_name: parsed.provider || null,
          file_name: fileName,
          file_path: filePath,
          document_type: "application/pdf", // adjust if you want
          // uploaded_at uses DB default now()
        });

      if (healthError) {
        console.error("Insert health record failed:", healthError);
        // don’t throw, so meds/allergies still go through
      }
    }

    
    // Medications
    for (const med of parsed.medications) {
      const { error: medError } = await supabase
        .from("medications")
        .upsert(
          {
            email: userEmail,
            medication: med,
          },
          { onConflict: "email,medication" }
        )
        .select()
        .single();

      if (medError) {
        console.error("Insert medication failed:", medError);
        throw new Error(`Insert medication failed: ${medError.message}`);
      }
    }

    // Allergies
    for (const allergy of parsed.allergies) {
      const { error: allergyError } = await supabase
        .from("allergies")
        .upsert(
          {
            email: userEmail,
            allergy,
          },
          { onConflict: "email,allergy" } // prevents duplicate inserts
        )
        .select()
        .single();

      if (allergyError) {
        console.error("Insert allergy failed:", allergyError);
        throw new Error(`Insert allergy failed: ${allergyError.message}`);
      }
    }

    // Lab results
    for (const labResult of parsed.lab_results) {
      const { error } = await supabase
        .from("lab_results")
        .insert({
          email: userEmail,
          // fill the NOT NULL column
          test_name: labResult,
          // optional: also store the same string in result_value for now
          result_value: labResult,
          // you can leave unit / result_date null for now
        });

      if (error) {
        console.error("Insert lab result failed:", error);
        throw new Error(`Insert lab result failed: ${error.message}`);
      }
    }


    // Immunizations
    for (const imm of parsed.immunizations) {
      const { error } = await supabase
        .from("immunizations")
        .insert({ email: userEmail, immunization: imm });

      if (error) {
        throw new Error(`Insert immunization failed: ${error.message}`);
      }
    }

        // success
        return new Response(
          JSON.stringify({
            success: true,
            message: "DB updated with parsed PDF data",
            userEmail,
            parsed,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (err) {
        console.error("parse-record internal error:", err);

        const message =
          err instanceof Error ? err.message : "Unknown internal error";

        return new Response(
          JSON.stringify({ success: false, error: message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    });


    // If we got here, everything worked - Version 1 - WORK
//     return new Response(
//       JSON.stringify({
//         success: true,
//         message:
//           "Edge function reachable ✅ and DB updated with parsed dummy data",
//         bucket,
//         path,
//         userEmail,
//         parsed,
//       }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       },
//     );
//   } catch (err) {
//     console.error("parse-record internal error:", err);

//     const message =
//       err instanceof Error ? err.message : "Unknown internal error";

//     return new Response(
//       JSON.stringify({ success: false, error: message }),
//       {
//         status: 500,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       },
//     );
//   }
// });
