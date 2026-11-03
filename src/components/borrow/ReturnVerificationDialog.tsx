import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Package, 
  Calendar,
  User,
  Image as ImageIcon,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

interface ReturnRequest {
  id: string;
  borrow_request_id: string;
  student_id: string;
  item_id: string;
  quantity: number;
  return_datetime: string;
  item_condition: string;
  condition_notes: string | null;
  return_image_url: string;
  notes: string | null;
  status: string;
}

interface ReturnVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequest;
  itemName: string;
  studentName: string;
  onSuccess?: () => void;
}

const conditionLabels: Record<string, { label: string; color: string; icon: string }> = {
  good: { label: "Good", color: "bg-success/20 text-success", icon: "✅" },
  minor_wear: { label: "Minor Wear", color: "bg-warning/20 text-warning", icon: "🔶" },
  damaged: { label: "Damaged", color: "bg-destructive/20 text-destructive", icon: "⚠️" },
  missing_parts: { label: "Missing Parts", color: "bg-destructive/20 text-destructive", icon: "❌" },
  lost: { label: "Lost", color: "bg-destructive/20 text-destructive", icon: "🚫" },
};

export function ReturnVerificationDialog({
  isOpen,
  onClose,
  returnRequest,
  itemName,
  studentName,
  onSuccess,
}: ReturnVerificationDialogProps) {
  const { toast } = useToast();
  
  const [rejectionReason, setRejectionReason] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const conditionInfo = conditionLabels[returnRequest.item_condition] || conditionLabels.good;
  const isProblematic = ["damaged", "missing_parts", "lost"].includes(returnRequest.item_condition);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("return_requests")
        .update({
          status: "accepted",
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", returnRequest.id);

      if (error) throw error;

      // Increase item quantity (restore returned items to inventory)
      const { data: itemData, error: itemFetchError } = await supabase
        .from("items")
        .select("current_quantity, status")
        .eq("id", returnRequest.item_id)
        .single();

      if (!itemFetchError && itemData) {
        const returnQty = returnRequest.quantity || 1;
        const newQuantity = (itemData.current_quantity || 0) + returnQty;
        
        // If item was fully borrowed (status = 'borrowed'), restore to 'available'
        const newStatus = itemData.status === 'borrowed' ? 'available' : itemData.status;

        const { error: updateItemError } = await supabase
          .from("items")
          .update({ 
            current_quantity: newQuantity,
            status: newStatus
          })
          .eq("id", returnRequest.item_id);

        if (updateItemError) {
          console.error("Failed to update item quantity:", updateItemError);
        }
      }

      // Update borrow request to "returned" status
      const { error: borrowUpdateError } = await supabase
        .from("borrow_requests")
        .update({ 
          status: "returned",
          actual_return_date: new Date().toISOString()
        })
        .eq("id", returnRequest.borrow_request_id);

      if (borrowUpdateError) {
        console.error("Failed to update borrow request status:", borrowUpdateError);
      }

      // Update issued_items to "returned" status so dashboard active borrows decrements correctly
      const { error: issuedUpdateError } = await supabase
        .from("issued_items")
        .update({
          status: "returned",
          returned_date: new Date().toISOString(),
        })
        .eq("borrow_request_id", returnRequest.borrow_request_id)
        .eq("status", "active");

      if (issuedUpdateError) {
        console.error("Failed to update issued_items status:", issuedUpdateError);
      }

      toast({
        title: "Return Accepted",
        description: `${studentName}'s return of ${itemName} has been verified and accepted.`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error accepting return:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to accept return.",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
      });
      return;
    }

    setIsRejecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("return_requests")
        .update({
          status: "rejected",
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", returnRequest.id);

      if (error) throw error;

      // Update borrow request back to approved (still active)
      await supabase
        .from("borrow_requests")
        .update({ status: "approved" })
        .eq("id", returnRequest.borrow_request_id);

      toast({
        title: "Return Rejected",
        description: `${studentName}'s return has been rejected. They will be notified.`,
      });

      setRejectionReason("");
      setShowRejectionForm(false);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error rejecting return:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject return.",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Verify Return
          </DialogTitle>
          <DialogDescription>
            Review and verify <strong>{studentName}</strong>'s return of <strong>{itemName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Return Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{returnRequest.quantity}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {format(new Date(returnRequest.return_datetime), "PPp")}
              </span>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Reported Condition</Label>
            <div className="flex items-center gap-2">
              <Badge className={conditionInfo.color}>
                {conditionInfo.icon} {conditionInfo.label}
              </Badge>
              {isProblematic && (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
            </div>
          </div>

          {/* Condition Notes */}
          {returnRequest.condition_notes && (
            <div className="space-y-2">
              <Label>Condition Notes</Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {returnRequest.condition_notes}
              </div>
            </div>
          )}

          {/* Return Image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Return Photo
            </Label>
            <div className="border rounded-lg overflow-hidden">
              <img
                src={returnRequest.return_image_url}
                alt="Return photo"
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(returnRequest.return_image_url, "_blank")}
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to view full size</p>
          </div>

          {/* Additional Notes */}
          {returnRequest.notes && (
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {returnRequest.notes}
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectionForm && (
            <div className="space-y-2 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <Label htmlFor="rejection-reason" className="text-destructive">
                Reason for Rejection *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why the return is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showRejectionForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectionForm(true)}
                disabled={isAccepting}
                className="w-full sm:w-auto"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full sm:w-auto bg-success hover:bg-success/90"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Return
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionForm(false);
                  setRejectionReason("");
                }}
                disabled={isRejecting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="w-full sm:w-auto"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
