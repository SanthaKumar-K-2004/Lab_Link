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
import { useAuth } from "@/hooks/useAuth";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BorrowStatusBadge } from "@/components/borrow/BorrowStatusBadge";
import { ReturnRequestDialog } from "@/components/borrow/ReturnRequestDialog";
import {
  ClipboardList,
  Plus,
  Calendar,
  Package,
  Loader2,
  Search,
  RotateCcw,
  MessageSquare,
  MapPin,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow, addDays } from "date-fns";
import {
  generateStudentHistoryPDF,
  generateStudentHistoryExcel,
  BorrowReportRow,
} from "@/lib/reportExports";

interface BorrowRequest {
  id: string;
  item_id: string;
  student_id: string;
  requested_start_date: string;
  requested_end_date: string;
  purpose: string | null;
  status: string;
  quantity: number;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  pickup_location: string | null;
  collection_datetime: string | null;
  conditions: string | null;
  staff_message: string | null;
  created_at: string;
  item?: { name: string; item_code: string; image_url: string | null };
}

interface Item {
  id: string;
  name: string;
  item_code: string;
  current_quantity: number;
  is_borrowable: boolean;
}

const defaultFormData = {
  item_id: "",
  requested_start_date: "",
  requested_end_date: "",
  quantity: 1,
  purpose: "",
};

/** Students can borrow at most half the current stock (0 if none available) */
export const getMaxBorrowable = (currentQty: number) =>
  currentQty > 0 ? Math.max(1, Math.floor(currentQty / 2)) : 0;

