import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Admin client with service role – BACKEND ONLY
const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // same env vars as kv_store.tsx
  );

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// DELETE ACCOUNT endpoint: delete profile + auth user
app.post("/delete-account", async (c) => {
  const { userId } = await c.req.json();

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  const supabase = adminClient();

  // 1) Delete from profiles table (optional but recommended)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("profileError:", profileError);
    return c.json({ error: profileError.message }, 500);
  }

  // 2) Delete the auth user – this removes email+password from Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("authError:", authError);
    return c.json({ error: authError.message }, 500);
  }

  return c.json({ success: true });
});

Deno.serve(app.fetch);


// -- comented out for delete account functionality --
// import { Hono } from "npm:hono";
// import { cors } from "npm:hono/cors";
// import { logger } from "npm:hono/logger";
// import * as kv from "./kv_store.tsx";
// const app = new Hono();

// // Enable logger
// app.use('*', logger(console.log));

// // Enable CORS for all routes and methods
// app.use(
//   "/*",
//   cors({
//     origin: "*",
//     allowHeaders: ["Content-Type", "Authorization"],
//     allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     exposeHeaders: ["Content-Length"],
//     maxAge: 600,
//   }),
// );

// // Health check endpoint
// app.get("/make-server-81652b55/health", (c) => {
//   return c.json({ status: "ok" });
// });

// Deno.serve(app.fetch);