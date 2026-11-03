import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  getPendingOperations,
  removeOperation,
  incrementRetry,
  getPendingCount,
  OfflineOperation,
} from "@/lib/offlineQueue";

const MAX_RETRIES = 3;

/**
 * Background sync hook: listens for online/offline events,
 * replays queued operations from IndexedDB when connectivity is restored.
 */
export function useOfflineSync() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Replay a single operation
  const replayOperation = async (op: OfflineOperation): Promise<boolean> => {
    try {
      switch (op.type) {
        case "borrow": {
          if (op.payload.student_id) {
            const { error } = await supabase.from("borrow_requests").insert({
              item_id: op.payload.item_id,
              student_id: op.payload.student_id,
              requested_start_date: op.payload.requested_start_date,
              requested_end_date: op.payload.requested_end_date,
              quantity: op.payload.quantity || 1,
              purpose: op.payload.purpose || null,
              status: "pending",
            } as any);
            if (error) throw error;
            return true;
          } else {
            const { error } = await supabase.from("issued_items").insert({
              item_id: op.payload.item_id,
              issued_to: op.payload.issued_to,
              issued_by: op.payload.issued_by,
              due_date: op.payload.due_date,
              status: "active",
            } as any);
            if (error) throw error;
            return true;
          }
        }
        case "return": {
          const { error } = await supabase
            .from("issued_items")
            .update({
              returned_date:
                op.payload.returned_date || new Date().toISOString(),
              status: "returned",
            })
            .eq("id", op.payload.issued_item_id);
          if (error) throw error;
          return true;
        }
        case "scan": {
          // Scan logs are informational; just insert into audit_logs
          const { error } = await supabase.from("audit_logs").insert({
            action: "kiosk_scan",
            entity_type: "item",
            entity_id: op.payload.item_id,
            user_id: op.payload.user_id,
            new_values: { offline: true, queued_at: op.createdAt },
          } as any);
          if (error) throw error;
          return true;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  };

  // Main sync function
  const syncPendingOperations = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const operations = await getPendingOperations();
      if (operations.length === 0) {
        setIsSyncing(false);
        syncInProgress.current = false;
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const op of operations) {
        if (op.retryCount >= MAX_RETRIES) {
          // Give up after max retries — leave in queue for manual review
          failCount++;
          continue;
        }

        const ok = await replayOperation(op);
        if (ok) {
          await removeOperation(op.id!);
          successCount++;
        } else {
          await incrementRetry(op.id!);
          failCount++;
        }
      }

      await refreshCount();

      if (successCount > 0) {
        toast({
          title: "Offline Sync Complete",
          description: `${successCount} operation${successCount > 1 ? "s" : ""} synced.${failCount > 0 ? ` ${failCount} failed.` : ""}`,
        });
      }
    } catch (err) {
      console.error("Offline sync error:", err);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [refreshCount, toast]);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOperations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync if we come online with pending ops
    if (navigator.onLine) {
      syncPendingOperations();
    }

    // Poll pending count
    refreshCount();
    const interval = setInterval(refreshCount, 10_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [syncPendingOperations, refreshCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow: syncPendingOperations,
    refreshCount,
  };
}
