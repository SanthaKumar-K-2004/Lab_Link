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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, HandHeart, Package } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface BorrowRequestDialogProps {
  itemId: string;
  itemName: string;
  availableQuantity?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BorrowRequestDialog({
  itemId,
  itemName,
  availableQuantity = 1,
  isOpen,
  onClose,
  onSuccess,
}: BorrowRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(
    addDays(new Date(), 7),
  );
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Students can borrow at most half the current stock (0 if none available) */
  const maxBorrowable = availableQuantity > 0 ? Math.max(1, Math.floor(availableQuantity / 2)) : 0;

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= maxBorrowable) {
      setQuantity(num);
    } else if (value === "") {
      setQuantity(1);
    }
  };

  const handleSubmit = async () => {
    if (availableQuantity <= 0 || maxBorrowable <= 0) {
      toast({
        variant: "destructive",
        title: "Out of Stock",
        description: "This item is currently out of stock and cannot be borrowed.",
      });
      return;
    }

    if (!user || !startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select start and end dates.",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        variant: "destructive",
        title: "Invalid Dates",
        description: "End date must be after start date.",
      });
      return;
    }

    if (quantity < 1 || quantity > maxBorrowable) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: `You can borrow between 1 and ${maxBorrowable} (half of ${availableQuantity} in stock).`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("borrow_requests").insert({
        item_id: itemId,
        student_id: user.id,
        requested_start_date: format(startDate, "yyyy-MM-dd"),
        requested_end_date: format(endDate, "yyyy-MM-dd"),
        quantity: quantity,
        purpose: purpose.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: `Your request to borrow ${quantity}x ${itemName} has been submitted. You'll be notified once it's reviewed.`,
      });

      // Reset form
      setPurpose("");
      setQuantity(1);
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 7));

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error submitting borrow request:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description:
          error.message || "Failed to submit borrow request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" />
            Request to Borrow
          </DialogTitle>
          <DialogDescription>
            Submit a request to borrow <strong>{itemName}</strong>. Your request
            will be reviewed by staff.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Quantity (max {maxBorrowable} of {availableQuantity} in stock)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxBorrowable}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                of {maxBorrowable} borrowable
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              You may borrow up to half of the current stock
            </p>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < (startDate || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <Textarea
              id="purpose"
              placeholder="Describe why you need this item..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="min-h-[80px] resize-none"
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
            onClick={handleSubmit}
            disabled={isSubmitting || !startDate || !endDate || quantity < 1 || maxBorrowable < 1}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              `Request ${quantity}x ${itemName}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
