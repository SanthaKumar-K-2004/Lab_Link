import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  generateDamageMaintenancePDF,
  generateDamageMaintenanceExcel,
  MaintenanceReportRow,
} from "@/lib/reportExports";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wrench,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { PredictiveMaintenanceRules } from "@/components/maintenance/PredictiveMaintenanceRules";

interface Item {
  id: string;
  name: string;
  item_code: string;
}

interface Technician {
  id: string;
  full_name: string;
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

const defaultFormData = {
  item_id: "",
  reason: "",
  status: "pending",
  start_date: "",
  estimated_completion: "",
  cost: 0,
  repair_notes: "",
  assigned_to: "",
};

export default function Maintenance() {
  const { toast } = useToast();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("in_progress");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(
    null,
  );
  const [formData, setFormData] = useState(defaultFormData);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchItems();
    fetchTechnicians();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select(
          `
          *,
          item:items(name, item_code),
          technician:profiles!maintenance_records_assigned_to_fkey(full_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords((data as MaintenanceRecord[]) || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch maintenance records",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, item_code")
        .order("name");

      if (error) throw error;
      setItems((data as Item[]) || []);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // First, fetch user IDs that have the roles we're looking for
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "staff", "technician"]);

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setTechnicians([]);
        return;
      }

      const userIds = roleData.map((r) => r.user_id);

      // Now fetch profiles for those user IDs
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
        .order("full_name");

      if (error) throw error;
      setTechnicians((data as Technician[]) || []);
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async () => {
    if (!formData.item_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an item",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const recordData: any = {
        item_id: formData.item_id,
        reason: formData.reason || null,
        status: formData.status,
        start_date: formData.start_date || null,
        estimated_completion: formData.estimated_completion || null,
        cost: formData.cost || null,
        repair_notes: formData.repair_notes || null,
        assigned_to: formData.assigned_to || null,
      };

      // If status is "completed" and actual_completion is not set, set it now
      if (formData.status === "completed") {
        recordData.actual_completion = new Date().toISOString();
        // Synchronize item status back to available if it was under maintenance
        await supabase
          .from("items")
          .update({ status: "available" })
          .eq("id", formData.item_id)
          .eq("status", "under_maintenance");
      } else if (formData.status === "in_progress") {
        // Mark item as under maintenance
        await supabase
          .from("items")
          .update({ status: "under_maintenance" })
          .eq("id", formData.item_id);
      }

      if (editingRecord) {
        const { error } = await supabase
          .from("maintenance_records")
          .update(recordData)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Maintenance record updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("maintenance_records")
          .insert(recordData);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Maintenance record created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Operation failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      item_id: record.item_id,
      reason: record.reason || "",
      status: record.status,
      start_date: record.start_date?.split("T")[0] || "",
      estimated_completion: record.estimated_completion?.split("T")[0] || "",
      cost: record.cost || 0,
      repair_notes: record.repair_notes || "",
      assigned_to: record.assigned_to || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this maintenance record?"))
      return;

    try {
      const { error } = await supabase
        .from("maintenance_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Maintenance record deleted successfully",
      });
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete record",
      });
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.actual_completion = new Date().toISOString();
      }

      const { error } = await supabase
        .from("maintenance_records")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Status updated to ${newStatus}`,
      });
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update status",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-info text-info-foreground">
            <Wrench className="h-3 w-3 mr-1" /> In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case "on_hold":
        return (
          <Badge variant="outline">
            <AlertTriangle className="h-3 w-3 mr-1" /> On Hold
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeTab === "all" || rec.status === activeTab;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = records.filter((r) => r.status === "pending").length;
  const inProgressCount = records.filter(
    (r) => r.status === "in_progress",
  ).length;
  const completedCount = records.filter((r) => r.status === "completed").length;

  const handleExport = async (exportType: "pdf" | "excel") => {
    if (filteredRecords.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description:
          "There are no maintenance records matching your filters to export.",
      });
      return;
    }

