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

interface DeleteUserRequest {
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("=== Delete User Function Started ===");

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

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    const apiKey = req.headers.get("apikey");
    
    if (!authHeader && !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify requesting user
    let requestingUser = null;
    
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError) {
        console.error("Auth error:", authError.message);
        if (!apiKey) {
          return new Response(
            JSON.stringify({ success: false, error: "Session expired. Please refresh the page and try again." }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        requestingUser = data.user;
      }
    }
    
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not verify user. Please log out and log back in." }),
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
        JSON.stringify({ success: false, error: "Only admins can delete users" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { user_id }: DeleteUserRequest = await req.json();
    console.log("Deleting user:", user_id);

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if trying to delete own account
    if (user_id === requestingUser.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot delete your own account" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if trying to delete default admin
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_default_admin, full_name, email")
      .eq("id", user_id)
      .single();

    if (targetProfile?.is_default_admin) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot delete the default admin account" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Execute atomic cascading deletion via database RPC inside a single ACID transaction (SEC-12)
    let cascadeSucceeded = false;
    try {
      const { data: cascadeRes, error: cascadeErr } = await supabaseAdmin.rpc(
        "admin_delete_user_cascade",
        { p_user_id: user_id }
      );
      if (!cascadeErr && cascadeRes?.success) {
        cascadeSucceeded = true;
        console.log("Atomic cascade deletion completed via database transaction");
      } else if (cascadeErr) {
        console.warn("admin_delete_user_cascade RPC not available or failed, falling back to manual cleanup:", cascadeErr.message);
      }
    } catch (rpcErr) {
      console.warn("RPC invocation error, using manual fallback:", rpcErr);
    }

    if (!cascadeSucceeded) {
      // Fallback manual cleanup loop
      // 1. Departments head_user_id
      try {
        await supabaseAdmin.from("departments").update({ head_user_id: null }).eq("head_user_id", user_id);
      } catch (e) {
        console.log("departments cleanup skipped", e);
      }

      // 2. Return logs
      try {
        await supabaseAdmin.from("return_logs").update({ returned_by_staff: null }).eq("returned_by_staff", user_id);
      } catch (e) {
        console.log("return_logs update skipped", e);
      }

      // 3. Issued items (issued_to, issued_by, borrow_request_id)
      try {
        const { data: userBorrowRequests } = await supabaseAdmin
          .from("borrow_requests")
          .select("id")
          .eq("student_id", user_id);

        if (userBorrowRequests && userBorrowRequests.length > 0) {
          const brIds = userBorrowRequests.map(r => r.id);
          await supabaseAdmin
            .from("issued_items")
            .update({ borrow_request_id: null })
            .in("borrow_request_id", brIds);
        }

        await supabaseAdmin
          .from("issued_items")
          .update({ issued_by: null })
          .eq("issued_by", user_id);

        await supabaseAdmin
          .from("issued_items")
          .delete()
          .eq("issued_to", user_id);

        console.log("Cleaned up issued_items");
      } catch (e) {
        console.log("issued_items cleanup skipped", e);
      }

      // 4. Damage reports (reported_by, reviewed_by)
      try {
        await supabaseAdmin.from("damage_reports").update({ reported_by: null }).eq("reported_by", user_id);
        await supabaseAdmin.from("damage_reports").update({ reviewed_by: null }).eq("reviewed_by", user_id);
        console.log("Cleaned up damage_reports");
      } catch (e) {
        console.log("damage_reports cleanup skipped", e);
      }

      // 5. Maintenance records & repair requests (assigned_to, requested_by)
      try {
        await supabaseAdmin.from("maintenance_records").update({ assigned_to: null }).eq("assigned_to", user_id);
      } catch (e) {
        console.log("maintenance_records cleanup skipped", e);
      }
      try {
        await supabaseAdmin.from("repair_requests").update({ requested_by: null }).eq("requested_by", user_id);
      } catch (e) {
        console.log("repair_requests cleanup skipped (or table does not exist)", e);
      }

      // 6. Purchase orders & vendors
      try {
        await supabaseAdmin.from("purchase_orders").update({ created_by: null }).eq("created_by", user_id);
        await supabaseAdmin.from("purchase_orders").update({ approved_by: null }).eq("approved_by", user_id);
        await supabaseAdmin.from("purchase_orders").update({ rejected_by: null }).eq("rejected_by", user_id);
        await supabaseAdmin.from("vendors").update({ created_by: null }).eq("created_by", user_id);
        await supabaseAdmin.from("tally_config").update({ created_by: null }).eq("created_by", user_id);
        await supabaseAdmin.from("tally_sync_logs").update({ created_by: null }).eq("created_by", user_id);
        console.log("Cleaned up purchase_orders, vendors, tally records");
      } catch (e) {
        console.log("purchase_orders/vendors cleanup skipped", e);
      }

      // 7. Items & Chemicals & Stock transactions created_by
      try {
        await supabaseAdmin.from("items").update({ created_by: null }).eq("created_by", user_id);
        await supabaseAdmin.from("chemicals").update({ created_by: null }).eq("created_by", user_id);
        await supabaseAdmin.from("stock_transactions").update({ recorded_by: null }).eq("recorded_by", user_id);
      } catch (e) {
        console.log("items/chemicals cleanup skipped", e);
      }

      // 8. Delete from user_departments
      try {
        await supabaseAdmin.from("user_departments").delete().eq("user_id", user_id);
        console.log("Deleted user_departments");
      } catch (e) {
        console.log("user_departments cleanup skipped", e);
      }

      // 9. Delete from user_roles
      try {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        console.log("Deleted user_roles");
      } catch (e) {
        console.log("user_roles cleanup skipped", e);
      }

      // 10. Delete from login_logs
      try {
        await supabaseAdmin.from("login_logs").delete().eq("user_id", user_id);
        console.log("Deleted login_logs");
      } catch (e) {
        console.log("login_logs cleanup skipped", e);
      }

      // 11. Delete from notifications
      try {
        await supabaseAdmin.from("notifications").delete().eq("user_id", user_id);
        console.log("Deleted notifications");
      } catch (e) {
        console.log("notifications cleanup skipped", e);
      }

      // 12. Preserve audit trail by setting user_id to null instead of deleting historical records
      try {
        await supabaseAdmin.from("audit_logs").update({ user_id: null }).eq("user_id", user_id);
        console.log("Preserved audit_logs (set user_id to null)");
      } catch (e) {
        console.log("audit_logs update skipped", e);
      }

      // 13. Preserve activity_logs if exists
      try {
        await supabaseAdmin.from("activity_logs").update({ user_id: null }).eq("user_id", user_id);
        await supabaseAdmin.from("activity_logs").update({ performed_by: null }).eq("performed_by", user_id);
        console.log("Preserved activity_logs (set user_id to null)");
      } catch (e) {
        console.log("activity_logs update skipped", e);
      }

      // 14. Delete from borrow_requests if user is the student, or nullify approved_by
      try {
        await supabaseAdmin.from("borrow_requests").update({ approved_by: null }).eq("approved_by", user_id);
        await supabaseAdmin.from("borrow_requests").delete().eq("student_id", user_id);
        console.log("Deleted borrow_requests");
      } catch (e) {
        console.log("borrow_requests cleanup skipped", e);
      }

      // 15. Delete from otp_verifications (by email)
      try {
        const emailToDelete = targetProfile?.email;
        if (emailToDelete) {
          await supabaseAdmin.from("otp_verifications").delete().eq("email", emailToDelete);
          console.log("Deleted otp_verifications");
        }
      } catch (e) {
        console.log("otp_verifications cleanup skipped", e);
      }

      // 16. Delete profile
      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", user_id);

      if (profileDeleteError) {
        console.error("Profile delete error:", profileDeleteError.message);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to delete profile: " + profileDeleteError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Deleted profile");
    }


    // 17. Finally, delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error("Auth delete error:", authDeleteError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to delete auth user: " + authDeleteError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("Deleted auth user");

    console.log("=== User deleted successfully ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetProfile?.full_name || user_id} has been permanently deleted`
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
