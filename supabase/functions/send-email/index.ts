import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface EmailRequest {
  type:
    | "confirmation"
    | "welcome_student"
    | "welcome_staff"
    | "password_reset"
    | "activation"
    | "resend_confirmation"
    | "credentials"
    | "verification";
  to: string;
  name: string;
  email?: string;
  password?: string;
  role?: string;
  otp?: string;
  confirmationLink?: string;
  loginUrl?: string;
}

// ── Security: Allowed email types and domain validation ──
const ALLOWED_TYPES = [
  "confirmation",
  "welcome_student",
  "welcome_staff",
  "password_reset",
  "activation",
  "resend_confirmation",
  "credentials",
  "verification",
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Beautiful HTML Email Templates
const getEmailTemplate = (
  type: string,
  data: EmailRequest,
): { subject: string; html: string } => {
  const styles = `
    <style>
      body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #0891B2 0%, #1E3A8A 100%); padding: 40px 30px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
      .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
      .content { padding: 40px 30px; }
      .content h2 { color: #1e293b; margin: 0 0 15px; font-size: 24px; }
      .content p { color: #64748b; line-height: 1.7; font-size: 16px; margin: 0 0 15px; }
      .button { display: inline-block; background: linear-gradient(135deg, #0891B2 0%, #0E7490 100%); color: #ffffff !important; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 20px 0; }
      .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
      .cred-item { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
      .cred-item:last-child { border-bottom: none; }
      .cred-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; margin: 0 0 5px; font-weight: 600; }
      .cred-value { color: #1e293b; font-size: 18px; font-weight: 600; margin: 0; font-family: monospace; }
      .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
      .warning p { color: #92400e; margin: 0; font-size: 14px; }
      .success { background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
      .success p { color: #166534; margin: 0; font-size: 14px; }
      .otp-box { background: #f0f9ff; border: 2px solid #0891B2; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
      .otp-code { color: #0891B2; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace; }
      .role-badge { display: inline-block; background: linear-gradient(135deg, #0891B2 0%, #0E7490 100%); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; }
      .footer { background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
      .footer p { color: #94a3b8; margin: 5px 0; font-size: 12px; }
      .footer a { color: #0891B2; text-decoration: none; }
      ul { color: #64748b; line-height: 1.8; padding-left: 20px; }
    </style>
  `;

  const loginUrl = data.loginUrl || "https://your-app.com/auth";

  switch (type) {
    case "verification":
      return {
        subject: "🔑 LabLink - Your Verification Code",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>
<div class="container">
  <div class="header"><h1>🔬 LabLink</h1><p>Lab Inventory Management System</p></div>
  <div class="content">
    <h2>Hi ${data.name}! 👋</h2>
    <p>Your email verification code is:</p>
    <div class="otp-box"><p class="otp-code">${data.otp || "------"}</p></div>
    <div class="warning"><p>⏰ This code expires in 10 minutes. Do not share it with anyone.</p></div>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">If you didn't request this, ignore this email.</p>
  </div>
  <div class="footer"><p>© 2025 LabLink - Lab Inventory System</p></div>
</div></body></html>`,
      };

    case "confirmation":
    case "resend_confirmation":
      return {
        subject: "🔬 LabLink - Verify Your Email Address",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>
<div class="container">
  <div class="header"><h1>🔬 LabLink</h1><p>Lab Inventory Management System</p></div>
  <div class="content">
    <h2>Welcome, ${data.name}! 👋</h2>
    <p>Please verify your email address by clicking the button below:</p>
    <div style="text-align:center;"><a href="${data.confirmationLink}" class="button">✓ Verify My Email</a></div>
    <div class="warning"><p>⏰ This verification link will expire in 24 hours.</p></div>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">If you didn't create an account, you can safely ignore this email.</p>
  </div>
  <div class="footer"><p>Need help? Contact your administrator</p><p>© 2025 LabLink</p></div>
</div></body></html>`,
      };

    case "credentials":
      return {
        subject: "🔐 LabLink - Your Login Credentials",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>
<div class="container">
  <div class="header"><h1>🔬 LabLink</h1><p>Lab Inventory Management System</p></div>
  <div class="content">
    <h2>Hello, ${data.name}! 👋</h2>
    <p>Your LabLink account has been created. Here are your login credentials:</p>
    <div class="cred-box">
      <div class="cred-item"><p class="cred-label">Email</p><p class="cred-value">${data.email || data.to}</p></div>
      <div class="cred-item"><p class="cred-label">Password</p><p class="cred-value">${data.password || "********"}</p></div>
      <div class="cred-item"><p class="cred-label">Role</p><p class="cred-value">${data.role || "User"}</p></div>
    </div>
    <div class="warning"><p>⚠️ <strong>Important:</strong> Please change your password after first login for security.</p></div>
    <div style="text-align:center;"><a href="${loginUrl}" class="button">🔐 Login to LabLink</a></div>
  </div>
  <div class="footer"><p>Keep this email safe - it contains your login details</p><p>© 2025 LabLink</p></div>
</div></body></html>`,
      };

    case "activation":
    case "welcome_student":
      return {
        subject: "🎉 LabLink - Your Account is Now Active!",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>
<div class="container">
  <div class="header"><h1>🔬 LabLink</h1><p>Lab Inventory Management System</p></div>
  <div class="content">
    <div class="success"><p>✅ <strong>Your account has been activated!</strong></p></div>
    <h2 style="text-align:center;">Welcome to LabLink, ${data.name}! 🎉</h2>
    <p style="text-align:center;">Your student account is now active. You can log in and start using the system.</p>
    <div class="cred-box">
      <div class="cred-item"><p class="cred-label">Login Email</p><p class="cred-value">${data.email || data.to}</p></div>
    </div>
    <h3 style="color:#1e293b;font-size:16px;margin:25px 0 10px;">🚀 What You Can Do</h3>
    <ul>
      <li>Browse available lab equipment</li>
      <li>Submit borrow requests</li>
      <li>Track your active borrowings</li>
      <li>Receive notifications for approvals</li>
    </ul>
    <div style="text-align:center;"><a href="${loginUrl}" class="button">🔐 Login Now</a></div>
  </div>
  <div class="footer"><p>Need help? Contact your lab administrator</p><p>© 2025 LabLink</p></div>
</div></body></html>`,
      };

    case "welcome_staff": {
      const roleDesc =
        data.role === "Staff"
          ? "<li>Manage inventory items</li><li>Approve borrow requests</li><li>Issue and receive items</li><li>Generate reports</li>"
          : data.role === "Technician"
            ? "<li>Handle maintenance requests</li><li>Update equipment status</li><li>Log repair activities</li><li>Mark items repaired/scrapped</li>"
            : "<li>Full system administration</li><li>Manage users and roles</li><li>Configure system settings</li><li>Access all reports</li>";

      return {
        subject: `🔬 LabLink - Your ${data.role || "Staff"} Account is Ready`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>
<div class="container">
  <div class="header"><h1>🔬 LabLink</h1><p>Lab Inventory Management System</p></div>
  <div class="content">
    <h2 style="text-align:center;">Welcome to the Team, ${data.name}! 👋</h2>
    <p style="text-align:center;">Your account has been created by the administrator.</p>
    <div style="text-align:center;margin:20px 0;"><span class="role-badge">${data.role || "Staff"}</span></div>
    <div class="cred-box">
      <div class="cred-item"><p class="cred-label">Login Email</p><p class="cred-value">${data.email || data.to}</p></div>
      ${data.password ? `<div class="cred-item"><p class="cred-label">Temporary Password</p><p class="cred-value">${data.password}</p></div>` : ""}
    </div>
    <div class="warning"><p>⚠️ <strong>Important:</strong> Please change your password after first login.</p></div>
    <h3 style="color:#1e293b;font-size:16px;margin:25px 0 10px;">📋 Your Permissions Include</h3>
    <ul>${roleDesc}</ul>
    <div style="text-align:center;"><a href="${loginUrl}" class="button">🔐 Login to LabLink</a></div>
  </div>
  <div class="footer"><p>Questions? Contact your administrator</p><p>© 2025 LabLink</p></div>
</div></body></html>`,
      };
    }

    case "password_reset":
      return {
        subject: "🔐 LabLink - Password Reset Request",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>
<div class="container">
  <div class="header"><h1>🔬 LabLink</h1><p>Lab Inventory Management System</p></div>
  <div class="content">
    <h2>Password Reset Request 🔐</h2>
    <p>Hi ${data.name}, we received a request to reset your password. Click the button below:</p>
    <div style="text-align:center;"><a href="${data.confirmationLink}" class="button">Reset Password</a></div>
    <div class="warning"><p>⏰ This link expires in 1 hour. If you didn't request this, ignore this email.</p></div>
  </div>
  <div class="footer"><p>© 2025 LabLink</p></div>
</div></body></html>`,
      };

    default:
      return {
        subject: "LabLink Notification",
        html: `<p>Hello ${data.name}, you have a notification from LabLink.</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  console.log("=== Send Email Function Called (Gmail SMTP) ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ── Security: Enforce authentication and caller verification ──
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const isServiceRole =
      (Boolean(supabaseServiceKey) && token === supabaseServiceKey) ||
      (Boolean(supabaseServiceKey) && authHeader === `Bearer ${supabaseServiceKey}`);

    let isAnon = false;
    let authUser = null;

    if (!isServiceRole) {
      if (
        (Boolean(supabaseAnonKey) && token === supabaseAnonKey) ||
        (Boolean(supabaseAnonKey) && authHeader === `Bearer ${supabaseAnonKey}`)
      ) {
        isAnon = true;
      } else {
        const supabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: authHeader } },
        });

        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !userData?.user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Unauthorized: Invalid or expired token",
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
        authUser = userData.user;
      }
    }

    // Get Gmail credentials from environment
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("Gmail credentials not configured!");
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Email service not configured. Admin needs to set GMAIL_USER and GMAIL_APP_PASSWORD in Supabase secrets.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const emailData: EmailRequest = await req.json();

    // ── Security: Validate email type ──
    if (!ALLOWED_TYPES.includes(emailData.type)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // ── Security: Validate recipient email ──
    if (!emailData.to || !isValidEmail(emailData.to)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid recipient email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // ── Security: Anonymous callers may ONLY request verification emails with an active OTP session ──
    if (isAnon) {
      if (emailData.type !== "verification") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Forbidden: Unauthenticated callers may only request OTP verification emails",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (!emailData.otp) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing OTP in request" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // Verify against database that this OTP exists and is unexpired for this recipient
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: otpRecord } = await supabaseAdmin
          .from("otp_verifications")
          .select("id, otp")
          .eq("email", emailData.to)
          .eq("verified", false)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!otpRecord || otpRecord.otp !== emailData.otp) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Forbidden: Invalid, unverified, or expired OTP session for recipient",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      }
    }

    // ── Security: Sanitize name to prevent injection ──
    emailData.name = (emailData.name || "User")
      .replace(/[<>"'&]/g, "")
      .slice(0, 100);

    console.log(`Email type: ${emailData.type}, To: ${emailData.to}, Auth: ${isServiceRole ? "service_role" : isAnon ? "anon" : authUser?.id}`);

    const { subject, html } = getEmailTemplate(emailData.type, emailData);

    // Connect to Gmail SMTP
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });

    // Send email
    await client.send({
      from: `LabLink System <${GMAIL_USER}>`,
      to: emailData.to,
      subject: subject,
      content: "Please view this email in an HTML-compatible email client.",
      html: html,
    });

    await client.close();

    console.log("✅ Email sent successfully to:", emailData.to);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${emailData.to}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("❌ Email error:", error.message);
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
