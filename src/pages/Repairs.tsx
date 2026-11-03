import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Wrench,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  DollarSign,
  Edit,
  Loader2,
  Play,
  CheckCheck,
  Timer,
  Target,
  TrendingUp,
  Zap,
  RefreshCw,
  FileText,
  MessageSquare,
  Download,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/components/auth/ProtectedRoute";
import { generateTechnicianRepairsPDF, generateTechnicianRepairsExcel, MaintenanceReportRow } from "@/lib/reportExports";

interface Item {
  id: string;
  name: string;
  item_code: string;
}

interface MaintenanceRecord {
  id: string;
  item_id: string;
  reason: string | null;
  status: string;
  start_date: string | null;
  estimated_completion: string | null;
  actual_completion: string | null;
  cost: number | null;
  repair_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  item?: { name: string; item_code: string };
  technician?: { full_name: string };
}

interface RepairStats {
  assigned: number;
  inProgress: number;
  completedToday: number;
  completedThisWeek: number;
  avgRepairTime: number;
}

export default function Repairs() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("my_queue");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [repairNotes, setRepairNotes] = useState("");
  const [stats, setStats] = useState<RepairStats>({
    assigned: 0,
    inProgress: 0,
    completedToday: 0,
    completedThisWeek: 0,
    avgRepairTime: 0,
  });
  const [isExporting, setIsExporting] = useState(false);

  const userId = user?.id;

  const fetchRecords = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          item:items(name, item_code),
          technician:profiles!maintenance_records_assigned_to_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords((data as MaintenanceRecord[]) || []);
      calculateStats((data as MaintenanceRecord[]) || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch repair records",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  const calculateStats = (data: MaintenanceRecord[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const myRecords = data.filter((r) => r.assigned_to === userId);
    const assigned = myRecords.filter((r) => r.status === "pending").length;
    const inProgress = myRecords.filter((r) => r.status === "in_progress").length;

    const completedRecords = myRecords.filter((r) => r.status === "completed" && r.actual_completion);
    const completedToday = completedRecords.filter((r) => {
      const completedDate = new Date(r.actual_completion!);
      return completedDate >= today;
    }).length;

    const completedThisWeek = completedRecords.filter((r) => {
      const completedDate = new Date(r.actual_completion!);
      return completedDate >= weekAgo;
    }).length;

    // Calculate average repair time
    let avgRepairTime = 0;
    const repairsWithTime = completedRecords.filter((r) => r.start_date && r.actual_completion);
    if (repairsWithTime.length > 0) {
      const totalDays = repairsWithTime.reduce((sum, r) => {
        return sum + differenceInDays(new Date(r.actual_completion!), new Date(r.start_date!));
      }, 0);
      avgRepairTime = Math.round(totalDays / repairsWithTime.length);
    }

    setStats({ assigned, inProgress, completedToday, completedThisWeek, avgRepairTime });
  };

  useEffect(() => {
    fetchRecords();

    // Set up real-time subscription
    const channel = supabase
      .channel("repairs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_records" },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  const updateStatus = async (id: string, newStatus: string) => {
    setIsSubmitting(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "in_progress" && !records.find((r) => r.id === id)?.start_date) {
        updateData.start_date = new Date().toISOString();
      }
      if (newStatus === "completed") {
        updateData.actual_completion = new Date().toISOString();
        const rec = records.find((r) => r.id === id);
        if (rec?.item_id) {
          const { error: rpcError } = await supabase.rpc("update_item_repair_status", {
            p_item_id: rec.item_id,
            p_status: "available",
          });
          if (rpcError) {
            console.warn("RPC update_item_repair_status failed, falling back to direct update:", rpcError);
            await supabase
              .from("items")
              .update({ status: "available" })
              .eq("id", rec.item_id)
              .eq("status", "under_maintenance");
          }
        }
      } else if (newStatus === "in_progress") {
        const rec = records.find((r) => r.id === id);
        if (rec?.item_id) {
          const { error: rpcError } = await supabase.rpc("update_item_repair_status", {
            p_item_id: rec.item_id,
            p_status: "under_maintenance",
          });
          if (rpcError) {
            console.warn("RPC update_item_repair_status failed, falling back to direct update:", rpcError);
            await supabase
              .from("items")
              .update({ status: "under_maintenance" })
              .eq("id", rec.item_id);
          }
        }
      }

      const { error } = await supabase
        .from("maintenance_records")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Repair status updated to ${newStatus.replace("_", " ")}`,
      });
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update status",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const claimRepair = async (id: string) => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("maintenance_records")
        .update({ assigned_to: userId })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Repair claimed successfully" });
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to claim repair",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedRecord) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("maintenance_records")
        .update({ repair_notes: repairNotes })
        .eq("id", selectedRecord.id);

      if (error) throw error;
      toast({ title: "Success", description: "Notes saved successfully" });
      setDialogOpen(false);
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save notes",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNotesDialog = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setRepairNotes(record.repair_notes || "");
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
            <Wrench className="h-3 w-3 mr-1 animate-pulse" /> In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case "on_hold":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">
            <AlertTriangle className="h-3 w-3 mr-1" /> On Hold
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityIndicator = (record: MaintenanceRecord) => {
    if (!record.estimated_completion) return null;
    const daysUntilDue = differenceInDays(new Date(record.estimated_completion), new Date());
    if (daysUntilDue < 0) {
      return <Badge className="bg-red-500 text-white ml-2">Overdue</Badge>;
    }
    if (daysUntilDue <= 1) {
      return <Badge className="bg-orange-500 text-white ml-2">Due Soon</Badge>;
    }
    return null;
  };

  // Filter records based on active tab
  const getFilteredRecords = () => {
    let filtered = records;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (rec) =>
          rec.item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.item?.item_code?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply tab filter
    switch (activeTab) {
      case "my_queue":
        return filtered.filter((r) => r.assigned_to === userId && r.status !== "completed");
      case "unassigned":
        return filtered.filter((r) => !r.assigned_to && r.status === "pending");
      case "in_progress":
        return filtered.filter((r) => r.status === "in_progress");
      case "completed":
        return filtered.filter((r) => r.status === "completed");
      case "all":
        return filtered;
      default:
        return filtered;
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Technician";

  const handleExport = async (exportType: 'pdf' | 'excel') => {
    // Get records assigned to current user or all if admin/staff
    const myRecords = records.filter(r => r.assigned_to === userId);
    
    if (myRecords.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "You don't have any repair records to export.",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Convert records to MaintenanceReportRow format
      const exportData: MaintenanceReportRow[] = myRecords.map(rec => ({
        id: rec.id,
        itemName: rec.item?.name || 'Unknown',
        itemCode: rec.item?.item_code || '',
        reason: rec.reason || '',
        status: rec.status,
        assignedTo: rec.technician?.full_name || userName,
        startDate: rec.start_date || '',
        estimatedCompletion: rec.estimated_completion || '',
        actualCompletion: rec.actual_completion || '',
        cost: rec.cost || 0,
        repairNotes: rec.repair_notes || '',
        partsUsed: '', // Would need to be stored separately
      }));

      if (exportType === 'pdf') {
        generateTechnicianRepairsPDF(exportData, userName);
      } else {
        generateTechnicianRepairsExcel(exportData, userName);
      }

      toast({
        title: "Success",
        description: `Your repair records have been exported as ${exportType.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export your repair records. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredRecords = getFilteredRecords();

  return (
    <DashboardLayout
      title="Repair Queue"
      subtitle="Manage and track equipment repairs"
      userRole={(userRole as "admin" | "staff" | "student" | "technician") || "technician"}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white shadow-lg shadow-blue-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100">My Queue</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {stats.assigned + stats.inProgress}
                <Target className="h-6 w-6 text-blue-200" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white shadow-lg shadow-amber-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-100">In Progress</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {stats.inProgress}
                <Wrench className="h-6 w-6 text-amber-200" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-green-500 border-0 text-white shadow-lg shadow-emerald-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-100">Today</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {stats.completedToday}
                <CheckCheck className="h-6 w-6 text-emerald-200" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-500 border-0 text-white shadow-lg shadow-purple-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-100">This Week</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {stats.completedThisWeek}
                <TrendingUp className="h-6 w-6 text-purple-200" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-teal-500 border-0 text-white shadow-lg shadow-cyan-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-cyan-100">Avg. Time</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {stats.avgRepairTime}d
                <Timer className="h-6 w-6 text-cyan-200" />
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Refresh */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item, code, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-2 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting} className="rounded-xl h-11 px-4">
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={fetchRecords}
              className="rounded-xl h-11 px-6 gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="my_queue" className="rounded-lg px-4">
              <User className="h-4 w-4 mr-2" />
              My Queue ({stats.assigned + stats.inProgress})
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="rounded-lg px-4">
              <Zap className="h-4 w-4 mr-2" />
              Unassigned
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-lg px-4">
              <Wrench className="h-4 w-4 mr-2" />
              In Progress
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg px-4">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg px-4">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : filteredRecords.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Wrench className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No repairs found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {activeTab === "my_queue"
                      ? "You have no repairs in your queue. Check unassigned repairs to claim some."
                      : activeTab === "unassigned"
                      ? "All repairs have been assigned."
                      : "No repairs match your search criteria."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRecords.map((rec) => (
                  <Card
                    key={rec.id}
                    className="group hover:shadow-xl transition-all duration-300 rounded-2xl border-2 hover:border-blue-200 overflow-hidden"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold truncate group-hover:text-blue-600 transition-colors">
                            {rec.item?.name || "Unknown Item"}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs mt-1">
                            {rec.item?.item_code}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(rec.status)}
                          {getPriorityIndicator(rec)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Reason */}
                      {rec.reason && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {rec.reason}
                          </p>
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {rec.start_date
                              ? format(new Date(rec.start_date), "MMM d, yyyy")
                              : "Not started"}
                          </span>
                        </div>
                        {rec.estimated_completion && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span>{format(new Date(rec.estimated_completion), "MMM d")}</span>
                          </div>
                        )}
                        {rec.cost && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>₹{rec.cost.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>

                      {/* Assigned To */}
                      {rec.technician && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                              {rec.technician.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{rec.technician.full_name}</span>
                        </div>
                      )}

                      {/* Progress bar for in-progress items */}
                      {rec.status === "in_progress" && rec.start_date && rec.estimated_completion && (
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>
                              {Math.min(
                                100,
                                Math.round(
                                  (differenceInDays(new Date(), new Date(rec.start_date)) /
                                    differenceInDays(
                                      new Date(rec.estimated_completion),
                                      new Date(rec.start_date)
                                    )) *
                                    100
                                )
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              100,
                              (differenceInDays(new Date(), new Date(rec.start_date)) /
                                differenceInDays(
                                  new Date(rec.estimated_completion),
                                  new Date(rec.start_date)
                                )) *
                                100
                            )}
                            className="h-2"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t">
                        {!rec.assigned_to && rec.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => claimRepair(rec.id)}
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg"
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Claim
                          </Button>
                        )}
                        {rec.assigned_to === userId && rec.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(rec.id, "in_progress")}
                            disabled={isSubmitting}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 rounded-lg"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {rec.assigned_to === userId && rec.status === "in_progress" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(rec.id, "completed")}
                            disabled={isSubmitting}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg"
                          >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNotesDialog(rec)}
                          className="rounded-lg"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Notes Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Repair Notes
            </DialogTitle>
            <DialogDescription>
              {selectedRecord?.item?.name} ({selectedRecord?.item?.item_code})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="Add repair notes, observations, parts used, etc..."
                className="min-h-[150px] rounded-xl"
              />
            </div>

            {selectedRecord?.reason && (
              <div className="bg-muted/50 rounded-xl p-4">
                <Label className="text-xs text-muted-foreground">Original Issue</Label>
                <p className="text-sm mt-1">{selectedRecord.reason}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={saveNotes}
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Notes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
