import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  Hash,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "register" | "verify" | "forgot_password";

// Validation schemas
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

interface Department {
  id: string;
  name: string;
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    registerNumber: "",
    department: "",
    phone: "",
    collegeName: "",
    address: "",
  });

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch departments for registration
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true);

      if (data) {
        setDepartments(data);
      }
    };
    fetchDepartments();
  }, []);

  // Handle email confirmation callback and URL auth parameters
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const confirmed = urlParams.get("confirmed") || hashParams.get("confirmed");
      const confirm = urlParams.get("confirm") || hashParams.get("confirm");
      const hasAccessToken = window.location.hash.includes("access_token");
      const isConfirmed = confirmed === "true" || confirm === "true" || hasAccessToken;
      const emailParam = urlParams.get("email") || hashParams.get("email");

      if (emailParam && !formData.email) {
        setFormData((prev) => ({ ...prev, email: emailParam }));
      }

      // Check for Supabase PKCE or token verification query params
      const tokenHash = urlParams.get("token_hash");
      const code = urlParams.get("code");
      const type = (urlParams.get("type") as any) || "signup";

      if (tokenHash) {
        try {
          await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        } catch (e) {
          console.warn("Token hash verification error:", e);
        }
      } else if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (e) {
          console.warn("Exchange code for session error:", e);
        }
      }

      // Fetch active session or user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const activeUser = session?.user || user;

      if (isConfirmed && activeUser) {
        // Activate the user's profile
        const { error } = await supabase
          .from("profiles")
          .update({
            is_verified: true,
            is_active: true,
          })
          .eq("id", activeUser.id);

        if (!error) {
          toast({
            title: "Email Verified! ✅",
            description: "Your account is now verified and active. Welcome to LabLink!",
          });
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
          navigate("/dashboard");
        }
      }
    };

    handleEmailConfirmation();

    // Listen to auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        const urlParams = new URLSearchParams(window.location.search);
        const isConfirmed =
          urlParams.get("confirmed") === "true" ||
          window.location.hash.includes("access_token");

        if (isConfirmed) {
          await supabase
            .from("profiles")
            .update({
              is_verified: true,
              is_active: true,
            })
            .eq("id", session.user.id);

          navigate("/dashboard");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast, navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect");
      navigate(redirectTo || "/dashboard");
    }
  }, [user, loading, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(formData.email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === "register") {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }
      if (!formData.registerNumber.trim()) {
        newErrors.registerNumber = "Register number is required";
      }
      if (!formData.department) {
        newErrors.department = "Please select a department";
      }
      if (!formData.collegeName.trim()) {
        newErrors.collegeName = "College name is required";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendVerificationOTP = async (email: string, name: string) => {
    const otpCode = generateOTP();

    const { error: otpError } = await supabase.rpc("create_otp", {
      p_email: email,
      p_otp: otpCode,
    });

    if (otpError) {
      console.error("OTP create error:", otpError);
      if (
        otpError.message?.includes("rate") ||
        otpError.message?.includes("Too many")
      ) {
        throw new Error("Too many OTP requests. Please wait a few minutes.");
      }
      throw new Error("Failed to generate OTP");
    }

    const { data, error: emailError } = await supabase.functions.invoke(
      "send-email",
      {
        body: {
          type: "verification",
          to: email,
          name,
          otp: otpCode,
        },
      },
    );

    if (emailError) {
      throw new Error(
        "Failed to send verification email: " + emailError.message,
      );
    }

    if (data && !data.success) {
      throw new Error(data.error || "Failed to send verification email");
    }
  };

  const verifyOTP = async () => {
    setIsLoading(true);

    try {
      let isVerified = false;

      // 1. Attempt Supabase native OTP verification (verifies the 6-digit token sent via Supabase email)
      try {
        const { data: supaVerify, error: supaErr } =
          await supabase.auth.verifyOtp({
            email: pendingEmail,
            token: otp,
            type: "signup",
          });

        if (!supaErr && supaVerify?.user) {
          isVerified = true;
        }
      } catch (e) {
        console.warn("Supabase signup OTP attempt error:", e);
      }

      // Also try type: "email" if signup wasn't matched
      if (!isVerified) {
        try {
          const { data: supaVerify, error: supaErr } =
            await supabase.auth.verifyOtp({
              email: pendingEmail,
              token: otp,
              type: "email",
            });

          if (!supaErr && supaVerify?.user) {
            isVerified = true;
          }
        } catch (e) {
          // continue to RPC check
        }
      }

      // 2. Attempt custom database RPC verify_otp as fallback
      if (!isVerified) {
        const { data: verifyResult, error: verifyError } = await supabase.rpc(
          "verify_otp",
          { p_email: pendingEmail, p_otp: otp },
        );

        const isOtpValid =
          typeof verifyResult === "boolean"
            ? verifyResult
            : (verifyResult as any)?.valid;

        if (isOtpValid) {
          isVerified = true;
        } else if (verifyError) {
          console.warn("RPC verify_otp error:", verifyError);
        }
      }

      if (!isVerified) {
        toast({
          variant: "destructive",
          title: "Invalid Verification Code",
          description:
            "The code is invalid or has expired. Please check your email or click Resend.",
        });
        setIsLoading(false);
        return;
      }

      // User's OTP is verified! Activate the user profile
      let authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser && formData.password) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: formData.password,
        });
        authUser = signInData?.user || null;
      }

      if (authUser) {
        await supabase
          .from("profiles")
          .update({
            register_number: formData.registerNumber || undefined,
            college_name: formData.collegeName || undefined,
            phone: formData.phone || null,
            is_verified: true,
            is_active: true,
          })
          .eq("id", authUser.id);
      } else {
        await supabase
          .from("profiles")
          .update({
            is_verified: true,
            is_active: true,
          })
          .eq("email", pendingEmail);
      }

      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "credentials",
            to: pendingEmail,
            name: formData.fullName,
            email: pendingEmail,
            password: formData.password,
          },
        });
      } catch (emailError) {
        console.log("Credentials email may not have been sent:", emailError);
      }

      toast({
        title: "Registration & Verification Successful! 🎉",
        description:
          "Your account is verified and active. You are now logged in.",
      });

      setMode("login");
      setFormData({
        email: pendingEmail,
        password: "",
        confirmPassword: "",
        fullName: "",
        registerNumber: "",
        department: "",
        phone: "",
        collegeName: "",
        address: "",
      });
      setOtp("");
      setPendingEmail("");
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "An error occurred during verification.",
      });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(forgotPasswordEmail);
    if (!emailResult.success) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: emailResult.error.errors[0].message,
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        },
      );

      if (error) throw error;

      toast({
        title: "Reset Email Sent! 📧",
        description: "Check your email for a password reset link.",
      });
      setMode("login");
      setForgotPasswordEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email.",
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "verify") {
      await verifyOTP();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              variant: "destructive",
              title: "Email Not Verified",
              description: "Please verify your email before logging in.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: error.message,
            });
          }
          setIsLoading(false);
          return;
        }

        const {
          data: { user: loggedInUser },
        } = await supabase.auth.getUser();
        if (loggedInUser) {
          await supabase.from("login_logs").insert({
            user_id: loggedInUser.id,
            login_time: new Date().toISOString(),
          });
        }

        toast({
          title: "Welcome back!",
          description: "Login successful. Redirecting...",
        });
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get("redirect");
        navigate(redirectTo || "/dashboard");
      } else {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", formData.email)
          .maybeSingle();

        if (existingUser) {
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "An account with this email already exists.",
          });
          setIsLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/auth?confirmed=true`;

        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                full_name: formData.fullName,
                phone: formData.phone || null,
                address: formData.address || null,
                college_name: formData.collegeName,
                department_id: formData.department,
                register_number: formData.registerNumber,
              },
            },
          });

        if (signUpError) {
          throw signUpError;
        }

        if (signUpData.user) {
          await supabase
            .from("profiles")
            .update({
              register_number: formData.registerNumber,
              college_name: formData.collegeName,
              phone: formData.phone || null,
              is_verified: false,
              is_active: false,
            })
            .eq("id", signUpData.user.id);
        }

        setPendingEmail(formData.email);
        try {
          await sendVerificationOTP(formData.email, formData.fullName);
          toast({
            title: "Verification Email Sent! 📧",
            description:
              "Check your email and click the confirmation link or enter the 6-digit code.",
          });
        } catch (otpErr: any) {
          console.warn("Custom OTP send note:", otpErr);
          toast({
            title: "Account Created! 📧",
            description:
              "We sent an activation link to your email. Click the link in your email or enter your 6-digit code.",
          });
        }

        setMode("verify");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred.",
      });
    }

    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-xl border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-xl border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse font-medium">Loading LabLink...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-border/40">
        <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -left-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -right-[10%] bottom-[10%] h-[600px] w-[600px] rounded-full bg-cyan-500/20 blur-[130px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <Link to="/" className="flex items-center gap-3">
             <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 rounded-xl opacity-75 blur-sm transition-opacity"></div>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden bg-white shadow-lg">
                <img
                  src="/lablink-logo.jpg"
                  alt="LabLink"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                LabLink
              </span>
              <span className="text-xs text-blue-500 -mt-1 tracking-wider font-medium">
                LAB SMART
              </span>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8 relative z-10"
        >
          <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight text-foreground">
            Laboratory Inventory
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
              and Assets Management System
            </span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground font-medium">
            Streamline your lab operations with real-time inventory tracking,
            QR-based management, and comprehensive analytics.
          </p>
          <div className="flex gap-4">
            <div className="rounded-2xl bg-white/5 p-5 backdrop-blur-xl shadow-lg border border-primary/20">
              <p className="font-display text-3xl font-bold text-foreground">
                2,450+
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Items Managed
              </p>
            </div>
            <div className="rounded-2xl border bg-white/5 p-5 backdrop-blur-xl shadow-lg border-cyan-500/20">
              <p className="font-display text-3xl font-bold text-foreground">
                99.9%
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Uptime
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.4 }}
           className="relative z-10 space-y-2 mt-auto"
        >
          <p className="text-sm text-muted-foreground font-medium">
            © 2026 LabLink. Enterprise Lab Management Solution.
          </p>
          <p className="text-xs text-muted-foreground/80 font-medium">
            A <span className="text-primary font-semibold">LabLink Solution</span> by{" "}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-semibold">Alphax Heros</span>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 relative bg-background/50">
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ type: "spring", duration: 0.6 }}
           className="w-full max-w-lg"
        >
          <Card className="border border-border/50 bg-background/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600"></div>
            
            <CardHeader className="space-y-1 text-center pt-10 pb-4">
              <div className="mb-6 flex flex-col items-center lg:hidden">
                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 rounded-xl opacity-75 blur-sm transition-opacity"></div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl overflow-hidden bg-white shadow-lg">
                      <img
                        src="/lablink-logo.jpg"
                        alt="LabLink"
                        className="h-full w-full object-cover"
                      />
                    </div>
                </div>
                <div className="flex flex-col items-center mt-3">
                  <span className="font-display text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    LabLink
                  </span>
                  <span className="text-xs text-blue-500 -mt-1 tracking-wider font-medium">
                    LAB SMART
                  </span>
                </div>
              </div>

              <div className="relative h-20 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute w-full"
                  >
                    <CardTitle className="font-display text-3xl font-bold tracking-tight">
                      {mode === "login"
                        ? "Welcome Back"
                        : mode === "verify"
                          ? "Verify Email"
                          : mode === "forgot_password"
                            ? "Reset Password"
                            : "Create Account"}
                    </CardTitle>
                    <CardDescription className="text-base mt-2 hidden sm:block">
                      {mode === "login"
                        ? "Enter your credentials to securely access your lab"
                        : mode === "verify"
                          ? `Enter the 6-digit code sent to ${pendingEmail}`
                          : mode === "forgot_password"
                            ? "Enter your email to receive a password reset link"
                            : "Register as a student to explore our lab catalog"}
                    </CardDescription>
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardHeader>

            <CardContent className="pb-10 pt-2 px-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {mode === "forgot_password" ? (
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="forgotEmail" className="font-medium">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                          <Input
                            id="forgotEmail"
                            type="email"
                            placeholder="name@example.com"
                            className="pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        size="xl"
                        className="w-full h-12 rounded-xl text-md font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mt-4"
                      >
                        Back to Login
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {mode === "verify" ? (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="otp" className="font-medium text-center block">Verification Code</Label>
                            <Input
                              id="otp"
                              name="otp"
                              placeholder="000000"
                              className="text-center text-3xl tracking-[1em] h-16 rounded-xl font-display font-medium bg-background/50 border-primary/30 focus:border-primary shadow-inner"
                              value={otp}
                              onChange={(e) =>
                                setOtp(
                                  e.target.value.replace(/\D/g, "").slice(0, 6),
                                )
                              }
                              maxLength={6}
                            />
                          </div>
                          <Button
                            type="submit"
                            size="xl"
                            className="w-full h-12 rounded-xl text-md font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
                            disabled={isLoading || otp.length !== 6}
                          >
                            {isLoading ? "Verifying..." : "Verify & Create Account"}
                          </Button>
                          <p className="text-center text-sm font-medium text-muted-foreground mt-4">
                            Didn't receive the email?{" "}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await supabase.auth.resend({
                                    type: "signup",
                                    email: pendingEmail,
                                    options: {
                                      emailRedirectTo: `${window.location.origin}/auth?confirmed=true`,
                                    },
                                  });
                                  await sendVerificationOTP(
                                    pendingEmail,
                                    formData.fullName,
                                  );
                                } catch (e) {
                                  // ignore
                                }
                                toast({
                                  title: "Verification Resent 📧",
                                  description:
                                    "Check your inbox for a fresh activation link or code.",
                                });
                              }}
                              className="text-primary hover:text-primary/80 hover:underline transition-colors font-semibold"
                            >
                              Resend
                            </button>
                          </p>
                          <button
                            type="button"
                            onClick={() => setMode("register")}
                            className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Back to Registration
                          </button>
                        </div>
                      ) : (
                        <>
                          {mode === "register" && (
                            <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <div className="space-y-2">
                                <Label htmlFor="fullName" className="font-medium">Full Name *</Label>
                                <div className="relative">
                                  <User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                                  <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="John Doe"
                                    className={`pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors ${errors.fullName ? "border-destructive/50 focus:border-destructive" : ""}`}
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                {errors.fullName && (
                                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                    <span className="h-1 w-1 rounded-full bg-destructive"></span> {errors.fullName}
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="registerNumber" className="font-medium">
                                    Register No. *
                                  </Label>
                                  <div className="relative">
                                    <Hash className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                                    <Input
                                      id="registerNumber"
                                      name="registerNumber"
                                      placeholder="EX: 123456"
                                      className={`pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors ${errors.registerNumber ? "border-destructive/50" : ""}`}
                                      value={formData.registerNumber}
                                      onChange={handleInputChange}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="phone" className="font-medium">
                                    Phone (Opt)
                                  </Label>
                                  <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                                    <Input
                                      id="phone"
                                      name="phone"
                                      type="tel"
                                      placeholder="9876543210"
                                      className="pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors"
                                      value={formData.phone}
                                      onChange={handleInputChange}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="department" className="font-medium">Department *</Label>
                                <div className="relative">
                                  <Building2 className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
                                  <select
                                    id="department"
                                    name="department"
                                    aria-label="Select Department"
                                    className={`flex h-12 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 py-2 pl-11 text-sm shadow-sm transition-colors focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${errors.department ? "border-destructive/50" : ""}`}
                                    value={formData.department}
                                    onChange={handleInputChange}
                                  >
                                    <option value="" disabled>Select your department</option>
                                    {departments.map((dept) => (
                                      <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="collegeName" className="font-medium">College Name *</Label>
                                <div className="relative">
                                  <Building2 className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                                  <Input
                                    id="collegeName"
                                    name="collegeName"
                                    placeholder="Enter your college name"
                                    className={`pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors ${errors.collegeName ? "border-destructive/50" : ""}`}
                                    value={formData.collegeName}
                                    onChange={handleInputChange}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="email" className="font-medium">Email Address {mode === "register" ? "*" : ""}</Label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                className={`pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors ${errors.email ? "border-destructive/50" : ""}`}
                                value={formData.email}
                                onChange={handleInputChange}
                              />
                            </div>
                            {errors.email && (
                              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                <span className="h-1 w-1 rounded-full bg-destructive"></span> {errors.email}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password" className="font-medium">Password {mode === "register" ? "*" : ""}</Label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                              <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className={`pl-11 pr-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors tracking-widest placeholder:tracking-normal ${errors.password ? "border-destructive/50" : ""}`}
                                value={formData.password}
                                onChange={handleInputChange}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                            {errors.password && (
                              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                <span className="h-1 w-1 rounded-full bg-destructive"></span> {errors.password}
                              </p>
                            )}
                          </div>

                          {mode === "register" && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <Label htmlFor="confirmPassword" className="font-medium">
                                Confirm Password *
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                                <Input
                                  id="confirmPassword"
                                  name="confirmPassword"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className={`pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-colors tracking-widest placeholder:tracking-normal ${errors.confirmPassword ? "border-destructive/50" : ""}`}
                                  value={formData.confirmPassword}
                                  onChange={handleInputChange}
                                />
                              </div>
                            </div>
                          )}

                          {mode === "login" && (
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => setMode("forgot_password")}
                                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                Forgot password?
                              </button>
                            </div>
                          )}

                          <Button
                            type="submit"
                            size="xl"
                            className="w-full h-12 rounded-xl text-md font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all group"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                               <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
                               </span>
                            ) : mode === "login" ? (
                              <span className="flex items-center gap-2">
                                Sign In <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                              </span>
                            ) : (
                               <span className="flex items-center gap-2">
                                Continue <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                               </span>
                            )}
                          </Button>

                          <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
                            {mode === "login" ? (
                              <>
                                Don't have an account?{" "}
                                <button
                                  type="button"
                                  onClick={() => setMode("register")}
                                  className="text-primary hover:text-primary/80 transition-colors"
                                >
                                  Register here
                                </button>
                              </>
                            ) : (
                              <>
                                Already have an account?{" "}
                                <button
                                  type="button"
                                  onClick={() => setMode("login")}
                                  className="text-primary hover:text-primary/80 transition-colors"
                                >
                                  Sign In Instead
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
