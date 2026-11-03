import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

describe("Tier 1: Authentication & Role Validation", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("authenticates existing user with valid credentials and sets session", async () => {
    const res = await mockSupabase.auth.signInWithPassword({
      email: "alice@university.edu",
      password: "password123",
    });

    expect(res.error).toBeNull();
    expect(res.data?.user).toBeDefined();
    expect(res.data?.user.id).toBe("user-student-1");
    expect(res.data?.user.email).toBe("alice@university.edu");

    const sessionRes = await mockSupabase.auth.getSession();
    expect(sessionRes.data.session).not.toBeNull();
    expect(sessionRes.data.session?.user.id).toBe("user-student-1");
  });

  it("rejects sign-in with non-existent email", async () => {
    const res = await mockSupabase.auth.signInWithPassword({
      email: "unknown@university.edu",
      password: "password123",
    });

    expect(res.error).not.toBeNull();
    expect(res.error?.message).toContain("Invalid login credentials");
    expect(res.data).toBeNull();
  });

  it("signs out current user and clears session", async () => {
    await mockSupabase.auth.signInWithPassword({
      email: "alice@university.edu",
      password: "password123",
    });

    expect(mockSupabase.currentUser).not.toBeNull();

    await mockSupabase.auth.signOut();
    expect(mockSupabase.currentUser).toBeNull();
    expect(mockSupabase.currentSession).toBeNull();

    const sessionRes = await mockSupabase.auth.getSession();
    expect(sessionRes.data.session).toBeNull();
  });

  it("validates roles across student, admin, and technician accounts", async () => {
    // 1. Student
    const { data: studentRole } = await mockSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", "user-student-1")
      .single();
    expect(studentRole?.role).toBe("student");

    // 2. Admin
    const { data: adminRole } = await mockSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", "user-admin-1")
      .single();
    expect(adminRole?.role).toBe("admin");

    // 3. Technician
    const { data: techRole } = await mockSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", "user-tech-1")
      .single();
    expect(techRole?.role).toBe("technician");
  });

  it("maps user profile and department associations correctly", async () => {
    const { data: profile } = await mockSupabase
      .from("profiles")
      .select("*")
      .eq("id", "user-student-1")
      .single();

    expect(profile).toBeDefined();
    expect(profile?.full_name).toBe("Alice Student");
    expect(profile?.college_name).toBe("Tech University");
    expect(profile?.register_number).toBe("REG-2026-001");
    expect(profile?.is_active).toBe(true);
    expect(profile?.is_verified).toBe(true);

    const { data: userDept } = await mockSupabase
      .from("user_departments")
      .select("department_id")
      .eq("user_id", "user-student-1")
      .single();

    expect(userDept?.department_id).toBe("dept-ece");

    const { data: dept } = await mockSupabase
      .from("departments")
      .select("*")
      .eq("id", userDept?.department_id)
      .single();

    expect(dept?.name).toBe("Electronics & Communication");
    expect(dept?.code).toBe("ECE");
  });

  it("listens to auth state changes and notifies subscribers", async () => {
    const authCallback = vi.fn();
    const { data: { subscription } } = mockSupabase.auth.onAuthStateChange(authCallback);

    mockSupabase.setCurrentUser("user-admin-1");
    expect(authCallback).toHaveBeenCalledWith("SIGNED_IN", expect.objectContaining({
      user: expect.objectContaining({ id: "user-admin-1" }),
    }));

    subscription.unsubscribe();
    mockSupabase.setCurrentUser("user-student-1");
    // Should not call again after unsubscribe
    expect(authCallback).toHaveBeenCalledTimes(1);
  });
});
