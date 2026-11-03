import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Scan,
  Package,
  LogIn,
  LogOut,
  Search,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Maximize,
  QrCode,
  Loader2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { format } from "date-fns";

type KioskStep = "idle" | "scan" | "action" | "confirm" | "result";

interface ScannedItem {
  id: string;
  name: string;
  item_code: string;
  serial_number: string | null;
  status: string;
  image_url: string | null;
  current_quantity: number;
  category?: { name: string } | null;
  lab_location?: string | null;
}

export default function KioskMode() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<KioskStep>("idle");
  const [searchInput, setSearchInput] = useState("");
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [action, setAction] = useState<"borrow" | "return" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Student record check
  const [studentRecord, setStudentRecord] = useState<{
    status: "clean" | "warning" | "blocked";
    activeBorrows: number;
    overdueCount: number;
    damageReports: number;
  } | null>(null);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch recent activity for current user
  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("issued_items")
      .select(
        "id, item_id, created_at, returned_date, status, items(name, item_code)",
      )
      .eq("issued_to", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentActivity(data || []);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  // Look up item by code or QR
  const handleLookup = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      const trimmed = input.trim();
      const { data, error } = await supabase
        .from("items")
        .select(
          "id, name, item_code, serial_number, status, image_url, current_quantity, category:categories(name), lab_location",
        )
        .or(
          `item_code.eq.${trimmed},serial_number.eq.${trimmed},barcode.eq.${trimmed},id.eq.${trimmed}`,
        )
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: `No item found for "${trimmed}".`,
        });
        setSearchInput("");
        return;
      }

      setScannedItem(data);
      setStep("action");
      setSearchInput("");

      // Run student record check in background
      checkStudentRecord();
    },
    [toast, user],
  );

  // Student record check — determines auto-approval eligibility
  const checkStudentRecord = async () => {
    if (!user) return;

    try {
      // Get active borrows count
      const { count: activeBorrows } = await supabase
        .from("issued_items")
        .select("id", { count: "exact", head: true })
        .eq("issued_to", user.id)
        .eq("status", "active")
        .is("returned_date", null);

      // Get overdue items (due_date has passed, not returned)
      const { count: overdueCount } = await supabase
        .from("issued_items")
        .select("id", { count: "exact", head: true })
        .eq("issued_to", user.id)
        .eq("status", "active")
        .is("returned_date", null)
        .lt("due_date", new Date().toISOString());

      // Get damage reports from return_requests
      const { count: damageReports } = await supabase
        .from("return_requests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .in("item_condition", ["damaged", "missing_parts", "lost"]);

      const overdue = overdueCount || 0;
      const damage = damageReports || 0;
      const active = activeBorrows || 0;

      let status: "clean" | "warning" | "blocked" = "clean";
      if (overdue > 0 || damage > 0) status = "warning";
      if (overdue >= 3 || active >= 5) status = "blocked";

      setStudentRecord({
        status,
        activeBorrows: active,
        overdueCount: overdue,
        damageReports: damage,
      });
    } catch {
      setStudentRecord(null);
    }
  };

  // Handle borrow
  // Handle borrow via SECURITY DEFINER RPC
  const handleBorrow = async () => {
    if (!scannedItem || !user) return;
    setIsProcessing(true);

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Invoke SECURITY DEFINER RPC to handle atomic quantity decrement and checkout record creation
      const { data, error } = await supabase.rpc("kiosk_checkout", {
        p_item_id: scannedItem.id,
        p_due_date: dueDate.toISOString(),
      });

      if (error) throw error;

      const res = data as { success?: boolean; error?: string; message?: string } | null;

      if (!res?.success) {
        setResultMessage({
          success: false,
          message: res?.error || "Failed to check out item.",
        });
        setStep("result");
        return;
      }

      setResultMessage({
        success: true,
        message: res.message || `"${scannedItem.name}" checked out successfully!`,
      });
      setStep("result");
      fetchRecentActivity();
    } catch (err: any) {
      setResultMessage({
        success: false,
        message: err.message || "Failed to check out item.",
      });
      setStep("result");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle return via SECURITY DEFINER RPC
  const handleReturn = async () => {
    if (!scannedItem || !user) return;
    setIsProcessing(true);

    try {
      // Find the active issued record for this user and item
      const { data: record, error: findError } = await supabase
        .from("issued_items")
        .select("id")
        .eq("item_id", scannedItem.id)
        .eq("issued_to", user.id)
        .eq("status", "active")
        .is("returned_date", null)
        .maybeSingle();

      if (findError) throw findError;

      if (!record) {
        setResultMessage({
          success: false,
          message: "No active checkout found for this item.",
        });
        setStep("result");
        return;
      }

      // Invoke SECURITY DEFINER RPC to return the item and restore inventory count
      const { data, error } = await supabase.rpc("kiosk_return", {
        p_issued_item_id: record.id,
      });

      if (error) throw error;

      const res = data as { success?: boolean; error?: string; message?: string } | null;

      if (!res?.success) {
        setResultMessage({
          success: false,
          message: res?.error || "Failed to return item.",
        });
        setStep("result");
        return;
      }

      setResultMessage({
        success: true,
        message: res.message || `"${scannedItem.name}" returned successfully!`,
      });
      setStep("result");
      fetchRecentActivity();
    } catch (err: any) {
      setResultMessage({
        success: false,
        message: err.message || "Failed to return item.",
      });
      setStep("result");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetKiosk = () => {
    setStep("idle");
    setScannedItem(null);
    setAction(null);
    setResultMessage(null);
    setSearchInput("");
    setStudentRecord(null);
  };

  // Auto-reset after result
  useEffect(() => {
    if (step === "result") {
      const timer = setTimeout(resetKiosk, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">LabLink Kiosk</h1>
            <p className="text-blue-300 text-sm">Self-Service Checkout</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-lg">
              {format(currentTime, "HH:mm:ss")}
            </p>
            <p className="text-blue-300 text-xs">
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
          >
            <Maximize className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/10 gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Exit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          {/* IDLE / SCAN STEP */}
          {(step === "idle" || step === "scan") && (
            <div className="text-center space-y-8">
              <div>
                <Scan className="h-20 w-20 mx-auto text-blue-400 mb-6 animate-pulse" />
                <h2 className="text-3xl font-bold mb-2">
                  Scan or Enter Item Code
                </h2>
                <p className="text-blue-300">
                  Use a QR/barcode scanner or type the item code
                </p>
              </div>

              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-blue-400" />
                <Input
                  autoFocus
                  placeholder="Scan QR code or type item code..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLookup(searchInput);
                  }}
                  className="h-16 pl-14 pr-4 text-xl bg-white/10 border-white/20 text-white placeholder:text-blue-300/50 rounded-2xl focus:border-blue-400 focus:ring-blue-400/30"
                />
              </div>

              <Button
                onClick={() => handleLookup(searchInput)}
                size="lg"
                disabled={!searchInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 rounded-2xl shadow-xl shadow-blue-500/30"
              >
                <Search className="h-5 w-5 mr-2" /> Look Up Item
              </Button>

              {/* User info */}
              {user && profile && (
                <div className="flex items-center justify-center gap-3 mt-6 py-3 px-5 rounded-xl bg-white/5 border border-white/10 max-w-sm mx-auto">
                  <div className="h-10 w-10 rounded-full bg-blue-600/30 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{profile.full_name || "User"}</p>
                    <p className="text-blue-300 text-sm">{profile.email}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTION STEP — Choose Borrow or Return */}
          {step === "action" && scannedItem && (
            <div className="space-y-8">
              <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-6">
                  <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                    {scannedItem.image_url ? (
                      <img
                        src={scannedItem.image_url}
                        alt=""
                        className="h-full w-full object-cover rounded-2xl"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-blue-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold mb-1">
                      {scannedItem.name}
                    </h3>
                    <p className="text-blue-300 font-mono">
                      {scannedItem.item_code}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <Badge
                        className={`text-sm ${
                          scannedItem.status === "available"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {scannedItem.status.replace("_", " ")}
                      </Badge>
                      {scannedItem.category && (
                        <Badge
                          variant="outline"
                          className="border-white/20 text-white/70"
                        >
                          {scannedItem.category.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Record Status */}
              {studentRecord && (
                <Card
                  className={`border backdrop-blur-xl ${
                    studentRecord.status === "clean"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : studentRecord.status === "warning"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {studentRecord.status === "clean" ? (
                      <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
                    ) : studentRecord.status === "warning" ? (
                      <ShieldAlert className="h-8 w-8 text-amber-400 shrink-0" />
                    ) : (
                      <ShieldX className="h-8 w-8 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm ${
                          studentRecord.status === "clean"
                            ? "text-emerald-300"
                            : studentRecord.status === "warning"
                              ? "text-amber-300"
                              : "text-red-300"
                        }`}
                      >
                        {studentRecord.status === "clean" &&
                          "✓ Clean Record — Auto-Approval Eligible"}
                        {studentRecord.status === "warning" &&
                          "⚠ Record Flagged — Manual Review May Apply"}
                        {studentRecord.status === "blocked" &&
                          "✕ Account Restricted — Too Many Violations"}
                      </p>
                      <p className="text-xs text-blue-200/60 mt-1">
                        Active: {studentRecord.activeBorrows} · Overdue:{" "}
                        {studentRecord.overdueCount} · Damage Reports:{" "}
                        {studentRecord.damageReports}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => {
                    setAction("borrow");
                    handleBorrow();
                  }}
                  disabled={
                    scannedItem.status !== "available" ||
                    isProcessing ||
                    studentRecord?.status === "blocked"
                  }
                  className="h-28 bg-emerald-600 hover:bg-emerald-700 text-xl rounded-2xl shadow-xl shadow-emerald-500/20 flex-col gap-2 disabled:opacity-40"
                >
                  {isProcessing && action === "borrow" ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <LogIn className="h-8 w-8" />
                  )}
                  Check Out
                </Button>
                <Button
                  onClick={() => {
                    setAction("return");
                    handleReturn();
                  }}
                  disabled={isProcessing}
                  className="h-28 bg-blue-600 hover:bg-blue-700 text-xl rounded-2xl shadow-xl shadow-blue-500/20 flex-col gap-2"
                >
                  {isProcessing && action === "return" ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <LogOut className="h-8 w-8" />
                  )}
                  Return
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={resetKiosk}
                className="w-full text-blue-300 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* RESULT STEP */}
          {step === "result" && resultMessage && (
            <div className="text-center space-y-6">
              <div
                className={`h-24 w-24 rounded-full mx-auto flex items-center justify-center ${
                  resultMessage.success ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}
              >
                {resultMessage.success ? (
                  <CheckCircle2 className="h-14 w-14 text-emerald-400" />
                ) : (
                  <XCircle className="h-14 w-14 text-red-400" />
                )}
              </div>
              <h2
                className={`text-2xl font-bold ${resultMessage.success ? "text-emerald-400" : "text-red-400"}`}
              >
                {resultMessage.success ? "Success!" : "Error"}
              </h2>
              <p className="text-lg text-blue-200">{resultMessage.message}</p>
              <p className="text-sm text-blue-300/60">
                Returning to home screen in 5 seconds...
              </p>
              <Button
                onClick={resetKiosk}
                className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Footer */}
      {step === "idle" && recentActivity.length > 0 && (
        <div className="border-t border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Your Recent Activity
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[250px] shrink-0"
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    act.returned_date ? "bg-blue-500/20" : "bg-emerald-500/20"
                  }`}
                >
                  {act.returned_date ? (
                    <LogOut className="h-4 w-4 text-blue-400" />
                  ) : (
                    <LogIn className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {(act.items as any)?.name || "Item"}
                  </p>
                  <p className="text-xs text-blue-300">
                    {act.returned_date ? "Returned" : "Checked out"}{" "}
                    {format(new Date(act.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