    setIsExporting(true);
    try {
      const exportData: MaintenanceReportRow[] = filteredRecords.map((rec) => ({
        id: rec.id,
        itemName: rec.item?.name || "Unknown",
        itemCode: rec.item?.item_code || "",
        reason: rec.reason || "",
        status: rec.status,
        assignedTo: rec.technician?.full_name || "Unassigned",
        startDate: rec.start_date || "",
        estimatedCompletion: rec.estimated_completion || "",
        actualCompletion: rec.actual_completion || "",
        cost: rec.cost || 0,
        repairNotes: rec.repair_notes || "",
        partsUsed: "",
      }));

      const filters = {
        status: activeTab !== "all" ? activeTab : undefined,
      };

      if (exportType === "pdf") {
        generateDamageMaintenancePDF(
          [],
          exportData,
          filters,
          "Maintenance Records Report",
        );
      } else {
        generateDamageMaintenanceExcel([], exportData, filters);
      }

      toast({
        title: "Success",
        description: `Maintenance records exported as ${exportType.toUpperCase()} successfully.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export maintenance records. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout
      title="Maintenance"
      subtitle="Track equipment maintenance and repairs"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:pt-4">
              <CardDescription className="text-xs sm:text-sm">
                Total
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl">
                {records.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:pt-4">
              <CardDescription className="text-xs sm:text-sm">
                Pending
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-warning">
                {pendingCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:pt-4">
              <CardDescription className="text-xs sm:text-sm">
                In Progress
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-info">
                {inProgressCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:pt-4">
              <CardDescription className="text-xs sm:text-sm">
                Completed
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-success">
                {completedCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Add */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting || filteredRecords.length === 0}
                  className="h-10"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline ml-2">Export</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              size="sm"
              className="h-10"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Add Record</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger
              value="in_progress"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              In Progress ({inProgressCount})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              Done
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Maintenance Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      No maintenance records found
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Reason
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Assigned
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Timeline
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Cost
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">
                                {rec.item?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {rec.item?.item_code}
                              </p>
                              <p className="text-xs text-muted-foreground md:hidden truncate max-w-[120px]">
                                {rec.reason || "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="max-w-[200px] truncate text-sm">
                              {rec.reason || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {rec.technician ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {rec.technician.full_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1 text-xs sm:text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {rec.start_date
                                ? format(new Date(rec.start_date), "MMM d")
                                : "—"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {rec.cost ? (
                              <div className="flex items-center gap-1 text-sm">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                ₹{rec.cost.toLocaleString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(rec.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {rec.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    updateStatus(rec.id, "in_progress")
                                  }
                                >
                                  <span className="hidden sm:inline">
                                    Start
                                  </span>
                                  <Wrench className="h-4 w-4 sm:hidden" />
                                </Button>
                              )}
                              {rec.status === "in_progress" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    updateStatus(rec.id, "completed")
                                  }
                                >
                                  <span className="hidden sm:inline">Done</span>
                                  <CheckCircle className="h-4 w-4 sm:hidden" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(rec)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(rec.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Predictive Maintenance Section */}
        <PredictiveMaintenanceRules />
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {editingRecord
                ? "Edit Maintenance Record"
                : "Add Maintenance Record"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord
                ? "Update maintenance details"
                : "Create a new maintenance record"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item">Item *</Label>
                <Select
                  value={formData.item_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, item_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.item_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Maintenance</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Describe the issue or maintenance reason..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assigned_to: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Estimated Cost (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_completion">
                  Estimated Completion
                </Label>
                <Input
                  id="estimated_completion"
                  type="date"
                  value={formData.estimated_completion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_completion: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repair_notes">Repair Notes</Label>
              <Textarea
                id="repair_notes"
                value={formData.repair_notes}
                onChange={(e) =>
                  setFormData({ ...formData, repair_notes: e.target.value })
                }
                placeholder="Additional notes about the repair..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingRecord ? "Updating..." : "Creating..."}
                </>
              ) : editingRecord ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