export default function MyRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyRequests();
      fetchItems();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("borrow_requests")
        .select(
          `
          *,
          item:items(name, item_code, image_url)
        `,
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data || []) as unknown as BorrowRequest[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch your requests",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, item_code, current_quantity, is_borrowable")
        .eq("is_borrowable", true)
        .gt("current_quantity", 0)
        .order("name");

      if (error) throw error;
      setItems((data || []) as unknown as Item[]);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  const resetForm = () => {
    const today = new Date();
    setFormData({
      ...defaultFormData,
      requested_start_date: format(today, "yyyy-MM-dd"),
      requested_end_date: format(addDays(today, 7), "yyyy-MM-dd"),
    });
  };

  const handleSubmit = async () => {
    if (!formData.item_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an item",
      });
      return;
    }
    if (!formData.requested_start_date || !formData.requested_end_date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select dates",
      });
      return;
    }

    // Validate quantity against half-stock limit
    const selItem = items.find((i) => i.id === formData.item_id);
    if (selItem) {
      if ((selItem.current_quantity || 0) <= 0) {
        toast({
          variant: "destructive",
          title: "Out of Stock",
          description: "This item is currently out of stock and cannot be requested.",
        });
        return;
      }
      const maxAllowed = getMaxBorrowable(selItem.current_quantity);
      if (formData.quantity > maxAllowed || maxAllowed < 1) {
        toast({
          variant: "destructive",
          title: "Quantity Exceeds Limit",
          description: `You can borrow a maximum of ${maxAllowed} (half of ${selItem.current_quantity} in stock).`,
        });
        return;
      }
      if (formData.quantity < 1) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Quantity must be at least 1",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("borrow_requests").insert({
        student_id: user?.id,
        item_id: formData.item_id,
        requested_start_date: formData.requested_start_date,
        requested_end_date: formData.requested_end_date,
        quantity: formData.quantity,
        purpose: formData.purpose || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Borrow request submitted successfully",
      });
      setDialogOpen(false);
      fetchMyRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit request",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReturnDialog = (req: BorrowRequest) => {
    setSelectedRequest(req);
    setReturnDialogOpen(true);
  };

  const openDetailDialog = (req: BorrowRequest) => {
    setSelectedRequest(req);
    setDetailDialogOpen(true);
  };

  const handleExport = async (exportType: "pdf" | "excel") => {
    if (requests.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "You don't have any borrow requests to export.",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Convert requests to BorrowReportRow format
      const exportData: BorrowReportRow[] = requests.map((req) => ({
        id: req.id,
        itemName: req.item?.name || "Unknown",
        itemCode: req.item?.item_code || "",
        category: "", // Not needed for student export
        department: "", // Not needed for student export
        borrowerName: user?.user_metadata?.full_name || user?.email || "",
        borrowerEmail: user?.email || "",
        quantity: req.quantity || 1,
        purpose: req.purpose || "",
        requestDate: req.created_at,
        startDate: req.requested_start_date,
        endDate: req.requested_end_date,
        status: req.status,
        approvedBy: "", // Excluded from student export
        approvalDate: "", // Excluded from student export
        pickupLocation: req.pickup_location || "",
        returnDate: "", // Would need return records
        receivedBy: "", // Excluded from student export
        itemCondition: "",
        conditionNotes: "",
      }));

      const studentName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "Student";

      if (exportType === "pdf") {
        generateStudentHistoryPDF(exportData, studentName);
      } else {
        generateStudentHistoryExcel(exportData, studentName);
      }

      toast({
        title: "Success",
        description: `Your borrow history has been exported as ${exportType.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export your borrow history. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredRequests = requests.filter(
    (req) =>
      req.item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeCount = requests.filter((r) =>
    ["pending", "approved", "return_pending"].includes(r.status),
  ).length;
  const completedCount = requests.filter((r) => r.status === "returned").length;

  const selectedItem = items.find((i) => i.id === formData.item_id);

  return (
    <DashboardLayout
      title="My Requests"
      subtitle="View and manage your borrow requests"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Requests</CardDescription>
              <CardTitle className="text-2xl">{requests.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-2xl text-info">
                {activeCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl text-success">
                {completedCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {requests.filter((r) => r.status === "rejected").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your requests..."
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
                  disabled={isExporting || requests.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export History
                  <ChevronDown className="h-4 w-4 ml-2" />
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
            >
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Your Borrow Requests
            </CardTitle>
            <CardDescription>
              {filteredRequests.length} request
              {filteredRequests.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No requests yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "New Request" to borrow equipment
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {req.item?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {req.item?.item_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{req.quantity || 1}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(req.requested_start_date), "MMM d")}{" "}
                          - {format(new Date(req.requested_end_date), "MMM d")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BorrowStatusBadge status={req.status} />
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(req.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* View Details Button */}
                          {(req.pickup_location ||
                            req.staff_message ||
                            req.conditions) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetailDialog(req)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Submit Return Button */}
                          {req.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-primary border-primary hover:bg-primary/10"
                              onClick={() => openReturnDialog(req)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Return
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New Borrow Request
            </DialogTitle>
            <DialogDescription>
              Request to borrow equipment from the lab
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item to Borrow *</Label>
              <Select
                value={formData.item_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, item_id: value, quantity: 1 })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{item.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({item.current_quantity} available)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Out of Stock Warning */}
            {selectedItem && (selectedItem.current_quantity || 0) <= 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-destructive text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This item is currently out of stock and cannot be requested.</span>
              </div>
            )}

            {/* Quantity */}
            {selectedItem && (selectedItem.current_quantity || 0) > 0 && (
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity (max{" "}
                  {getMaxBorrowable(selectedItem.current_quantity)} of{" "}
                  {selectedItem.current_quantity} in stock)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={getMaxBorrowable(selectedItem.current_quantity)}
                    value={formData.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const maxQ = getMaxBorrowable(
                        selectedItem.current_quantity,
                      );
                      if (!isNaN(val) && val >= 1 && val <= maxQ) {
                        setFormData({ ...formData, quantity: val });
                      }
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    of {getMaxBorrowable(selectedItem.current_quantity)}{" "}
                    borrowable
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You may borrow up to half of the current stock
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.requested_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requested_start_date: e.target.value,
                    })
                  }
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.requested_end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requested_end_date: e.target.value,
                    })
                  }
                  min={
                    formData.requested_start_date ||
                    format(new Date(), "yyyy-MM-dd")
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="e.g., For physics lab experiment on electromagnetism..."
                className="min-h-[80px]"
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
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !selectedItem ||
                (selectedItem.current_quantity || 0) <= 0 ||
                getMaxBorrowable(selectedItem.current_quantity) <= 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Request Details
            </DialogTitle>
            <DialogDescription>{selectedRequest?.item?.name}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <BorrowStatusBadge status={selectedRequest.status} />
              </div>

              {selectedRequest.collection_datetime && (
                <div className="flex items-start gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Collection Date & Time
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(selectedRequest.collection_datetime),
                        "PPP 'at' p",
                      )}
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest.pickup_location && (
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pickup Location</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.pickup_location}
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest.conditions && (
                <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium mb-1">Conditions & Rules</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRequest.conditions}
                  </p>
                </div>
              )}

              {selectedRequest.staff_message && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-1">Staff Message</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRequest.staff_message}
                  </p>
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Request Dialog */}
      {selectedRequest && (
        <ReturnRequestDialog
          isOpen={returnDialogOpen}
          onClose={() => {
            setReturnDialogOpen(false);
            setSelectedRequest(null);
          }}
          borrowRequestId={selectedRequest.id}
          itemId={selectedRequest.item_id}
          itemName={selectedRequest.item?.name || "Unknown Item"}
          borrowedQuantity={selectedRequest.quantity || 1}
          onSuccess={fetchMyRequests}
        />
      )}
    </DashboardLayout>
  );
}
