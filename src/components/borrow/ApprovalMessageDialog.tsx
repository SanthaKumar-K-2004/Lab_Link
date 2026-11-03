import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle, 
  MapPin, 
  FileText, 
  MessageSquare,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ApprovalMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  itemName: string;
  studentName: string;
  studentId: string;
  onSuccess?: () => void;
}

export function ApprovalMessageDialog({
  isOpen,
  onClose,
  requestId,
  itemName,
  studentName,
  studentId,
  onSuccess,
}: ApprovalMessageDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [collectionDate, setCollectionDate] = useState<Date | undefined>(new Date());
  const [collectionTime, setCollectionTime] = useState("10:00");
  const [pickupLocation, setPickupLocation] = useState("");
  const [conditions, setConditions] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to approve requests.",
      });
      return;
    }

    if (!pickupLocation.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter a pickup location.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const collectionDateTime = collectionDate 
        ? new Date(`${format(collectionDate, "yyyy-MM-dd")}T${collectionTime}:00`)
        : null;

      // Update borrow request status
      const { error: updateError } = await supabase
        .from("borrow_requests")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_date: new Date().toISOString(),
          collection_datetime: collectionDateTime?.toISOString(),
          pickup_location: pickupLocation.trim(),
          conditions: conditions.trim() || null,
          staff_message: additionalInstructions.trim() || null,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Get the borrow request details to find item and quantity
      const { data: requestData, error: fetchError } = await supabase
        .from("borrow_requests")
        .select("item_id, quantity, requested_end_date, student_id")
        .eq("id", requestId)
        .single();

      if (fetchError) {
        console.error("Failed to fetch request details:", fetchError);
      } else if (requestData) {
        // Reduce item quantity
        const { data: itemData, error: itemFetchError } = await supabase
          .from("items")
          .select("current_quantity, status")
          .eq("id", requestData.item_id)
          .single();

        if (!itemFetchError && itemData) {
          const borrowQty = requestData.quantity || 1;
          const newQuantity = Math.max(0, (itemData.current_quantity || 0) - borrowQty);
          
          // Determine new status based on quantity
          let newStatus = itemData.status;
          if (newQuantity <= 0) {
            newStatus = 'borrowed'; // All units borrowed
          }

          const { error: updateItemError } = await supabase
            .from("items")
            .update({ 
              current_quantity: newQuantity,
              status: newStatus
            })
            .eq("id", requestData.item_id);

          if (updateItemError) {
            console.error("Failed to update item quantity:", updateItemError);
          }
        }

        // Record the active checkout in issued_items so dashboard and active borrow tracking works
        const targetStudentId = studentId || requestData.student_id;
        const dueDate = requestData.requested_end_date ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { error: issueError } = await supabase
          .from("issued_items")
          .insert({
            borrow_request_id: requestId,
            item_id: requestData.item_id,
            issued_to: targetStudentId,
            issued_by: user.id,
            due_date: dueDate,
            quantity_issued: requestData.quantity || 1,
            status: "active",
            condition_at_issue: conditions.trim() || "Good",
          });

        if (issueError) {
          console.error("Failed to create issued_items record:", issueError);
        }
      }

      // Create a borrow message for the student
      const messageContent = `Your request to borrow ${itemName} has been approved!\n\n` +
        `📅 Collection: ${collectionDateTime ? format(collectionDateTime, "PPP 'at' p") : "TBD"}\n` +
        `📍 Pickup Location: ${pickupLocation}\n` +
        (conditions ? `📋 Conditions: ${conditions}\n` : "") +
        (additionalInstructions ? `💬 Instructions: ${additionalInstructions}` : "");

      const { error: messageError } = await supabase
        .from("borrow_messages")
        .insert({
          borrow_request_id: requestId,
          sender_id: user.id,
          recipient_id: studentId,
          message_type: "approval",
          subject: `Borrow Request Approved: ${itemName}`,
          message: messageContent,
          collection_datetime: collectionDateTime?.toISOString(),
          pickup_location: pickupLocation.trim(),
          conditions: conditions.trim() || null,
          additional_instructions: additionalInstructions.trim() || null,
        });

      if (messageError) {
        console.error("Failed to create message:", messageError);
        // Don't throw - the approval already succeeded
      }

      toast({
        title: "Request Approved!",
        description: `${studentName}'s request has been approved. They will be notified with your message.`,
      });

      // Reset form
      setPickupLocation("");
      setConditions("");
      setAdditionalInstructions("");
      setCollectionDate(new Date());
      setCollectionTime("10:00");
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message || "Failed to approve request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Approve Borrow Request
          </DialogTitle>
          <DialogDescription>
            Approve <strong>{studentName}</strong>'s request to borrow <strong>{itemName}</strong>. 
            Add collection details and any conditions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Collection Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Collection Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !collectionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {collectionDate ? format(collectionDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={collectionDate}
                  onSelect={setCollectionDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Collection Time */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Collection Time
            </Label>
            <Input
              id="time"
              type="time"
              value={collectionTime}
              onChange={(e) => setCollectionTime(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Pickup Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Pickup Location *
            </Label>
            <Input
              id="location"
              placeholder="e.g., Lab A, Room 101, Ground Floor"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
            />
          </div>

          {/* Conditions / Rules */}
          <div className="space-y-2">
            <Label htmlFor="conditions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Conditions / Rules (Optional)
            </Label>
            <Textarea
              id="conditions"
              placeholder="e.g., Handle with care, Return by 5 PM, Required safety gear..."
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Additional Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Additional Instructions (Optional)
            </Label>
            <Textarea
              id="instructions"
              placeholder="Any other information for the student..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting || !pickupLocation.trim()}
            className="w-full sm:w-auto bg-success hover:bg-success/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
