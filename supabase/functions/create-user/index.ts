import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  address?: string;
  role: "admin" | "staff" | "technician" | "student";
  department_id?: string;
  staff_id?: string;
  college_name?: string;
  additional_info?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("=== Create User Function Started ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify admin authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins can create users" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const userData: CreateUserRequest = await req.json();
    console.log("Creating user:", userData.email, "Role:", userData.role);

    if (!userData.email || !userData.password || !userData.full_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, password, and full name are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user - NO confirmation email (email_confirm: true means auto-confirmed)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone || null,
        staff_id: userData.staff_id || null,
      }
    });

    if (createError) {
      console.error("Create user error:", createError.message);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ success: false, error: "User creation failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = newUser.user.id;
    console.log("User created:", userId);

    // Poll for trigger creation with retry loop
    let profileFound = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        profileFound = true;
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    // Update profile
    const profilePayload = {
      staff_id: userData.staff_id || null,
      phone: userData.phone || null,
      address: userData.address || null,
      college_name: userData.college_name || null,
      is_active: true,
      is_verified: true,
    };

    if (profileFound) {
      await supabaseAdmin
        .from("profiles")
        .update(profilePayload)
        .eq("id", userId);
    } else {
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, full_name: userData.full_name, ...profilePayload });
    }

    // Update or insert role
    if (userData.role) {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: userData.role })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: userData.role });
      }
    }

    // Link department
    if (userData.department_id) {
      await supabaseAdmin
        .from("user_departments")
        .insert({ user_id: userId, department_id: userData.department_id });
    }

    // Send welcome email for Staff/Technician (NOT confirmation - just credentials)
    if (userData.role === "staff" || userData.role === "technician" || userData.role === "admin") {
      try {
        console.log("Sending welcome email to:", userData.email);
        
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: "welcome_staff",
            to: userData.email,
            name: userData.full_name,
            email: userData.email,
            password: userData.password,
            role: userData.role.charAt(0).toUpperCase() + userData.role.slice(1),
          }),
        });

        const emailResult = await emailResponse.json();
        console.log("Email result:", emailResult);
      } catch (emailError: any) {
        console.error("Failed to send welcome email:", emailError.message);
        // Don't fail the user creation if email fails
      }
    }

    console.log("=== User creation complete ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: userId, email: newUser.user.email },
        message: "User created successfully. Welcome email sent."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
