import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-setup-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const ADMIN_EMAIL = "admin@lablink.com";

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Security: Require setup secret ──
    const SETUP_SECRET = Deno.env.get("SETUP_SECRET");
    const authHeader = req.headers.get("x-setup-secret");

    if (!SETUP_SECRET || SETUP_SECRET.length < 16) {
      console.error("SETUP_SECRET not configured or too short (min 16 chars)");
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Setup not configured. Set SETUP_SECRET in Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!authHeader || authHeader !== SETUP_SECRET) {
      console.warn("Unauthorized setup-admin attempt");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Check if admin already exists ──
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(
      (u) => u.email === ADMIN_EMAIL,
    );

    if (existingAdmin) {
      // Admin already exists — DO NOT reset password
      // Just ensure the role is set correctly
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingAdmin.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "admin") {
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", existingAdmin.id);
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: existingAdmin.id, role: "admin" });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Admin already exists. Role verified. Password NOT reset for security.",
          exists: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // ── Create new admin with a generated password ──
    const generatedPassword =
      crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "!Aa1";

    const { data: newAdmin, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: "System Administrator",
          is_default_admin: true,
        },
      });

    if (createError) {
      console.error("Error creating admin:", createError);
      throw createError;
    }

    console.log("Admin user created:", newAdmin.user?.id);

    if (newAdmin.user) {
      await supabaseAdmin
        .from("profiles")
        .update({
          is_default_admin: true,
          full_name: "System Administrator",
        })
        .eq("id", newAdmin.user.id);

      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", newAdmin.user.id);
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newAdmin.user.id, role: "admin" });
    }

    // Return the generated password ONCE — caller must save it
    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Admin created. Save the password — it will NOT be shown again.",
        email: ADMIN_EMAIL,
        password: generatedPassword,
        exists: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in setup-admin:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
