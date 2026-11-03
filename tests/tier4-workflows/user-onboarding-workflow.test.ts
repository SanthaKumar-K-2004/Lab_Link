import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

describe("Tier 4: Real-World Application Workflows — User Onboarding & Role Assignment", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("executes complete user registration -> OTP verification -> role assignment -> login workflow", async () => {
    // -------------------------------------------------------------
    // STEP 1: Registration Form Input & Validation
    // -------------------------------------------------------------
    const registrationData = {
      email: "newstudent@university.edu",
      password: "StrongPassword2026!",
      confirmPassword: "StrongPassword2026!",
      fullName: "Jane Doe",
      registerNumber: "REG-2026-999",
      collegeName: "College of Engineering",
      departmentId: "dept-ece",
    };

    // Validate inputs using application Zod schemas
    expect(emailSchema.safeParse(registrationData.email).success).toBe(true);
    expect(passwordSchema.safeParse(registrationData.password).success).toBe(true);
    expect(registrationData.password).toBe(registrationData.confirmPassword);
    expect(registrationData.fullName.trim().length).toBeGreaterThan(0);
    expect(registrationData.registerNumber.trim().length).toBeGreaterThan(0);

    // Call signUp to register user account
    const signUpRes = await mockSupabase.auth.signUp({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          full_name: registrationData.fullName,
          register_number: registrationData.registerNumber,
          college_name: registrationData.collegeName,
          department_id: registrationData.departmentId,
        },
      },
    });

    expect(signUpRes.error).toBeNull();
    const newUserId = signUpRes.data.user.id;
    expect(newUserId).toBeDefined();

    // Verify created profile is initially unverified and inactive
    const initialProfile = mockSupabase.db.profiles.find((p) => p.id === newUserId);
    expect(initialProfile).toBeDefined();
    expect(initialProfile?.is_verified).toBe(false);
    expect(initialProfile?.is_active).toBe(false);

    // -------------------------------------------------------------
    // STEP 2: Secure OTP Generation & Email Dispatch
    // -------------------------------------------------------------
    const generatedOtp = "849201";
    const otpRpcRes = await mockSupabase.rpc("create_otp", {
      p_email: registrationData.email,
      p_otp: generatedOtp,
    });
    expect(otpRpcRes.data).toBe(true);

    // Send verification email via send-email edge function
    const emailRes = await mockSupabase.functions.invoke("send-email", {
      body: {
        type: "verification",
        to: registrationData.email,
        name: registrationData.fullName,
        otp: generatedOtp,
      },
    });
    expect(emailRes.data.success).toBe(true);

    // Verify OTP record created with valid expiration window
    const otpRecord = mockSupabase.db.otp_verifications.find(
      (o) => o.email === registrationData.email && o.otp_code === generatedOtp
    );
    expect(otpRecord).toBeDefined();
    expect(new Date(otpRecord.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(otpRecord.is_verified).toBe(false);

    // -------------------------------------------------------------
    // STEP 3: OTP Verification & Account Activation
    // -------------------------------------------------------------
    // Incorrect OTP attempt is rejected
    const badOtpRes = await mockSupabase.rpc("verify_otp", {
      p_email: registrationData.email,
      p_otp: "000000",
    });
    expect(badOtpRes.data).toBe(false);
    expect(badOtpRes.error).not.toBeNull();

    // Correct OTP succeeds
    const goodOtpRes = await mockSupabase.rpc("verify_otp", {
      p_email: registrationData.email,
      p_otp: generatedOtp,
    });
    expect(goodOtpRes.data).toBe(true);

    // Profile is activated
    await mockSupabase
      .from("profiles")
      .update({ is_verified: true, is_active: true })
      .eq("id", newUserId);

    const activatedProfile = mockSupabase.db.profiles.find((p) => p.id === newUserId);
    expect(activatedProfile?.is_verified).toBe(true);
    expect(activatedProfile?.is_active).toBe(true);

    // -------------------------------------------------------------
    // STEP 4: Admin Role Assignment & Department Mapping
    // -------------------------------------------------------------
    // Admin elevates user from default 'student' to 'staff'
    await mockSupabase
      .from("user_roles")
      .update({ role: "staff" })
      .eq("user_id", newUserId);

    await mockSupabase.from("user_departments").insert({
      user_id: newUserId,
      department_id: registrationData.departmentId,
    });

    const userRoleRow = mockSupabase.db.user_roles.find((r) => r.user_id === newUserId);
    expect(userRoleRow?.role).toBe("staff");

    const userDeptRow = mockSupabase.db.user_departments.find((d) => d.user_id === newUserId);
    expect(userDeptRow?.department_id).toBe(registrationData.departmentId);

    // -------------------------------------------------------------
    // STEP 5: User Sign-In & Session Establishment
    // -------------------------------------------------------------
    const signInRes = await mockSupabase.auth.signInWithPassword({
      email: registrationData.email,
      password: registrationData.password,
    });

    expect(signInRes.error).toBeNull();
    expect(mockSupabase.currentUser.id).toBe(newUserId);
    expect(mockSupabase.currentSession).not.toBeNull();
  });
});
